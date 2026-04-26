/**
 * EvidentIS API — legalRules Routes
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

import { getJobStatus } from '../worker.js';
import { getPipelineStatus } from '../orchestrator.js';


export default async function legalRulesRoutes(fastify: FastifyInstance): Promise<void> {
  // LEGAL RULES ROUTES
  // ============================================================

  // GET /legal-rules/:state - Get rules for a state
  fastify.get(
    '/legal-rules/:state',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const { state } = request.params as { state: string };

      try {
        const { getRulesForState, INDIAN_JURISDICTIONS } = await import(
          '../legal-rules.js'
        );

        if (
          !INDIAN_JURISDICTIONS.some(
            (jurisdiction: { code: string }) =>
              jurisdiction.code === state.toUpperCase(),
          )
        ) {
          return reply
            .status(400)
            .send({ success: false, error: { message: 'Invalid state code' } });
        }

        const rules = getRulesForState(state.toUpperCase());
        return { success: true, data: rules };
      } catch (_error) {
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Failed to get legal rules' },
          });
      }
    },
  );

  // GET /legal-rules/:state/:clauseType - Get specific clause rules for state
  fastify.get(
    '/legal-rules/:state/:clauseType',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const { state, clauseType } = request.params as {
        state: string;
        clauseType: string;
      };

      try {
        const { getRulesForState } = await import('../legal-rules.js');
        const rules = getRulesForState(state.toUpperCase());
        const clauseRule = rules.find((r) => r.clauseType === clauseType);

        if (!clauseRule) {
          return reply
            .status(404)
            .send({
              success: false,
              error: { message: 'No specific rule for this clause type' },
            });
        }

        return { success: true, data: clauseRule };
      } catch (_error) {
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Failed to get legal rules' },
          });
      }
    },
  );

  // POST /legal-rules/check - Check clause compliance
  fastify.post(
    '/legal-rules/check',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const body = z
        .object({
          clauseType: z.string(),
          text: z.string(),
          jurisdiction: z.string().optional(),
          jurisdictions: z.array(z.string()).optional(),
          metadata: z.record(z.any()).optional(),
        })
        .parse(request.body);

      try {
        const { checkClauseCompliance } = await import('../legal-rules.js');
        const result = checkClauseCompliance(
          body.clauseType,
          body.text,
          body.jurisdiction || 'DL',
        );
        return { success: true, data: result };
      } catch (_error) {
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Compliance check failed' },
          });
      }
    },
  );

  // ============================================================

  // JOB STATUS ROUTES
  // ============================================================

  // GET /jobs/:id - Get job status
  fastify.get(
    '/jobs/:id',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      try {
        // Try pipeline status first (orchestrator-based)
        const pipelineStatus = await getPipelineStatus(authReq.tenantId, id);
        if (pipelineStatus) {
          return { success: true, data: pipelineStatus };
        }

        // Fall back to individual job status check
        const { getJobStatus } = await import('../worker.js');

        // Try each queue type
        const queues = ['document', 'clause', 'risk', 'obligation'];
        for (const queue of queues) {
          const status = await getJobStatus(queue, id);
          if (status) {
            return { success: true, data: status };
          }
        }

        return reply
          .status(404)
          .send({ success: false, error: { message: 'Job not found' } });
      } catch (_error) {
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Failed to get job status' },
          });
      }
    },
  );

  // ============================================================
}
