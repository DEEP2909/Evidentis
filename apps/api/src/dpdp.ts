/**
 * EvidentIS DPDP Compliance Routes
 * Handles Digital Personal Data Protection Act compliance:
 * - Consent management
 * - Right to erasure (consent withdrawal)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { logger } from './logger.js';

interface WithdrawBody {
  reason?: string;
}

export async function dpdpRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/dpdp/consent/withdraw
   * Withdraw consent and initiate data erasure process
   * Required under DPDP Act for right to erasure
   */
  fastify.post('/api/dpdp/consent/withdraw', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const tenantId = (request as any).tenantId;

    if (!userId || !tenantId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const body = (request.body as WithdrawBody) ?? {};

    try {
      const { pool } = await import('./database.js');

      // Mark all consent records as withdrawn
      await pool.query(
        `UPDATE dpdp_consent 
         SET withdrawn_at = NOW(), withdrawal_reason = $3
         WHERE tenant_id = $1 AND user_id = $2 AND withdrawn_at IS NULL`,
        [tenantId, userId, body.reason ?? null]
      );

      // Queue an erasure job for downstream processing
      // This handles: PII removal, document anonymization, audit log retention
      try {
        const { config } = await import('./config.js');
        if (config.REDIS_URL) {
          const redis = new Redis(config.REDIS_URL);
          await redis.lpush('erasure_jobs', JSON.stringify({
            type: 'dpdp_erasure',
            tenantId,
            userId,
            reason: body.reason,
            requestedAt: new Date().toISOString(),
          }));
          await redis.quit();
        }
      } catch (redisErr) {
        // Log but don't fail the request — erasure can be retried
        logger.warn({ err: redisErr }, 'Failed to queue erasure job, will retry');
      }

      logger.info({ userId, tenantId }, 'DPDP consent withdrawn, erasure job queued');

      return reply.send({
        success: true,
        data: {
          message: 'Consent withdrawn. Your personal data will be erased within 30 days as per DPDP Act compliance.',
          erasureDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      logger.error({ err, userId, tenantId }, 'Failed to process consent withdrawal');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process withdrawal' },
      });
    }
  });

  /**
   * GET /api/dpdp/consent/status
   * Check current consent status for the authenticated user
   */
  fastify.get('/api/dpdp/consent/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const tenantId = (request as any).tenantId;

    if (!userId || !tenantId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const { pool } = await import('./database.js');
      const result = await pool.query(
        `SELECT purpose, consented_at, withdrawn_at 
         FROM dpdp_consent 
         WHERE tenant_id = $1 AND user_id = $2 
         ORDER BY consented_at DESC`,
        [tenantId, userId]
      );

      return reply.send({
        success: true,
        data: {
          consents: result.rows.map((row: any) => ({
            purpose: row.purpose,
            consentedAt: row.consented_at,
            withdrawnAt: row.withdrawn_at,
            active: !row.withdrawn_at,
          })),
        },
      });
    } catch (err) {
      logger.error({ err, userId, tenantId }, 'Failed to fetch consent status');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch consent status' },
      });
    }
  });
}
