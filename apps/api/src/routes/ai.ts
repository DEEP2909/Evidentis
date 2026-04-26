/**
 * EvidentIS API — ai Routes
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
  executePromptPipeline,
  getInteractionHistory,
  getInteractionById,
  generateUserReport,
  generateMatterReport,
} from '../context-agent.js';
import { createDualRateLimiter } from '../rate-limit.js';
import {
  getAiServiceHeaders,
  supportedLanguageSchema,
} from './_helpers.js';
import { redis } from '../redis.js';
import {
  generateAccessToken,
  generateFingerprint,
  generateRefreshToken,
} from '../auth.js';
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  validatePasswordPolicy,
  verifyPassword,
} from '../security.js';
import { corsOrigins, rateLimits } from '../config.js';


export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  // AI ROUTES
  // ============================================================

  // GET /api/ai/models - List available AI models
  fastify.get(
    '/api/ai/models',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (_request, reply) => {
      try {
        const response = await fetch(`${config.AI_SERVICE_URL}/models`, {
          headers: getAiServiceHeaders(),
        });
        if (!response.ok) throw new Error('AI service unavailable');
        const models = await response.json();
        return { success: true, data: models };
      } catch (_error) {
        return reply
          .status(503)
          .send({
            success: false,
            error: { message: 'AI service unavailable' },
          });
      }
    },
  );

  // GET /api/ai/costs - Get AI usage costs
  fastify.get(
    '/api/ai/costs',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const startDate =
        queryParams.startDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = queryParams.endDate || new Date().toISOString();

      const costs = await query<{
        model: string;
        total_tokens: number;
        total_requests: number;
        estimated_cost_paise: number;
      }>(
        `SELECT model_name as model,
              SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as total_tokens,
              COUNT(*) as total_requests,
              SUM(estimated_cost_paise) as estimated_cost_paise
       FROM ai_model_events
        WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY model_name`,
        [authReq.tenantId, startDate, endDate],
      );

      return { success: true, data: costs.rows };
    },
  );

  // ============================================================

  // REVIEW ROUTES
  // ============================================================

  // POST /api/review/feedback - Submit feedback on clause/suggestion
  fastify.post(
    '/api/review/feedback',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          clauseId: z.string().uuid().optional(),
          suggestionId: z.string().uuid().optional(),
          action: z.enum(['approve', 'reject', 'modify']),
          notes: z.string().optional(),
          modifiedText: z.string().optional(),
        })
        .parse(request.body);

      if (!body.clauseId && !body.suggestionId) {
        return reply
          .status(400)
          .send({
            success: false,
            error: { message: 'Either clauseId or suggestionId required' },
          });
      }

      if (body.suggestionId) {
        // Update clause suggestion
        const statusMap = {
          approve: 'accepted',
          reject: 'rejected',
          modify: 'modified',
        } as const;
        await query(
          `UPDATE clause_suggestions 
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, final_text = $4
         WHERE id = $5 AND tenant_id = $6`,
          [
            statusMap[body.action],
            authReq.advocateId,
            body.notes || null,
            body.modifiedText || null,
            body.suggestionId,
            authReq.tenantId,
          ],
        );
      }

      if (body.clauseId) {
        // Update clause reviewer status
        const statusMap = {
          approve: 'approved',
          reject: 'rejected',
          modify: 'modified',
        } as const;
        await query(
          'UPDATE clauses SET reviewer_status = $1 WHERE id = $2 AND tenant_id = $3',
          [statusMap[body.action], body.clauseId, authReq.tenantId],
        );
      }

      // Log review action
      await query(
        `INSERT INTO review_actions (tenant_id, reviewer_id, object_type, object_id, action_type, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          authReq.tenantId,
          authReq.advocateId,
          body.suggestionId ? 'suggestion' : 'clause',
          body.suggestionId || body.clauseId,
          body.action,
          body.notes || null,
        ],
      );

      return { success: true };
    },
  );

  // ============================================================================

  // CONTEXT AGENT ROUTES — Prompt Intelligence
  // ============================================================================

  /**
   * POST /api/ai/prompt — Submit a prompt through the Context Agent pipeline.
   * Enhances the prompt with historical context, calls AI, analyzes the
   * response, and stores the full interaction for future reference.
   */
  fastify.post(
    '/api/ai/prompt',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          prompt: z.string().min(1).max(10000),
          matterId: z.string().uuid().optional(),
          tags: z.array(z.string().max(50)).max(10).optional(),
        })
        .parse(request.body);

      try {
        const result = await executePromptPipeline({
          tenantId: authReq.tenantId,
          advocateId: authReq.advocateId,
          prompt: body.prompt,
          matterId: body.matterId,
          tags: body.tags,
        });

        return {
          success: true,
          data: {
            interactionId: result.interaction.id,
            answer: result.aiResponse,
            category: result.category,
            qualityScore: result.interaction.responseQualityScore,
            hasCitations: result.interaction.responseHasCitations,
            contextUsed: {
              pastInteractions: result.interaction.contextInteractionIds.length,
              documents: result.interaction.contextDocumentIds.length,
            },
          },
        };
      } catch (error) {
        logger.error({ err: error }, 'Context Agent pipeline failed');
        return reply.status(502).send({
          success: false,
          error: {
            code: 'AI_SERVICE_ERROR',
            message: 'Failed to process prompt through AI service',
          },
        });
      }
    },
  );

  /**
   * GET /api/ai/interactions — List interaction history.
   * Filterable by matter, category, with pagination.
   */
  fastify.get(
    '/api/ai/interactions',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const query_params = z
        .object({
          matterId: z.string().uuid().optional(),
          category: z
            .enum(['research', 'drafting', 'review', 'analysis', 'general'])
            .optional(),
          limit: z.coerce.number().min(1).max(100).default(20),
          offset: z.coerce.number().min(0).default(0),
        })
        .parse(request.query);

      const { interactions, total } = await getInteractionHistory(
        authReq.tenantId,
        authReq.advocateId,
        query_params,
      );

      return {
        success: true,
        data: {
          interactions: interactions.map((i) => ({
            id: i.id,
            matterId: i.matterId,
            originalPrompt:
              i.originalPrompt.slice(0, 200) +
              (i.originalPrompt.length > 200 ? '...' : ''),
            category: i.promptCategory,
            qualityScore: i.responseQualityScore,
            hasCitations: i.responseHasCitations,
            modelUsed: i.modelUsed,
            latencyMs: i.latencyMs,
            tags: i.tags,
            createdAt: i.createdAt,
          })),
          total,
          limit: query_params.limit,
          offset: query_params.offset,
        },
      };
    },
  );

  /**
   * GET /api/ai/interactions/:id — Get a specific interaction with full detail.
   */
  fastify.get(
    '/api/ai/interactions/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      const interaction = await getInteractionById(authReq.tenantId, id);

      if (!interaction || interaction.advocateId !== authReq.advocateId) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Interaction not found',
          },
        });
      }

      return {
        success: true,
        data: interaction,
      };
    },
  );

  /**
   * GET /api/ai/report/user — Get user-level analytics report.
   */
  fastify.get(
    '/api/ai/report/user',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const params = z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .parse(request.query);

      const dateRange =
        params.from && params.to
          ? { from: new Date(params.from), to: new Date(params.to) }
          : undefined;

      const report = await generateUserReport(
        authReq.tenantId,
        authReq.advocateId,
        dateRange,
      );

      return { success: true, data: report };
    },
  );

  /**
   * GET /api/ai/report/matter/:matterId — Get matter-level interaction report.
   */
  fastify.get(
    '/api/ai/report/matter/:matterId',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const { matterId } = z
        .object({ matterId: z.string().uuid() })
        .parse(request.params);

      const report = await generateMatterReport(
        authReq.tenantId,
        matterId,
      );

      return { success: true, data: report };
    },
  );
}
