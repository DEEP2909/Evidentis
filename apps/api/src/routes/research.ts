/**
 * EvidentIS API — research Routes
 * Auto-extracted from monolithic routes.ts
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { query, queryOne, withTransaction } from '../database.js';
import { logger } from '../logger.js';
import {
  type AuthenticatedRequest,
  authenticateRequest,
  requireRoles,
} from './_helpers.js';

import {
  enforceActiveSubscription,
  enforceResearchQuota,
  incrementResearchUsage,
} from '../billing-enforcement.js';
import { createDualRateLimiter } from '../rate-limit.js';
const aiResearchRateLimit = createDualRateLimiter('research', 'ai_burst');
import {
  type ResearchSource,
  getAiServiceHeaders,
  getResearchEmbedding,
  findResearchDocumentChunks,
  findRelevantBareActSections,
  combineResearchSources,
  buildResearchSourcesPayload,
  buildResearchClientSources,
  buildResearchContextPrompt,
  supportedLanguageSchema,
  resolveCorsOrigin,
} from './_helpers.js';


export default async function researchRoutes(fastify: FastifyInstance): Promise<void> {
  // RESEARCH ROUTES
  // ============================================================

  // POST /api/research/query - Standard JSON response for legal research
  fastify.post(
    '/api/research/query',
    {
      preHandler: [
        authenticateRequest,
        aiResearchRateLimit,
        enforceActiveSubscription,
        enforceResearchQuota,
      ],
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { question, matterId, language } = z
        .object({
          question: z.string().min(1).max(2000),
          matterId: z.string().uuid().optional(),
          language: supportedLanguageSchema.optional(),
        })
        .parse(request.body);
      const responseLanguage = language ?? 'en';

      let usageStarted = false;

      try {
        const embedding = await getResearchEmbedding(
          question,
          'research query',
        );
        const documentChunks = await findResearchDocumentChunks(
          authReq.tenantId,
          embedding,
          matterId,
        );
        const bareActSections = await findRelevantBareActSections(embedding);
        const researchSources = combineResearchSources(
          documentChunks,
          bareActSections,
        );
        const contextPrompt = await buildResearchContextPrompt(
          authReq.tenantId,
          documentChunks[0]?.document_id ?? null,
          question,
          bareActSections,
        );

        usageStarted = true;
        const aiResponse = await fetch(`${config.AI_SERVICE_URL}/research`, {
          method: 'POST',
          headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            query: question,
            chunks: buildResearchSourcesPayload(
              researchSources,
              responseLanguage,
            ),
            context: contextPrompt || undefined,
            language: responseLanguage,
            stream: false,
          }),
          signal: AbortSignal.timeout(config.AI_SERVICE_TIMEOUT_MS),
        });

        if (!aiResponse.ok) {
          throw new Error('AI research synthesis failed');
        }
        const result = await aiResponse.json();

        // 4. Save to research history
        await query(
          `INSERT INTO research_history (tenant_id, matter_id, advocate_id, question, answer, citations, sources_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            authReq.tenantId,
            matterId || null,
            authReq.advocateId,
            question,
            result.answer,
            JSON.stringify(result.citations || []),
            researchSources.length,
          ],
        );

        return {
          success: true,
          data: {
            answer: result.answer,
            citations: result.citations || [],
            sources: buildResearchClientSources(researchSources),
            confidence: result.confidence || 0.85,
          },
        };
      } catch (error) {
        logger.error({ error }, 'Research query failed');
        return reply.status(500).send({
          success: false,
          error: { code: 'RESEARCH_FAILED', message: 'Research query failed' },
        });
      } finally {
        if (usageStarted) {
          await incrementResearchUsage(authReq.tenantId).catch((e) => {
            logger.error({ e }, 'Failed to track research usage on /query');
          });
        }
      }
    },
  );

  // POST /api/research/stream - SSE streaming response for legal research
  fastify.post(
    '/api/research/stream',
    {
      preHandler: [
        authenticateRequest,
        aiResearchRateLimit,
        enforceActiveSubscription,
        enforceResearchQuota,
      ],
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const {
        query: question,
        matterId,
        language,
      } = z
        .object({
          query: z.string().min(1).max(2000),
          matterId: z.string().uuid().nullable().optional(),
          language: supportedLanguageSchema.optional(),
        })
        .parse(request.body);
      const responseLanguage = language ?? 'en';
      const requestOrigin =
        typeof request.headers.origin === 'string'
          ? request.headers.origin
          : undefined;
      const allowedOrigin = resolveCorsOrigin(requestOrigin);

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': allowedOrigin, // nosemgrep: javascript.express.security.cors-misconfiguration.cors-misconfiguration
        'Access-Control-Allow-Credentials': 'true',
        Vary: 'Origin',
      });

      const sendEvent = (data: object) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Track whether stream actually started (for billing accuracy)
      let streamStarted = false;

      try {
        const embedding = await getResearchEmbedding(
          question,
          'research stream',
        );
        const documentChunks = await findResearchDocumentChunks(
          authReq.tenantId,
          embedding,
          matterId,
        );
        const bareActSections = await findRelevantBareActSections(embedding);
        const researchSources = combineResearchSources(
          documentChunks,
          bareActSections,
        );
        const contextPrompt = await buildResearchContextPrompt(
          authReq.tenantId,
          documentChunks[0]?.document_id ?? null,
          question,
          bareActSections,
        );

        sendEvent({
          type: 'sources',
          sources: buildResearchClientSources(researchSources),
        });

        // Mark stream as started (AI service call begins now)
        streamStarted = true;

        // 4. Stream synthesis from AI service (SSE)
        const aiResponse = await fetch(`${config.AI_SERVICE_URL}/research`, {
          method: 'POST',
          headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            query: question,
            chunks: buildResearchSourcesPayload(
              researchSources,
              responseLanguage,
            ),
            context: contextPrompt || undefined,
            language: responseLanguage,
            stream: true,
          }),
        });

        if (!aiResponse.ok) {
          throw new Error('AI research stream failed');
        }

        if (!aiResponse.body) {
          throw new Error('No response body from AI service');
        }

        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = '';
        let buffer = '';
        let citationsPayload: unknown[] = [];

        const processEvent = (rawEvent: string) => {
          const dataPayload = rawEvent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).trim())
            .join('');

          if (!dataPayload) {
            return;
          }

          let event: {
            token?: string;
            citations?: unknown[];
            done?: boolean;
            error?: string;
          };

          try {
            event = JSON.parse(dataPayload) as typeof event;
          } catch (eventError) {
            logger.debug(
              { eventError, dataPayload },
              'Ignoring malformed AI stream event',
            );
            return;
          }

          if (event.error) {
            throw new Error(event.error);
          }

          if (typeof event.token === 'string' && event.token.length > 0) {
            fullAnswer += event.token;
            sendEvent({ type: 'token', content: event.token });
          }

          if (Array.isArray(event.citations) && event.citations.length > 0) {
            citationsPayload = event.citations;
            sendEvent({ type: 'citations', citations: event.citations });
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            processEvent(event);
          }
        }

        if (buffer.trim().length > 0) {
          processEvent(buffer);
        }

        // 5. Persist to research_history
        await query(
          `INSERT INTO research_history (tenant_id, matter_id, advocate_id, question, answer, citations, sources_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            authReq.tenantId,
            matterId || null,
            authReq.advocateId,
            question,
            fullAnswer,
            JSON.stringify(citationsPayload),
            researchSources.length,
          ],
        );

        reply.raw.write('data: [DONE]\n\n');
      } catch (err) {
        logger.error({ err }, 'Research stream failed');
        sendEvent({ type: 'error', message: 'Research failed' });
      } finally {
        // Track research usage only if stream actually started (ensures billing accuracy)
        if (streamStarted) {
          await incrementResearchUsage(authReq.tenantId).catch((e) => {
            logger.error({ e }, 'Failed to track research usage');
          });
        }
        reply.raw.end();
      }
    },
  );

  // GET /api/research/history - Get research history
  fastify.get(
    '/api/research/history',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const { matterId, limit = '20' } = request.query as {
        matterId?: string;
        limit?: string;
      };

      const limitNum = Math.min(Number.parseInt(limit) || 20, 100);

      const queryStr = matterId
        ? `SELECT id, question, answer, citations, sources_used, created_at 
         FROM research_history
         WHERE tenant_id = $1 AND matter_id = $2
         ORDER BY created_at DESC LIMIT $3`
        : `SELECT id, question, answer, citations, sources_used, created_at 
         FROM research_history
         WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT $2`;

      const params = matterId
        ? [authReq.tenantId, matterId, limitNum]
        : [authReq.tenantId, limitNum];

      const rows = await query(queryStr, params);
      return { success: true, data: rows.rows };
    },
  );

  // POST /api/research/:id/feedback - Submit feedback on an AI research answer
  fastify.post(
    '/api/research/:id/feedback',
    {
      preHandler: authenticateRequest,
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { rating, correction } = z
        .object({
          rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
          correction: z.string().max(2000).optional(),
        })
        .parse(request.body);

      await query(
        `UPDATE research_history
         SET user_rating = $1, user_correction = $2, feedback_given_at = NOW()
         WHERE id = $3 AND tenant_id = $4`,
        [rating, correction ?? null, id, authReq.tenantId]
      );

      return reply.send({ success: true });
    },
  );

  // GET /api/research/indiankanoon - Proxy/fallback legal case search
  fastify.get(
    '/api/research/indiankanoon',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const { q, limit = '20' } = z
        .object({
          q: z.string().min(2),
          limit: z.string().optional(),
        })
        .parse(request.query);

      const limitNum = Math.min(
        Math.max(Number.parseInt(limit || '20', 10) || 20, 1),
        50,
      );
      const likeQuery = `%${q.trim()}%`;

      const localResults = await query<{
        id: string;
        citation_number: string;
        court: string;
        judgment_date: string | null;
        summary: string;
        full_text_url: string | null;
        language: string;
      }>(
        `SELECT id, citation_number, court, judgment_date, summary, full_text_url, language
       FROM case_citations
       WHERE tenant_id = $1
         AND (citation_number ILIKE $2 OR summary ILIKE $2 OR court ILIKE $2)
       ORDER BY judgment_date DESC NULLS LAST
       LIMIT $3`,
        [authReq.tenantId, likeQuery, limitNum],
      );

      if (config.INDIANKANOON_API_KEY) {
        try {
          const upstreamUrl = new URL('/search/', config.INDIANKANOON_BASE_URL);
          upstreamUrl.searchParams.set('formInput', q.trim());
          upstreamUrl.searchParams.set('pagenum', '0');

          const upstreamResponse = await fetch(upstreamUrl.toString(), {
            headers: {
              Authorization: `Token ${config.INDIANKANOON_API_KEY}`,
              'X-Api-Key': config.INDIANKANOON_API_KEY,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (upstreamResponse.ok) {
            const upstreamData = await upstreamResponse.json();
            return {
              success: true,
              data: {
                source: 'indiankanoon',
                query: q,
                results: upstreamData,
              },
            };
          }

          logger.warn(
            { status: upstreamResponse.status },
            'IndiaKanoon upstream request failed, returning tenant-local fallback results',
          );
        } catch (error) {
          logger.warn(
            { error },
            'IndiaKanoon upstream request threw, returning tenant-local fallback results',
          );
        }
      }

      return {
        success: true,
        data: {
          source: 'local',
          query: q,
          results: localResults.rows,
        },
      };
    },
  );

  // ============================================================
}
