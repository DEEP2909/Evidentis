/**
 * EvidentIS API — webhook Routes
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

import { handleRazorpayWebhook } from '../billing.js';
import {
  generateSecureToken,
  hashToken,
} from '../security.js';


export default async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // WEBHOOK ROUTES
  // ============================================================

  // POST /webhooks/razorpay - Razorpay webhook handler
  fastify.post('/webhooks/razorpay', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    if (!signature || typeof signature !== 'string') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing x-razorpay-signature header',
        },
      });
    }

    try {
      await handleRazorpayWebhook(request.body as Buffer, signature);
      return reply.status(200).send({ received: true });
    } catch (error) {
      logger.error({ error }, 'Razorpay webhook error');
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook verification failed',
        },
      });
    }
  });

  // GET /api/webhooks - List webhooks
  fastify.get(
    '/api/webhooks',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;

      const webhooks = await query<{
        id: string;
        url: string;
        events: string[];
        is_active: boolean;
        last_triggered_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, url, events, is_active, last_triggered_at, created_at
       FROM webhooks WHERE tenant_id = $1
       ORDER BY created_at DESC`,
        [authReq.tenantId],
      );

      return { success: true, data: webhooks.rows };
    },
  );

  // POST /api/webhooks - Create webhook
  fastify.post(
    '/api/webhooks',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          url: z.string().url(),
          events: z.array(z.string()).min(1),
        })
        .parse(request.body);

      const secret = generateSecureToken(32);
      const webhook = await queryOne<{ id: string }>(
        `INSERT INTO webhooks (tenant_id, url, events, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
        [authReq.tenantId, body.url, body.events, secret],
      );

      return reply.status(201).send({
        success: true,
        data: { id: webhook?.id, secret },
      });
    },
  );

  // DELETE /api/webhooks/:id - Delete webhook
  fastify.delete(
    '/api/webhooks/:id',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      const result = await query(
        'DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (result.rowCount === 0) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Webhook not found' } });
      }

      return { success: true };
    },
  );

  // ============================================================
}
