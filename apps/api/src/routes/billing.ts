/**
 * EvidentIS API — billing Routes
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


export default async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  // BILLING ROUTES
  // ============================================================

  // GET /billing/status - Get billing status
  fastify.get(
    '/billing/status',
    { preHandler: [authenticateRequest] },
    async (request, _reply) => {
      const authReq = request as AuthenticatedRequest;

      const { getBillingStatus } = await import('../billing.js');
      const billingStatus = await getBillingStatus(authReq.tenantId);

      return {
        success: true,
        data: {
          plan: billingStatus.plan,
          status: billingStatus.status,
          currentPeriodEnd: billingStatus.currentPeriodEnd,
          cancelAtPeriodEnd: billingStatus.cancelAtPeriodEnd,
          trialEndsAt: billingStatus.trialEndsAt,
          usage: {
            documents: billingStatus.usage.documentsThisMonth,
            documentsLimit: billingStatus.usage.documentsLimit,
            research: billingStatus.usage.researchThisMonth,
            researchLimit: billingStatus.usage.researchLimit,
            advocates: billingStatus.usage.advocatesActive,
            advocatesLimit: billingStatus.usage.advocatesLimit,
          },
        },
      };
    },
  );

  // POST /billing/checkout - Create checkout session
  fastify.post(
    '/billing/checkout',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          plan: z.enum(['starter', 'growth', 'professional', 'enterprise']),
          successUrl: z.string().url(),
          cancelUrl: z.string().url(),
        })
        .parse(request.body);

      // Integration with Razorpay via billing module
      try {
        const { createCheckoutSession } = await import('../billing.js');
        const billingContact = await queryOne<{
          email: string;
          firm_name: string;
        }>(
          `SELECT a.email, t.name as firm_name
           FROM attorneys a
           JOIN tenants t ON t.id = a.tenant_id
           WHERE a.id = $1 AND a.tenant_id = $2`,
          [authReq.advocateId, authReq.tenantId],
        );

        if (!billingContact) {
          return reply
            .status(404)
            .send({
              success: false,
              error: { message: 'Billing contact not found' },
            });
        }

        const session = await createCheckoutSession(
          authReq.tenantId,
          billingContact.email,
          billingContact.firm_name,
          body.plan,
          body.successUrl,
          body.cancelUrl,
        );
        return { success: true, data: { sessionUrl: session.url } };
      } catch (error) {
        logger.error({ error }, 'Failed to create checkout session');
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Billing service unavailable' },
          });
      }
    },
  );

  // GET /quota/check - Check quota status
  fastify.get(
    '/quota/check',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { type } = request.query as { type?: 'document' | 'research' };
      const quotaType: 'document' | 'research' =
        type === 'research' ? 'research' : 'document';

      try {
        const { checkQuota } = await import('../billing.js');
        const quotaStatus = await checkQuota(authReq.tenantId, quotaType);
        return { success: true, data: quotaStatus };
      } catch (_error) {
        return reply
          .status(500)
          .send({ success: false, error: { message: 'Quota check failed' } });
      }
    },
  );

  // ============================================================

  // BILLING ADDITIONAL ROUTES
  // ============================================================

  // POST /billing/portal - Create Razorpay billing management session
  fastify.post(
    '/billing/portal',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          returnUrl: z.string().url().optional(),
        })
        .parse(request.body);

      try {
        const { createCustomerPortalSession } = await import('../billing.js');
        const session = await createCustomerPortalSession(
          authReq.tenantId,
          body.returnUrl || `${config.FRONTEND_URL}/billing`,
        );
        return { success: true, data: { url: session.url } };
      } catch (error) {
        logger.error({ error }, 'Failed to create portal session');
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Billing portal unavailable' },
          });
      }
    },
  );

  // ============================================================
}
