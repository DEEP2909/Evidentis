/**
 * EvidentIS (Evidence-Based Intelligent Decision System) API Server
 * Main entry point for the Fastify API server
 */

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';

import crypto from 'node:crypto';
import { addVersionNegotiation } from './api-versioning.js';
import { initializeAuth } from './auth.js';
import {
  config,
  corsOrigins,
  isDevelopment,
  isProduction,
  isTest,
  rateLimits,
  trustProxy,
} from './config.js';
import { checkDatabaseHealth, closeDatabasePool, pool } from './database.js';
import { dpdpRoutes } from './dpdp.js';
import { logger } from './logger.js';
import { checkClamAVHealth } from './malware.js';
import { closeOrchestrator } from './orchestrator.js';
import { registerRoutes } from './routes.js';
import { registerSamlRoutes } from './saml.js';
import { scimRoutes } from './scim.js';
import { registerSecurityHardening } from './security-hardening.js';
import { registerSsoRoutes } from './sso.js';
import { registerTenantIsolation } from './tenant-isolation.js';
import { registerWebAuthnRoutes } from './webauthn.js';
import { initializeWebSocket } from './websocket.js';

// ============================================================
// SERVER SETUP
// ============================================================

async function createApp(): Promise<{
  app: FastifyInstance;
  redis: Redis | null;
}> {
  const app = Fastify({
    logger: {
      level: isProduction ? 'info' : 'debug',
      /* c8 ignore next 5 -- pretty logger transport is development-only */
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: { colorize: true },
          }
        : undefined,
    },
    trustProxy,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // ============================================================
  // PLUGINS
  // ============================================================

  // CORS
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    strictPreflight: false,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
          },
        }
      : false,
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    xFrameOptions: { action: 'deny' },
  });

  // Cookies - Issue #9 fix: use random key in dev instead of hardcoded string
  const cookieSecret =
    config.APP_ENCRYPTION_KEY?.slice(0, 32) ??
    crypto.randomBytes(16).toString('hex');
  if (!config.APP_ENCRYPTION_KEY) {
    logger.warn(
      '⚠️  APP_ENCRYPTION_KEY not set — using ephemeral cookie secret (not for production!)',
    );
  }
  await app.register(cookie, {
    secret: cookieSecret,
    parseOptions: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  });

  // Rate limiting with Redis
  const redis = isTest ? null : new Redis(config.REDIS_URL);
  await app.register(rateLimit, {
    global: true,
    max: rateLimits.general.requests,
    timeWindow: rateLimits.general.windowMs,
    ...(redis ? { redis } : {}),
    keyGenerator: (request) => {
      // Use tenant ID for authenticated requests, IP for others
      const tenantId = (request as unknown as { tenantId?: string }).tenantId;
      return tenantId || request.ip;
    },
  });

  // Multipart file uploads
  await app.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE_BYTES,
      files: 10,
    },
  });

  // WebSocket support
  await app.register(websocket, {
    options: {
      maxPayload: 1048576,
    },
  });

  // ============================================================
  // CUSTOM PLUGINS
  // ============================================================

  // Tenant isolation middleware - enforces tenant_id on all queries
  await app.register(registerTenantIsolation);
  logger.info('Tenant isolation middleware registered');

  // Additional security hardening (beyond @fastify/helmet)
  await app.register(registerSecurityHardening);
  logger.info('Security hardening middleware registered');

  // ============================================================
  // DECORATORS
  // ============================================================

  // Add tenant context to requests (canonical India advocate naming)
  app.decorateRequest('tenantId', '');
  app.decorateRequest('advocateId', '');
  app.decorateRequest('advocateRole', '');
  app.decorateRequest('user', undefined);
  // Backward-compatible aliases (deprecated — use advocateId/advocateRole)
  app.decorateRequest('attorneyId', '');
  app.decorateRequest('attorneyRole', '');

  // ============================================================
  // HOOKS
  // ============================================================

  // Request logging
  app.addHook('onRequest', async (request) => {
    request.log.info(
      { method: request.method, url: request.url },
      'Request started',
    );
  });

  // Response logging
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
      },
      'Request completed',
    );
  });

  // Error handling
  app.setErrorHandler(async (error, request, reply) => {
    const fastifyError = error as FastifyError & { code?: string };
    request.log.error({ err: error }, 'Request error');

    // Don't expose internal errors in production
    if (
      isProduction &&
      fastifyError.statusCode !== 400 &&
      fastifyError.statusCode !== 401 &&
      fastifyError.statusCode !== 403 &&
      fastifyError.statusCode !== 404 &&
      fastifyError.statusCode !== 429
    ) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      });
    }

    return reply.status(fastifyError.statusCode || 500).send({
      success: false,
      error: {
        code: fastifyError.code || 'ERROR',
        message: fastifyError.message,
      },
    });
  });

  // ============================================================
  // HEALTH ENDPOINTS
  // ============================================================

  app.get('/health/live', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/health/ready', async (_request, reply) => {
    const checks = {
      database: await checkDatabaseHealth(),
      redis: redis ? redis.status === 'ready' : true,
      clamav: await checkClamAVHealth(),
    };

    const healthy = Object.values(checks).every(Boolean);

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================
  // ROUTES
  // ============================================================

  // IMPORTANT: Content type parser MUST be registered BEFORE routes (Fastify requirement)
  // This custom parser keeps raw buffer for Razorpay webhook while parsing JSON for others
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: config.MAX_FILE_SIZE_BYTES },
    (req, body, done) => {
      // For Razorpay webhook endpoint, keep raw buffer for signature verification
      // Use includes or startsWith to be safe against query strings
      if (req.url && (req.url === '/webhooks/razorpay' || req.url.startsWith('/webhooks/razorpay?'))) {
        done(null, body);
      } else {
        // For all other endpoints, parse as JSON
        try {
          const content = body.toString();
          if (!content || content.trim() === '') {
            done(null, null);
            return;
          }
          const json = JSON.parse(content);
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    },
  );

  // Add version negotiation before routes (Issue #6 fix)
  addVersionNegotiation(app);

  await registerRoutes(app);

  // Register SSO/SCIM/WebAuthn/SAML routes (Issue #1 fix)
  await app.register(scimRoutes);
  await registerSsoRoutes(app);
  registerWebAuthnRoutes(app, pool);
  await registerSamlRoutes(app);
  await dpdpRoutes(app);

  // Initialize WebSocket server for real-time events (await to ensure Redis adapter connects)
  /* c8 ignore next 3 -- websocket server is intentionally disabled in tests */
  if (!isTest) {
    await initializeWebSocket(
      app.server,
      config.REDIS_URL,
      config.JWT_PUBLIC_KEY_PATH,
    );
  }

  return { app, redis };
}

