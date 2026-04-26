/**
 * EvidentIS API — analytics Routes
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



export default async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // ANALYTICS ROUTES
  // ============================================================

  // GET /api/analytics/firm
  fastify.get(
    '/api/analytics/firm',
    {
      preHandler: [
        authenticateRequest,
        requireRoles('admin', 'partner', 'senior_advocate'),
      ],
    },
    async (request) => {
      const authReq = request as AuthenticatedRequest;

      // Get key metrics
      const metrics = await queryOne<{
        total_matters: number;
        open_matters: number;
        total_documents: number;
        processed_documents: number;
        total_flags: number;
        open_flags: number;
        critical_flags: number;
        avg_health_score: number;
      }>(
        `SELECT 
           (SELECT COUNT(*) FROM matters WHERE tenant_id = $1) as total_matters,
           (SELECT COUNT(*) FROM matters WHERE tenant_id = $1 AND status = 'open') as open_matters,
           (SELECT COUNT(*) FROM documents WHERE tenant_id = $1) as total_documents,
           (SELECT COUNT(*) FROM documents WHERE tenant_id = $1 AND ingestion_status = 'normalized') as processed_documents,
           (SELECT COUNT(*) FROM flags WHERE tenant_id = $1) as total_flags,
           (SELECT COUNT(*) FROM flags WHERE tenant_id = $1 AND status = 'open') as open_flags,
           (SELECT COUNT(*) FROM flags WHERE tenant_id = $1 AND status = 'open' AND severity = 'critical') as critical_flags,
           (SELECT AVG(health_score) FROM matters WHERE tenant_id = $1 AND status = 'open') as avg_health_score`,
        [authReq.tenantId],
      );

      // Get flag distribution by severity
      const flagDistribution = await query<{ severity: string; count: number }>(
        `SELECT severity, COUNT(*) as count
         FROM flags WHERE tenant_id = $1 AND status = 'open'
         GROUP BY severity`,
        [authReq.tenantId],
      );

      // Get clause type distribution
      const clauseDistribution = await query<{
        clause_type: string;
        count: number;
      }>(
        `SELECT clause_type, COUNT(*) as count
         FROM clauses WHERE tenant_id = $1
         GROUP BY clause_type
         ORDER BY count DESC
         LIMIT 10`,
        [authReq.tenantId],
      );

      return {
        success: true,
        data: {
          metrics,
          flagDistribution: flagDistribution.rows,
          clauseDistribution: clauseDistribution.rows,
        },
      };
    },
  );

  // ============================================================

  // ANALYTICS ADDITIONAL ROUTES
  // ============================================================

  // GET /api/analytics/attorneys - Advocate productivity metrics
  fastify.get(
    '/api/analytics/attorneys',
    {
      preHandler: [
        authenticateRequest,
        requireRoles('admin', 'partner', 'senior_advocate'),
      ],
    },
    async (request) => {
      const authReq = request as AuthenticatedRequest;

      const attorneys = await query<{
        id: string;
        display_name: string;
        role: string;
        matters_count: number;
        documents_reviewed: number;
        flags_resolved: number;
      }>(
        `SELECT a.id, a.display_name, a.role,
                (SELECT COUNT(*) FROM matters WHERE lead_advocate_id = a.id) as matters_count,
                (SELECT COUNT(*) FROM review_actions WHERE reviewer_id = a.id) as documents_reviewed,
                (SELECT COUNT(*) FROM flags WHERE resolved_by = a.id AND status != 'open') as flags_resolved
         FROM attorneys a
         WHERE a.tenant_id = $1 AND a.status = 'active'
         ORDER BY matters_count DESC`,
        [authReq.tenantId],
      );

      return { success: true, data: attorneys.rows };
    },
  );

  // ============================================================
}
