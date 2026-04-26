/**
 * EvidentIS API Routes — Barrel Module
 * Registers all feature-based route modules as Fastify plugins.
 *
 * This file replaces the monolithic 6600-line routes.ts with a clean
 * composition of feature-scoped modules under ./routes/.
 *
 * Each module is a self-contained Fastify plugin that:
 *   - Imports shared helpers from ./routes/_helpers.ts
 *   - Imports domain-specific modules (auth, billing, etc.)
 *   - Registers its own routes via fastify.get/post/etc.
 */

import type { FastifyInstance } from 'fastify';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import documentRoutes from './routes/documents.js';
import legalOpsRoutes from './routes/legal-ops.js';
import legalRulesRoutes from './routes/legal-rules.js';
import matterRoutes from './routes/matters.js';
import researchRoutes from './routes/research.js';
import webhookRoutes from './routes/webhooks.js';

// Re-export shared types and middleware for backwards compatibility
export {
  authenticateRequest,
  type AuthenticatedRequest,
} from './routes/_helpers.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(authRoutes);
  await fastify.register(matterRoutes);
  await fastify.register(documentRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(researchRoutes);
  await fastify.register(legalOpsRoutes);
  await fastify.register(analyticsRoutes);
  await fastify.register(billingRoutes);
  await fastify.register(legalRulesRoutes);
  await fastify.register(webhookRoutes);
  await fastify.register(aiRoutes);
}
