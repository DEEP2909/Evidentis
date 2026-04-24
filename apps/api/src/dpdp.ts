/**
 * EvidentIS DPDP Compliance Routes
 * Handles Digital Personal Data Protection Act compliance:
 * - Consent management
 * - Right to erasure (consent withdrawal)
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { config } from './config.js';
import { pool, withTransaction } from './database.js';
import { logger } from './logger.js';
import { type AuthenticatedRequest, authenticateRequest } from './routes.js';
import { erasureQueue } from './worker.js';

const withdrawConsentSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

const internalErasureSchema = z.object({
  tenantId: z.string().uuid(),
  advocateId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  reason: z.string().trim().max(1000).optional(),
});

function parseDetails(details: string | null): Record<string, unknown> | null {
  if (!details) {
    return null;
  }

  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return { raw: details };
  }
}

function isInternalRequestAuthorized(request: FastifyRequest): boolean {
  if (!config.AI_SERVICE_INTERNAL_KEY) {
    return false; // Fail closed
  }

  return request.headers['x-internal-key'] === config.AI_SERVICE_INTERNAL_KEY;
}

export async function dpdpRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/dpdp/consent/withdraw
   * Withdraw consent and initiate data erasure process
   * Required under DPDP Act for right to erasure
   */
  fastify.post(
    '/api/dpdp/consent/withdraw',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = withdrawConsentSchema.parse(request.body ?? {});

      try {
        const detailPayload = JSON.stringify({
          reason: body.reason ?? null,
          requestedFromIp: request.ip,
          userAgent: request.headers['user-agent'] || null,
        });

        const result = await pool.query<{ id: string; created_at: string }>(
          `INSERT INTO dpdp_requests (tenant_id, advocate_id, request_type, status, details)
         VALUES ($1, $2, 'consent_withdrawal', 'open', $3)
         RETURNING id, created_at`,
          [authReq.tenantId, authReq.advocateId, detailPayload],
        );

        const [erasureRequest] = result.rows;

        try {
          await erasureQueue.add('dpdp.erasure', {
            requestId: erasureRequest.id,
            tenantId: authReq.tenantId,
            advocateId: authReq.advocateId,
            reason: body.reason ?? null,
            requestedAt: erasureRequest.created_at,
          });
        } catch (queueErr) {
          logger.warn(
            {
              err: queueErr,
              tenantId: authReq.tenantId,
              advocateId: authReq.advocateId,
            },
            'Failed to queue erasure job',
          );
        }

        logger.info(
          {
            tenantId: authReq.tenantId,
            advocateId: authReq.advocateId,
            requestId: erasureRequest.id,
          },
          'DPDP consent withdrawn and erasure queued',
        );

        return reply.send({
          success: true,
          data: {
            requestId: erasureRequest.id,
            message:
              'Consent withdrawn. Your personal data erasure request has been queued for DPDP processing.',
            erasureDeadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        });
      } catch (err) {
        logger.error(
          { err, tenantId: authReq.tenantId, advocateId: authReq.advocateId },
          'Failed to process consent withdrawal',
        );
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process withdrawal',
          },
        });
      }
    },
  );

  /**
   * GET /api/dpdp/consent/status
   * Check current consent/erasure status for the authenticated user
   */
  fastify.get(
    '/api/dpdp/consent/status',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;

      try {
        const result = await pool.query<{
          id: string;
          request_type: string;
          status: string;
          details: string | null;
          resolved_at: string | null;
          created_at: string;
        }>(
          `SELECT id, request_type, status, details, resolved_at, created_at
         FROM dpdp_requests
         WHERE tenant_id = $1
           AND advocate_id = $2
         ORDER BY created_at DESC`,
          [authReq.tenantId, authReq.advocateId],
        );

        const requests = result.rows.map((row) => ({
          id: row.id,
          requestType: row.request_type,
          status: row.status,
          details: parseDetails(row.details),
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
        }));

        const latestConsent = requests.find(
          (entry) => entry.requestType === 'consent',
        );
        const latestWithdrawal = requests.find(
          (entry) =>
            entry.requestType === 'consent_withdrawal' ||
            entry.requestType === 'erasure',
        );

        const active = latestConsent
          ? !latestWithdrawal ||
            new Date(latestConsent.createdAt).getTime() >
              new Date(latestWithdrawal.createdAt).getTime()
          : false;

        return reply.send({
          success: true,
          data: {
            active,
            consentedAt:
              latestConsent?.resolvedAt ?? latestConsent?.createdAt ?? null,
            withdrawnAt:
              latestWithdrawal?.resolvedAt ??
              latestWithdrawal?.createdAt ??
              null,
            requests,
          },
        });
      } catch (err) {
        logger.error(
          { err, tenantId: authReq.tenantId, advocateId: authReq.advocateId },
          'Failed to fetch consent status',
        );
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch consent status',
          },
        });
      }
    },
  );

  /**
   * POST /internal/dpdp/erasure
   * Internal worker endpoint for DPDP erasure execution.
   */
  fastify.post(
    '/internal/dpdp/erasure',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isInternalRequestAuthorized(request)) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid internal service key',
          },
        });
      }

      const body = internalErasureSchema.parse(request.body ?? {});

      try {
        const result = await withTransaction(async (tx) => {
          if (body.requestId) {
            await tx.query(
              `UPDATE dpdp_requests
             SET status = 'processing'
             WHERE id = $1
               AND tenant_id = $2`,
              [body.requestId, body.tenantId],
            );
          }

          const advocateResult = await tx.query<{
            email: string;
            status: string;
          }>(
            `SELECT email, status
           FROM attorneys
           WHERE id = $1
             AND tenant_id = $2
           LIMIT 1`,
            [body.advocateId, body.tenantId],
          );

          const advocate = advocateResult.rows[0];
          if (!advocate) {
            return null;
          }

          const placeholderEmail = `erased+${body.advocateId}@redacted.evidentis.local`;
          const alreadyErased =
            advocate.email === placeholderEmail || advocate.status === 'erased';

          await tx.query(
            `UPDATE attorneys
           SET email = $3,
               display_name = 'Erased User',
               practice_group = NULL,
               bar_number = NULL,
               bar_state = NULL,
               bar_council_enrollment_number = NULL,
               bar_council_state = NULL,
               bci_enrollment_number = NULL,
               phone_number = NULL,
               whatsapp_number = NULL,
               password_hash = NULL,
               mfa_enabled = FALSE,
               mfa_secret = NULL,
               mfa_recovery_codes = NULL,
               failed_login_attempts = 0,
               locked_until = NULL,
               last_login_at = NULL,
               otp_enabled = FALSE,
               otp_last_sent_at = NULL,
               status = 'erased'
           WHERE tenant_id = $1
             AND id = $2`,
            [body.tenantId, body.advocateId, placeholderEmail],
          );

          const detailPayload = JSON.stringify({
            reason: body.reason ?? null,
            processedAt: new Date().toISOString(),
            placeholderEmail,
            alreadyErased,
          });

          if (body.requestId) {
            await tx.query(
              `UPDATE dpdp_requests
             SET status = 'resolved',
                 resolved_at = NOW(),
                 details = $2
             WHERE id = $1
               AND tenant_id = $3`,
              [body.requestId, detailPayload, body.tenantId],
            );
          } else {
            await tx.query(
              `INSERT INTO dpdp_requests (tenant_id, advocate_id, request_type, status, details, resolved_at)
             VALUES ($1, $2, 'erasure', 'resolved', $3, NOW())`,
              [body.tenantId, body.advocateId, detailPayload],
            );
          }

          return {
            placeholderEmail,
            alreadyErased,
          };
        });

        if (!result) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Advocate not found for erasure request',
            },
          });
        }

        logger.info(
          {
            tenantId: body.tenantId,
            advocateId: body.advocateId,
            requestId: body.requestId,
          },
          'DPDP erasure completed',
        );

        return reply.send({
          success: true,
          data: {
            erased: true,
            ...result,
          },
        });
      } catch (err) {
        logger.error(
          {
            err,
            tenantId: body.tenantId,
            advocateId: body.advocateId,
            requestId: body.requestId,
          },
          'Failed to process internal DPDP erasure',
        );
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process DPDP erasure',
          },
        });
      }
    },
  );
}