/* c8 ignore start -- signal/bootstrap paths are exercised only in runtime, not unit tests */
function registerShutdownHandlers(
  app: FastifyInstance,
  redis: Redis | null,
): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.once(signal, () => {
      void (async () => {
        logger.info({ signal }, 'Received shutdown signal');

        // Close server
        await app.close();
        logger.info('Server closed');

        // Close orchestrator (FlowProducer Redis connection)
        await closeOrchestrator();
        logger.info('Orchestrator closed');

        // Close Redis
        if (redis) {
          await redis.quit();
          logger.info('Redis connection closed');
        }

        // Close database pool
        await closeDatabasePool();

        process.exit(0);
      })();
    });
  }
}

// ============================================================
// START SERVER
// ============================================================

async function start() {
  try {
    // Initialize auth (load JWT keys)
    await initializeAuth();
    logger.info('Auth initialized');

    // Verify database connection
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('Database connection verified');

    // Build and start server
    const { app, redis } = await createApp();
    registerShutdownHandlers(app, redis);

    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(`Server listening on http://${config.HOST}:${config.PORT}`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}
/* c8 ignore stop */

export async function build(): Promise<FastifyInstance> {
  const { app } = await createApp();
  return app;
}

/* c8 ignore next 3 -- test suite imports build() and must not auto-start server */
if (!isTest) {
  void start();
}
