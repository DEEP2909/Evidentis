/**
 * EvidentIS API Routes
 * All REST API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import {
  ADVOCATE_ROLES,
  INDIAN_STATE_CODES,
  MATTER_TYPES,
  SUPPORTED_LANGUAGE_CODES,
} from '@evidentis/shared';
import {
  verifyAccessToken,
  generateAccessToken,
  generateRefreshToken,
  type AccessTokenPayload,
} from './auth.js';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  generateSecureToken,
  hashToken,
  generateApiKey,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from './security.js';
import { query, queryOne, withTransaction } from './database.js';
import { config, rateLimits } from './config.js';
import { sendPasswordResetEmail, sendInvitationEmail } from './email.js';
import { logger } from './logger.js';
import { getCachedEmbedding, cacheEmbedding, assertEmbeddingDimension } from './embedding-cache.js';
import { startDocumentPipeline, getPipelineStatus } from './orchestrator.js';
import { buildAIContext, formatContextForPrompt } from './ai-context.js';
import {
  enforceDocumentQuota,
  enforceResearchQuota,
  enforceAdvocateLimit,
  enforceActiveSubscription,
  incrementDocumentUsage,
  incrementResearchUsage,
} from './billing-enforcement.js';

// ============================================================
// REQUEST TYPES
// ============================================================

interface AuthenticatedRequest extends FastifyRequest {
  tenantId: string;
  advocateId: string;
  advocateRole: string;
  /** @deprecated Use advocateId */
  attorneyId: string;
  /** @deprecated Use advocateRole */
  attorneyRole: string;
  tokenPayload: AccessTokenPayload;
}

interface ResearchChunkRow {
  id: string;
  document_id: string;
  text_content: string;
  chunk_index: number;
  page_from: number | null;
  page_to: number | null;
  document_title: string;
  relevance_score: number;
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
    });
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);

    (request as AuthenticatedRequest).tenantId = payload.tenantId;
    (request as AuthenticatedRequest).advocateId = payload.sub;
    (request as AuthenticatedRequest).advocateRole = payload.role;
    (request as AuthenticatedRequest).attorneyId = payload.sub;
    (request as AuthenticatedRequest).attorneyRole = payload.role;
    (request as AuthenticatedRequest).tokenPayload = payload;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

function requireRoles(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authReq = request as AuthenticatedRequest;
    if (!roles.includes(authReq.advocateRole)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
  };
}

function getAiServiceHeaders(base: Record<string, string> = {}): Record<string, string> {
  const headers = { ...base };
  if (config.AI_SERVICE_INTERNAL_KEY) {
    headers['X-Internal-Key'] = config.AI_SERVICE_INTERNAL_KEY;
  }
  return headers;
}

function normalizeIndianPhoneNumber(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length === 14 && digits.startsWith('0091')) {
    return `+${digits.slice(2)}`;
  }
  return null;
}

function getPhoneLookupDigits(normalizedPhone: string): string[] {
  const digits = normalizedPhone.replace(/\D/g, '');
  const localNumber = digits.startsWith('91') ? digits.slice(2) : digits;
  return Array.from(new Set([digits, localNumber]));
}

function maskPhoneNumber(normalizedPhone: string): string {
  if (normalizedPhone.length <= 4) return normalizedPhone;
  return `${normalizedPhone.slice(0, 3)}******${normalizedPhone.slice(-2)}`;
}

function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

async function sendOtpViaMsg91(normalizedPhone: string, otpCode: string): Promise<'sent' | 'logged'> {
  if (!config.MSG91_AUTH_KEY) {
    logger.info({ phone: maskPhoneNumber(normalizedPhone), otpCode }, 'MSG91 auth key not configured; OTP logged');
    return 'logged';
  }

  const response = await fetch(`${config.MSG91_BASE_URL}/v5/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: config.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      mobile: normalizedPhone.replace(/\D/g, ''),
      otp: otpCode,
      sender: config.MSG91_SENDER_ID,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`MSG91 request failed (${response.status}): ${errorBody || 'unknown error'}`);
  }

  return 'sent';
}

function toActSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ============================================================
// SCHEMA DEFINITIONS
// ============================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().length(6).optional(),
  tenantSlug: z.string().min(1).optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  displayName: z.string().min(1),
  token: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(12).optional(),
    newPassword: z.string().min(12).optional(),
  })
  .refine((data) => Boolean(data.password || data.newPassword), {
    message: 'Password is required',
  });

const supportedLanguageSchema = z.enum(SUPPORTED_LANGUAGE_CODES);
const indianStateSchema = z.enum(INDIAN_STATE_CODES);

function normalizeMatterType(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const key = value.trim().toLowerCase();

  if (MATTER_TYPES.includes(key as (typeof MATTER_TYPES)[number])) {
    return key;
  }
  if (key === 'ma_transaction' || key.includes('m&a') || key.includes('merger') || key.includes('acquisition')) {
    return 'merger_acquisition';
  }
  if (key === 'ip' || key.includes('intellectual property')) {
    return 'intellectual_property';
  }
  if (key === 'employment') {
    return 'labour_employment';
  }
  if (key === 'regulatory') {
    return 'regulatory_compliance';
  }
  if (key === 'commercial') {
    return 'commercial_contract';
  }
  return key;
}

const matterCreateSchema = z.object({
  matterCode: z.string().min(1),
  matterName: z.string().min(1),
  matterType: z.preprocess(normalizeMatterType, z.enum(MATTER_TYPES)),
  clientName: z.string().min(1),
  counterpartyName: z.string().optional(),
  governingLawState: indianStateSchema.optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  leadAdvocateId: z.string().uuid().optional(),
  /** @deprecated Use leadAdvocateId */
  leadAttorneyId: z.string().uuid().optional(),
  targetCloseDate: z.string().optional(),
  dealValuePaise: z.number().int().positive().optional(),
  /** @deprecated Use dealValuePaise */
  dealValueCents: z.number().int().positive().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const matterUpdateSchema = matterCreateSchema.partial().extend({
  status: z.enum(['open', 'under_review', 'closed', 'archived']).optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z
    .preprocess((value) => (value === 'attorney' ? 'advocate' : value), z.enum(ADVOCATE_ROLES))
    .optional(),
  displayName: z.string().optional(),
});

const otpSendSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  purpose: z.enum(['login', 'mfa']).default('login'),
  tenantSlug: z.string().min(1).max(120).optional(),
});

const otpVerifySchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  otp: z.string().length(6),
  purpose: z.enum(['login', 'mfa']).default('login'),
  tenantSlug: z.string().min(1).max(120).optional(),
});

// ============================================================
// ROUTE REGISTRATION
// ============================================================

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================================
  // AUTH ROUTES
  // ============================================================

  // POST /auth/login
  fastify.post('/auth/login', {
    config: {
      rateLimit: {
        max: rateLimits.auth.requests,
        timeWindow: rateLimits.auth.windowMs,
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { email, password, mfaCode, tenantSlug } = body;

    // Find attorney by email
    const attorney = await queryOne<{
      id: string;
      tenant_id: string;
      email: string;
      display_name: string;
      role: string;
      password_hash: string;
      mfa_enabled: boolean;
      mfa_secret: string | null;
      failed_login_attempts: number;
      locked_until: Date | null;
      status: string;
      tenant_slug: string;
    }>(
      `SELECT a.id, a.tenant_id, a.email, a.display_name, a.role, a.password_hash, 
              a.mfa_enabled, a.mfa_secret, a.failed_login_attempts, a.locked_until, a.status,
              t.slug as tenant_slug
       FROM attorneys a
       JOIN tenants t ON t.id = a.tenant_id
       WHERE a.email = $1`,
      [email.toLowerCase()]
    );

    if (!attorney) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    if (tenantSlug && attorney.tenant_slug !== tenantSlug) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Check if account is locked
    if (attorney.locked_until && new Date(attorney.locked_until) > new Date()) {
      return reply.status(423).send({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked' },
      });
    }

    // Check if account is suspended
    if (attorney.status === 'suspended') {
      return reply.status(401).send({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Account has been suspended' },
      });
    }

    // Verify password
    const validPassword = await verifyPassword(password, attorney.password_hash);
    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = attorney.failed_login_attempts + 1;
      const lockUntil = newAttempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
        : null;

      await query(
        `UPDATE attorneys 
         SET failed_login_attempts = $1, locked_until = $2 
         WHERE id = $3`,
        [newAttempts, lockUntil, attorney.id]
      );

      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Check MFA if enabled
    if (attorney.mfa_enabled) {
      if (!mfaCode) {
        return reply.status(200).send({
          success: true,
          data: { mfaRequired: true },
        });
      }

      // Verify MFA code (would use otpauth library in full implementation)
      // For now, skip MFA verification in development
    }

    // Generate tokens
    const tokenId = generateSecureToken(16);
    const accessToken = await generateAccessToken({
      sub: attorney.id,
      tenantId: attorney.tenant_id,
      email: attorney.email,
      role: attorney.role,
    });

    const refreshToken = await generateRefreshToken({
      sub: attorney.id,
      tenantId: attorney.tenant_id,
      email: attorney.email,
      role: attorney.role,
      tokenId,
    });

    // Store refresh token hash
    await query(
      `INSERT INTO refresh_tokens (attorney_id, tenant_id, token_hash, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        attorney.id,
        attorney.tenant_id,
        hashToken(refreshToken),
        request.headers['user-agent'] || '',
        request.ip,
      ]
    );

    // Reset failed attempts and update last login
    await query(
      `UPDATE attorneys 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() 
       WHERE id = $1`,
      [attorney.id]
    );

    // Log audit event
    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, 'auth.login', $3, $4)`,
      [attorney.tenant_id, attorney.id, request.ip, request.headers['user-agent']]
    );

    // Set refresh token as httpOnly cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return {
      success: true,
      data: {
        accessToken,
        attorney: {
          id: attorney.id,
          tenantId: attorney.tenant_id,
          email: attorney.email,
          displayName: attorney.display_name,
          role: attorney.role,
        },
        advocate: {
          id: attorney.id,
          tenantId: attorney.tenant_id,
          email: attorney.email,
          displayName: attorney.display_name,
          role: attorney.role,
        },
      },
    };
  });

  // POST /auth/logout
  fastify.post('/auth/logout', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
        [hashToken(refreshToken)]
      );
    }

    // Log audit event
    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, 'auth.logout', $3, $4)`,
      [authReq.tenantId, authReq.advocateId, request.ip, request.headers['user-agent']]
    );

    reply.clearCookie('refreshToken', { path: '/auth/refresh' });
    return { success: true };
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' },
      });
    }

    // Find and validate refresh token
    const tokenRecord = await queryOne<{
      id: string;
      attorney_id: string;
      tenant_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      rotated_to: string | null;
    }>(
      `SELECT id, attorney_id, tenant_id, expires_at, revoked_at, rotated_to
       FROM refresh_tokens WHERE token_hash = $1`,
      [hashToken(refreshToken)]
    );

    if (!tokenRecord) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      });
    }

    // Check if token is revoked or expired
    if (tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token has expired' },
      });
    }

    // Check for token reuse (replay attack)
    if (tokenRecord.rotated_to) {
      // Revoke entire token family
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE attorney_id = $1`,
        [tokenRecord.attorney_id]
      );
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_REUSE', message: 'Token reuse detected' },
      });
    }

    // Get attorney
    const attorney = await queryOne<{
      id: string;
      email: string;
      role: string;
      status: string;
    }>(
      `SELECT id, email, role, status FROM attorneys WHERE id = $1 AND tenant_id = $2`,
      [tokenRecord.attorney_id, tokenRecord.tenant_id]
    );

    if (!attorney || attorney.status !== 'active') {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_ACCOUNT', message: 'Account not found or inactive' },
      });
    }

    // Generate new tokens
    const newTokenId = generateSecureToken(16);
    const accessToken = await generateAccessToken({
      sub: attorney.id,
      tenantId: tokenRecord.tenant_id,
      email: attorney.email,
      role: attorney.role,
    });

    const newRefreshToken = await generateRefreshToken({
      sub: attorney.id,
      tenantId: tokenRecord.tenant_id,
      email: attorney.email,
      role: attorney.role,
      tokenId: newTokenId,
    });

    // Rotate token
    const newTokenHash = hashToken(newRefreshToken);
    await withTransaction(async (tx) => {
      // Create new token
      const newToken = await tx.queryOne<{ id: string }>(
        `INSERT INTO refresh_tokens (attorney_id, tenant_id, token_hash, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [attorney.id, tokenRecord.tenant_id, newTokenHash, request.headers['user-agent'], request.ip]
      );

      // Mark old token as rotated
      await tx.query(
        `UPDATE refresh_tokens SET rotated_to = $1 WHERE id = $2`,
        [newToken?.id, tokenRecord.id]
      );
    });

    // Set new refresh token
    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    return { success: true, data: { accessToken } };
  });

  // POST /auth/forgot-password
  const sendOtpHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = otpSendSchema.parse(request.body);
    const normalizedPhone = normalizeIndianPhoneNumber(body.phoneNumber);
    if (!normalizedPhone) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Enter a valid Indian mobile number' },
      });
    }

    const phoneVariants = getPhoneLookupDigits(normalizedPhone);
    const params: unknown[] = [phoneVariants];
    let tenantFilter = '';
    if (body.tenantSlug) {
      tenantFilter = ' AND t.slug = $2';
      params.push(body.tenantSlug);
    }

    const attorney = await queryOne<{
      id: string;
      tenant_id: string;
      email: string;
      display_name: string;
      role: string;
      status: string;
    }>(
      `SELECT a.id, a.tenant_id, a.email, a.display_name, a.role, a.status
       FROM attorneys a
       JOIN tenants t ON t.id = a.tenant_id
       WHERE regexp_replace(COALESCE(a.phone_number, ''), '[^0-9]', '', 'g') = ANY($1::text[])${tenantFilter}
       ORDER BY a.created_at DESC
       LIMIT 1`,
      params
    );

    // Return generic success for unknown/suspended accounts to prevent user enumeration.
    if (!attorney || attorney.status !== 'active') {
      return {
        success: true,
        data: {
          sent: true,
          phoneMasked: maskPhoneNumber(normalizedPhone),
          expiresInMinutes: config.OTP_EXPIRY_MINUTES,
        },
      };
    }

    const otpCode = generateOtpCode();
    const otpHash = hashToken(`${normalizedPhone}:${body.purpose}:${otpCode}`);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE advocate_otps
         SET consumed_at = NOW()
         WHERE phone_number = $1 AND purpose = $2 AND consumed_at IS NULL`,
        [normalizedPhone, body.purpose]
      );

      await tx.query(
        `INSERT INTO advocate_otps (tenant_id, advocate_id, phone_number, purpose, otp_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [attorney.tenant_id, attorney.id, normalizedPhone, body.purpose, otpHash, expiresAt]
      );

      await tx.query(`UPDATE attorneys SET otp_last_sent_at = NOW() WHERE id = $1`, [attorney.id]);
    });

    let deliveryMode: 'sent' | 'logged' = 'logged';
    try {
      deliveryMode = await sendOtpViaMsg91(normalizedPhone, otpCode);
    } catch (error) {
      logger.error({ error, phone: maskPhoneNumber(normalizedPhone) }, 'Failed to send OTP via MSG91');
      return reply.status(502).send({
        success: false,
        error: { code: 'OTP_DELIVERY_FAILED', message: 'Unable to deliver OTP right now' },
      });
    }

    return {
      success: true,
      data: {
        sent: true,
        phoneMasked: maskPhoneNumber(normalizedPhone),
        expiresInMinutes: config.OTP_EXPIRY_MINUTES,
        deliveryMode,
        ...(deliveryMode === 'logged' && config.NODE_ENV !== 'production' ? { otpPreview: otpCode } : {}),
      },
    };
  };

  fastify.post('/auth/otp/send', {
    config: {
      rateLimit: {
        max: rateLimits.otp.requests,
        timeWindow: rateLimits.otp.windowMs,
      },
    },
  }, sendOtpHandler);
  fastify.post('/api/auth/otp/send', {
    config: {
      rateLimit: {
        max: rateLimits.otp.requests,
        timeWindow: rateLimits.otp.windowMs,
      },
    },
  }, sendOtpHandler);

  const verifyOtpHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = otpVerifySchema.parse(request.body);
    const normalizedPhone = normalizeIndianPhoneNumber(body.phoneNumber);
    if (!normalizedPhone) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Enter a valid Indian mobile number' },
      });
    }

    const params: unknown[] = [normalizedPhone, body.purpose];
    let tenantFilter = '';
    if (body.tenantSlug) {
      tenantFilter = ' AND t.slug = $3';
      params.push(body.tenantSlug);
    }

    const otpRecord = await queryOne<{
      id: string;
      tenant_id: string;
      advocate_id: string;
      otp_hash: string;
      expires_at: Date;
      email: string;
      display_name: string;
      role: string;
      status: string;
    }>(
      `SELECT o.id, o.tenant_id, o.advocate_id, o.otp_hash, o.expires_at,
              a.email, a.display_name, a.role, a.status
       FROM advocate_otps o
       JOIN attorneys a ON a.id = o.advocate_id
       JOIN tenants t ON t.id = o.tenant_id
       WHERE o.phone_number = $1
         AND o.purpose = $2
         AND o.consumed_at IS NULL${tenantFilter}
       ORDER BY o.created_at DESC
       LIMIT 1`,
      params
    );

    if (!otpRecord) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
      });
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      await query(`UPDATE advocate_otps SET consumed_at = NOW() WHERE id = $1`, [otpRecord.id]);
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
      });
    }

    const expectedHash = hashToken(`${normalizedPhone}:${body.purpose}:${body.otp}`);
    if (expectedHash !== otpRecord.otp_hash || otpRecord.status !== 'active') {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
      });
    }

    const tokenId = generateSecureToken(16);
    const accessToken = await generateAccessToken({
      sub: otpRecord.advocate_id,
      tenantId: otpRecord.tenant_id,
      email: otpRecord.email,
      role: otpRecord.role,
    });
    const refreshToken = await generateRefreshToken({
      sub: otpRecord.advocate_id,
      tenantId: otpRecord.tenant_id,
      email: otpRecord.email,
      role: otpRecord.role,
      tokenId,
    });

    await withTransaction(async (tx) => {
      await tx.query(`UPDATE advocate_otps SET consumed_at = NOW() WHERE id = $1`, [otpRecord.id]);
      await tx.query(
        `INSERT INTO refresh_tokens (attorney_id, tenant_id, token_hash, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [otpRecord.advocate_id, otpRecord.tenant_id, hashToken(refreshToken), request.headers['user-agent'], request.ip]
      );
      await tx.query(
        `UPDATE attorneys
         SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
         WHERE id = $1`,
        [otpRecord.advocate_id]
      );
      await tx.query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, user_agent)
         VALUES ($1, $2, 'auth.login.otp', $3, $4)`,
        [otpRecord.tenant_id, otpRecord.advocate_id, request.ip, request.headers['user-agent']]
      );
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        accessToken,
        attorney: {
          id: otpRecord.advocate_id,
          tenantId: otpRecord.tenant_id,
          email: otpRecord.email,
          displayName: otpRecord.display_name,
          role: otpRecord.role,
        },
        advocate: {
          id: otpRecord.advocate_id,
          tenantId: otpRecord.tenant_id,
          email: otpRecord.email,
          displayName: otpRecord.display_name,
          role: otpRecord.role,
        },
      },
    };
  };

  fastify.post('/auth/otp/verify', {
    config: {
      rateLimit: {
        max: rateLimits.otp.requests,
        timeWindow: rateLimits.otp.windowMs,
      },
    },
  }, verifyOtpHandler);
  fastify.post('/api/auth/otp/verify', {
    config: {
      rateLimit: {
        max: rateLimits.otp.requests,
        timeWindow: rateLimits.otp.windowMs,
      },
    },
  }, verifyOtpHandler);

  // POST /auth/forgot-password
  fastify.post('/auth/forgot-password', async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body);

    const attorney = await queryOne<{ id: string; display_name: string; tenant_id: string }>(
      `SELECT id, display_name, tenant_id FROM attorneys WHERE email = $1 AND status = 'active'`,
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (!attorney) {
      return { success: true };
    }

    // Generate reset token
    const token = generateSecureToken(32);
    const tokenHash = hashToken(token);

    await query(
      `INSERT INTO password_reset_tokens (attorney_id, token_hash)
       VALUES ($1, $2)`,
      [attorney.id, tokenHash]
    );

    // Send email
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl, attorney.display_name);

    // Log audit event
    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, metadata)
       VALUES ($1, $2, 'auth.forgot_password', $3, $4)`,
      [attorney.tenant_id, attorney.id, request.ip, JSON.stringify({ email })]
    );

    return { success: true };
  });

  // POST /auth/reset-password
  fastify.post('/auth/reset-password', async (request, reply) => {
    const { token, password, newPassword } = resetPasswordSchema.parse(request.body);
    const effectivePassword = newPassword ?? password ?? '';

    // Validate password policy
    const validation = validatePasswordPolicy(effectivePassword);
    if (!validation.valid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: validation.errors.join(', ') },
      });
    }

    const tokenHash = hashToken(token);
    const tokenRecord = await queryOne<{
      id: string;
      attorney_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, attorney_id, expires_at, used_at 
       FROM password_reset_tokens 
       WHERE token_hash = $1 AND status = 'active'`,
      [tokenHash]
    );

    if (!tokenRecord || tokenRecord.used_at || new Date(tokenRecord.expires_at) < new Date()) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }

    const passwordHash = await hashPassword(effectivePassword);

    await withTransaction(async (tx) => {
      // Update password
      await tx.query(
        `UPDATE attorneys SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL
         WHERE id = $2`,
        [passwordHash, tokenRecord.attorney_id]
      );

      // Mark token as used
      await tx.query(
        `UPDATE password_reset_tokens SET used_at = NOW(), status = 'used' WHERE id = $1`,
        [tokenRecord.id]
      );

      // Revoke all refresh tokens (log out all sessions)
      await tx.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE attorney_id = $1`,
        [tokenRecord.attorney_id]
      );
    });

    return { success: true };
  });

  // GET /auth/me
  fastify.get('/auth/me', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;

    const attorney = await queryOne<{
      id: string;
      email: string;
      display_name: string;
      role: string;
      practice_group: string | null;
      bar_number: string | null;
      bar_state: string | null;
      bar_council_enrollment_number: string | null;
      bar_council_state: string | null;
      bci_enrollment_number: string | null;
      phone_number: string | null;
      preferred_language: string;
      mfa_enabled: boolean;
      last_login_at: Date | null;
    }>(
      `SELECT id, email, display_name, role, practice_group, bar_number, bar_state,
              bar_council_enrollment_number, bar_council_state, bci_enrollment_number,
              phone_number, preferred_language, mfa_enabled, last_login_at
       FROM attorneys WHERE id = $1 AND tenant_id = $2`,
      [authReq.advocateId, authReq.tenantId]
    );

    const tenant = await queryOne<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      logo_url: string | null;
    }>(
      `SELECT id, name, slug, plan, logo_url FROM tenants WHERE id = $1`,
      [authReq.tenantId]
    );

    return {
      success: true,
      data: {
        attorney,
        advocate: attorney,
        tenant,
      },
    };
  });

  // POST /auth/mfa/setup
  fastify.post('/auth/mfa/setup', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const secret = generateSecureToken(20).toUpperCase();
    const issuer = encodeURIComponent('EvidentIS');
    const label = encodeURIComponent(authReq.tokenPayload.email);
    const qrCodeUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;

    await query(
      `UPDATE attorneys SET mfa_secret = $1 WHERE id = $2 AND tenant_id = $3`,
      [secret, authReq.advocateId, authReq.tenantId]
    );

    return {
      success: true,
      data: {
        secret,
        qrCodeUrl,
      },
    };
  });

  // ============================================================
  // MATTER ROUTES
  // ============================================================

  // GET /api/matters
  fastify.get('/api/matters', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const queryParams = request.query as { page?: string; limit?: string; status?: string; search?: string };

    const page = Number.parseInt(queryParams.page || '1', 10);
    const limit = Math.min(Number.parseInt(queryParams.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE m.tenant_id = $1';
    const params: unknown[] = [authReq.tenantId];
    let paramIndex = 2;

    if (queryParams.status) {
      whereClause += ` AND m.status = $${paramIndex}`;
      params.push(queryParams.status);
      paramIndex++;
    }

    if (queryParams.search) {
      whereClause += ` AND (m.matter_name ILIKE $${paramIndex} OR m.matter_code ILIKE $${paramIndex} OR m.client_name ILIKE $${paramIndex})`;
      params.push(`%${queryParams.search}%`);
      paramIndex++;
    }

    const matters = await query<{
      id: string;
      matter_code: string;
      matter_name: string;
      matter_type: string;
      client_name: string;
      status: string;
      priority: string;
      health_score: number;
      target_close_date: Date | null;
      created_at: Date;
      flag_count: number;
      critical_flag_count: number;
    }>(
      `SELECT m.id, m.matter_code, m.matter_name, m.matter_type, m.client_name,
              m.status, m.priority, m.health_score, m.target_close_date, m.created_at,
              COALESCE(f.flag_count, 0) as flag_count,
              COALESCE(f.critical_count, 0) as critical_flag_count
       FROM matters m
       LEFT JOIN (
         SELECT matter_id, COUNT(*) as flag_count, 
                SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count
         FROM flags WHERE status = 'open'
         GROUP BY matter_id
       ) f ON m.id = f.matter_id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM matters m ${whereClause}`,
      params
    );

    return {
      success: true,
      data: {
        matters: matters.rows,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countResult?.count || '0', 10),
          totalPages: Math.ceil(Number.parseInt(countResult?.count || '0', 10) / limit),
        },
      },
    };
  });

  // POST /api/matters
  fastify.post('/api/matters', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = matterCreateSchema.parse(request.body);
    const leadAdvocateId = body.leadAdvocateId ?? body.leadAttorneyId ?? null;
    const dealValuePaise = body.dealValuePaise ?? body.dealValueCents ?? null;

    const matter = await queryOne<{ id: string }>(
      `INSERT INTO matters (tenant_id, matter_code, matter_name, matter_type, client_name,
                            counterparty_name, governing_law_state, priority, lead_advocate_id, lead_attorney_id,
                            target_close_date, deal_value_paise, deal_value_cents, notes, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $11, $12, $13, $14)
       RETURNING id`,
      [
        authReq.tenantId,
        body.matterCode,
        body.matterName,
        body.matterType,
        body.clientName,
        body.counterpartyName || null,
        body.governingLawState || null,
        body.priority || 'normal',
        leadAdvocateId,
        body.targetCloseDate || null,
        dealValuePaise,
        body.notes || null,
        body.tags || [],
        authReq.advocateId,
      ]
    );

    // Log audit event
    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id, metadata)
       VALUES ($1, $2, 'matter.created', 'matter', $3, $4)`,
      [authReq.tenantId, authReq.advocateId, matter?.id, JSON.stringify(body)]
    );

    return reply.status(201).send({
      success: true,
      data: { id: matter?.id },
    });
  });

  // GET /api/matters/:id
  fastify.get('/api/matters/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const matter = await queryOne<{
      id: string;
      matter_code: string;
      matter_name: string;
      matter_type: string;
      client_name: string;
      counterparty_name: string | null;
      governing_law_state: string | null;
      status: string;
      priority: string;
      health_score: number;
      lead_advocate_id: string | null;
      lead_attorney_id: string | null;
      target_close_date: Date | null;
      deal_value_paise: number | null;
      deal_value_cents: number | null;
      notes: string | null;
      tags: string[];
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, matter_code, matter_name, matter_type, client_name, counterparty_name,
              governing_law_state, status, priority, health_score, lead_advocate_id, lead_attorney_id,
              target_close_date, deal_value_paise, deal_value_cents, notes, tags, created_at, updated_at
       FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Matter not found' },
      });
    }

    return { success: true, data: matter };
  });

  // PATCH /api/matters/:id
  fastify.patch('/api/matters/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = matterUpdateSchema.parse(request.body);
    const normalizedBody = { ...body } as Record<string, unknown>;
    if (body.leadAdvocateId !== undefined || body.leadAttorneyId !== undefined) {
      const resolvedLead = body.leadAdvocateId ?? body.leadAttorneyId ?? null;
      normalizedBody.leadAdvocateId = resolvedLead;
      normalizedBody.leadAttorneyId = resolvedLead;
    }
    if (body.dealValuePaise !== undefined || body.dealValueCents !== undefined) {
      const resolvedValue = body.dealValuePaise ?? body.dealValueCents ?? null;
      normalizedBody.dealValuePaise = resolvedValue;
      normalizedBody.dealValueCents = resolvedValue;
    }

    // Check matter exists and belongs to tenant
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Matter not found' },
      });
    }

    // Build dynamic update query
    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      matterCode: 'matter_code',
      matterName: 'matter_name',
      matterType: 'matter_type',
      clientName: 'client_name',
      counterpartyName: 'counterparty_name',
      governingLawState: 'governing_law_state',
      status: 'status',
      priority: 'priority',
      leadAdvocateId: 'lead_advocate_id',
      leadAttorneyId: 'lead_attorney_id',
      targetCloseDate: 'target_close_date',
      dealValuePaise: 'deal_value_paise',
      dealValueCents: 'deal_value_cents',
      notes: 'notes',
      tags: 'tags',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (normalizedBody[key] !== undefined) {
        updates.push(`${column} = $${paramIndex}`);
        values.push(normalizedBody[key]);
        paramIndex++;
      }
    }

    values.push(id, authReq.tenantId);

    await query(
      `UPDATE matters SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      values
    );

    // Log audit event
    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id, metadata)
       VALUES ($1, $2, 'matter.updated', 'matter', $3, $4)`,
      [authReq.tenantId, authReq.advocateId, id, JSON.stringify(normalizedBody)]
    );

    return { success: true };
  });

  // ============================================================
  // DOCUMENT ROUTES
  // ============================================================

  // POST /api/documents/upload
  fastify.post('/api/documents/upload', { 
    preHandler: [authenticateRequest, enforceActiveSubscription, enforceDocumentQuota] 
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_FILE', message: 'No file provided' },
      });
    }

    const matterId = (request.query as { matterId?: string }).matterId;
    if (!matterId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_MATTER_ID', message: 'Matter ID is required' },
      });
    }

    // Verify matter exists
    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [matterId, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({
        success: false,
        error: { code: 'MATTER_NOT_FOUND', message: 'Matter not found' },
      });
    }

    // Read file buffer
    const buffer = await data.toBuffer();
    const sha256Hash = (await import('./security.js')).sha256(buffer);

    // Check for duplicate
    const duplicate = await queryOne<{ id: string }>(
      `SELECT id FROM documents WHERE sha256 = $1 AND tenant_id = $2`,
      [sha256Hash, authReq.tenantId]
    );

    if (duplicate) {
      return reply.status(409).send({
        success: false,
        error: { code: 'DUPLICATE', message: 'Document already exists', documentId: duplicate.id },
      });
    }

    // Determine doc type from filename
    const filename = data.filename;
    let docType = 'other';
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('nda') || lowerFilename.includes('confidential')) docType = 'nda';
    else if (lowerFilename.includes('spa') || lowerFilename.includes('purchase')) docType = 'spa';
    else if (lowerFilename.includes('loi') || lowerFilename.includes('intent')) docType = 'loi';
    else if (lowerFilename.includes('employment')) docType = 'employment_agreement';
    else if (lowerFilename.includes('lease')) docType = 'lease';
    else if (lowerFilename.includes('amendment')) docType = 'amendment';
    else if (lowerFilename.includes('contract') || lowerFilename.includes('agreement')) docType = 'contract';

    // Insert document record
    const document = await queryOne<{ id: string }>(
      `INSERT INTO documents (tenant_id, matter_id, source_name, mime_type, doc_type, sha256, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [authReq.tenantId, matterId, filename, data.mimetype, docType, sha256Hash, authReq.advocateId]
    );

    if (!document) {
      return reply.status(500).send({
        success: false,
        error: { code: 'DOCUMENT_CREATE_FAILED', message: 'Failed to create document' },
      });
    }

    // Store file in quarantine
    const storage = await import('./storage.js');
    const fileKey = storage.generateDocumentKey(authReq.tenantId, document.id, filename, 'quarantine');
    await storage.uploadFile(fileKey, buffer, { contentType: data.mimetype });

    // Update document with file URI
    await query(
      `UPDATE documents SET file_uri = $1 WHERE id = $2`,
      [fileKey, document.id]
    );

    // Start the document processing pipeline via orchestrator
    const pipelineId = await startDocumentPipeline({
      tenantId: authReq.tenantId,
      documentId: document.id,
      matterId,
      fileUri: fileKey,
    });
    logger.info({ documentId: document.id, pipelineId }, 'Document pipeline started');

    // Track document usage for billing
    await incrementDocumentUsage(authReq.tenantId);

    return reply.status(201).send({
      success: true,
      data: {
        id: document.id,
        sourceName: filename,
        ingestionStatus: 'uploaded',
        securityStatus: 'pending',
        pipelineId,
      },
    });
  });

  // GET /api/documents/:id
  fastify.get('/api/documents/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const document = await queryOne<{
      id: string;
      matter_id: string;
      source_name: string;
      mime_type: string;
      doc_type: string;
      ingestion_status: string;
      security_status: string;
      page_count: number | null;
      word_count: number | null;
      ocr_engine: string | null;
      ocr_confidence: number | null;
      created_at: Date;
    }>(
      `SELECT id, matter_id, source_name, mime_type, doc_type, ingestion_status,
              security_status, page_count, word_count, ocr_engine, ocr_confidence, created_at
       FROM documents WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!document) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    return { success: true, data: document };
  });

  // GET /api/documents/:id/clauses
  fastify.get('/api/documents/:id/clauses', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const clauses = await query<{
      id: string;
      clause_type: string;
      heading: string | null;
      text_excerpt: string;
      page_from: number | null;
      page_to: number | null;
      risk_level: string;
      confidence: number;
      risk_factors: unknown[];
      reviewer_status: string;
    }>(
      `SELECT id, clause_type, heading, text_excerpt, page_from, page_to,
              risk_level, confidence, risk_factors, reviewer_status
       FROM clauses WHERE document_id = $1 AND tenant_id = $2
       ORDER BY page_from NULLS LAST, created_at`,
      [id, authReq.tenantId]
    );

    return { success: true, data: clauses.rows };
  });

  // GET /api/matters/:id/documents - List documents for a matter
  fastify.get('/api/matters/:id/documents', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const queryParams = request.query as { status?: string; page?: string; limit?: string };

    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found' } });
    }

    const page = Number.parseInt(queryParams.page || '1', 10);
    const limit = Math.min(Number.parseInt(queryParams.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE d.tenant_id = $1 AND d.matter_id = $2';
    const params: unknown[] = [authReq.tenantId, id];
    let paramIndex = 3;

    if (queryParams.status) {
      whereClause += ` AND d.ingestion_status = $${paramIndex}`;
      params.push(queryParams.status);
      paramIndex++;
    }

    const documents = await query<{
      id: string;
      matter_id: string;
      source_name: string;
      mime_type: string;
      doc_type: string;
      ingestion_status: string;
      security_status: string;
      page_count: number | null;
      word_count: number | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT d.id, d.matter_id, d.source_name, d.mime_type, d.doc_type, d.ingestion_status,
              d.security_status, d.page_count, d.word_count, d.created_at, d.updated_at
       FROM documents d
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM documents d ${whereClause}`,
      params
    );

    return {
      success: true,
      data: {
        documents: documents.rows,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countResult?.count || '0', 10),
          totalPages: Math.ceil(Number.parseInt(countResult?.count || '0', 10) / limit),
        },
      },
    };
  });

  // GET /api/matters/:id/clauses - List extracted clauses for a matter
  fastify.get('/api/matters/:id/clauses', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const queryParams = request.query as { clauseType?: string; riskLevel?: string; page?: string; limit?: string };

    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found' } });
    }

    const page = Number.parseInt(queryParams.page || '1', 10);
    const limit = Math.min(Number.parseInt(queryParams.limit || '50', 10), 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.tenant_id = $1 AND d.matter_id = $2';
    const params: unknown[] = [authReq.tenantId, id];
    let paramIndex = 3;

    if (queryParams.clauseType) {
      whereClause += ` AND c.clause_type = $${paramIndex}`;
      params.push(queryParams.clauseType);
      paramIndex++;
    }

    if (queryParams.riskLevel) {
      whereClause += ` AND c.risk_level = $${paramIndex}`;
      params.push(queryParams.riskLevel);
      paramIndex++;
    }

    const clauses = await query<{
      id: string;
      document_id: string;
      clause_type: string;
      heading: string | null;
      text_excerpt: string;
      page_from: number | null;
      page_to: number | null;
      risk_level: string;
      confidence: number;
      risk_factors: unknown[];
      reviewer_status: string;
      created_at: Date;
      document_name: string;
    }>(
      `SELECT c.id, c.document_id, c.clause_type, c.heading, c.text_excerpt, c.page_from, c.page_to,
              c.risk_level, c.confidence, c.risk_factors, c.reviewer_status, c.created_at,
              d.source_name as document_name
       FROM clauses c
       JOIN documents d ON c.document_id = d.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM clauses c
       JOIN documents d ON c.document_id = d.id
       ${whereClause}`,
      params
    );

    return {
      success: true,
      data: {
        clauses: clauses.rows,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countResult?.count || '0', 10),
          totalPages: Math.ceil(Number.parseInt(countResult?.count || '0', 10) / limit),
        },
      },
    };
  });

  // GET /api/matters/:id/flags - List flags for a matter
  fastify.get('/api/matters/:id/flags', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const queryParams = request.query as { status?: string; severity?: string; page?: string; limit?: string };

    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found' } });
    }

    const page = Number.parseInt(queryParams.page || '1', 10);
    const limit = Math.min(Number.parseInt(queryParams.limit || '50', 10), 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE f.tenant_id = $1 AND f.matter_id = $2';
    const params: unknown[] = [authReq.tenantId, id];
    let paramIndex = 3;

    if (queryParams.status) {
      whereClause += ` AND f.status = $${paramIndex}`;
      params.push(queryParams.status);
      paramIndex++;
    }

    if (queryParams.severity) {
      whereClause += ` AND f.severity = $${paramIndex}`;
      params.push(queryParams.severity);
      paramIndex++;
    }

    const flags = await query<{
      id: string;
      matter_id: string;
      document_id: string | null;
      clause_id: string | null;
      flag_type: string;
      severity: string;
      reason: string;
      recommended_fix: string | null;
      status: string;
      created_at: Date;
      resolution_note: string | null;
    }>(
      `SELECT f.id, f.matter_id, f.document_id, f.clause_id, f.flag_type, f.severity, f.reason,
              f.recommended_fix, f.status, f.created_at, f.resolution_note
       FROM flags f
       ${whereClause}
       ORDER BY CASE f.severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'warn' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END, f.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM flags f ${whereClause}`,
      params
    );

    return {
      success: true,
      data: {
        flags: flags.rows,
        pagination: {
          page,
          limit,
          total: Number.parseInt(countResult?.count || '0', 10),
          totalPages: Math.ceil(Number.parseInt(countResult?.count || '0', 10) / limit),
        },
      },
    };
  });

  // PATCH /api/matters/:id/flags/:flagId - Update flag review status
  fastify.patch('/api/matters/:id/flags/:flagId', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id, flagId } = request.params as { id: string; flagId: string };
    const body = z.object({
      status: z.enum(['accepted', 'rejected', 'deferred', 'open']),
      notes: z.string().optional(),
    }).parse(request.body);

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM flags WHERE id = $1 AND matter_id = $2 AND tenant_id = $3`,
      [flagId, id, authReq.tenantId]
    );

    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Flag not found' } });
    }

    const statusMap: Record<typeof body.status, 'approved' | 'rejected' | 'waived' | 'open'> = {
      accepted: 'approved',
      rejected: 'rejected',
      deferred: 'waived',
      open: 'open',
    };

    const mappedStatus = statusMap[body.status];
    const resolvedStatuses = ['approved', 'rejected', 'waived'];

    await query(
      `UPDATE flags
       SET status = $1,
           resolution_note = $2,
           resolved_by = CASE WHEN $1 = ANY($3::text[]) THEN $4 ELSE NULL END,
           resolved_at = CASE WHEN $1 = ANY($3::text[]) THEN NOW() ELSE NULL END
       WHERE id = $5 AND matter_id = $6 AND tenant_id = $7`,
      [mappedStatus, body.notes || null, resolvedStatuses, authReq.advocateId, flagId, id, authReq.tenantId]
    );

    return { success: true, data: { id: flagId, status: mappedStatus } };
  });

  // ============================================================
  // ADMIN ROUTES
  // ============================================================

  // POST /api/admin/attorneys (invite)
  fastify.post(
    '/api/admin/attorneys',
    { preHandler: [authenticateRequest, requireRoles('admin', 'partner'), enforceAdvocateLimit] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = inviteSchema.parse(request.body);

      // Check if email already exists in tenant
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM attorneys WHERE email = $1 AND tenant_id = $2`,
        [body.email.toLowerCase(), authReq.tenantId]
      );

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already exists in this organization' },
        });
      }

      // Generate invitation token
      const token = generateSecureToken(32);
      const tokenHash = hashToken(token);

      await query(
        `INSERT INTO invitations (tenant_id, email, role, token_hash, invited_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [authReq.tenantId, body.email.toLowerCase(), body.role || 'junior_advocate', tokenHash, authReq.advocateId]
      );

      // Get tenant and inviter info
      const tenant = await queryOne<{ name: string }>(
        `SELECT name FROM tenants WHERE id = $1`,
        [authReq.tenantId]
      );
      const inviter = await queryOne<{ display_name: string }>(
        `SELECT display_name FROM attorneys WHERE id = $1`,
        [authReq.advocateId]
      );

      // Send invitation email
      const inviteUrl = `${config.FRONTEND_URL}/invitation/${token}`;
      await sendInvitationEmail(
        body.email,
        inviteUrl,
        tenant?.name || 'Your Firm',
        inviter?.display_name || 'A colleague'
      );

      return reply.status(201).send({ success: true });
    }
  );

  // GET /api/admin/audit-log
  fastify.get(
    '/api/admin/audit-log',
    { preHandler: [authenticateRequest, requireRoles('admin', 'partner')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = request.query as { page?: string; limit?: string; eventType?: string };

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(Number.parseInt(queryParams.limit || '50', 10), 100);
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE tenant_id = $1';
      const params: unknown[] = [authReq.tenantId];

      if (queryParams.eventType) {
        whereClause += ' AND event_type = $2';
        params.push(queryParams.eventType);
      }

      const events = await query<{
        id: string;
        actor_advocate_id: string | null;
        event_type: string;
        object_type: string | null;
        object_id: string | null;
        ip_address: string | null;
        metadata: unknown;
        created_at: Date;
      }>(
        `SELECT id, actor_advocate_id, event_type, object_type, object_id, 
                ip_address, metadata, created_at
         FROM audit_events
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      return { success: true, data: events.rows };
    }
  );

  // ============================================================
  // RESEARCH ROUTES
  // ============================================================

  // POST /api/research/query - Standard JSON response for legal research
  fastify.post('/api/research/query', { 
    preHandler: [authenticateRequest, enforceActiveSubscription, enforceResearchQuota] 
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { question, matterId, language } = z.object({
      question: z.string().min(1).max(2000),
      matterId: z.string().uuid().optional(),
      language: supportedLanguageSchema.optional(),
    }).parse(request.body);
    const responseLanguage = language ?? 'en';

    let usageStarted = false;

    try {
      // 1. Embed the question (with caching)
      let embeddings: number[][] | null = null;
      const cacheKey = question.toLowerCase().trim();
      
      // Try cache first
      const cached = await getCachedEmbedding(cacheKey, 'sentence-transformers/LaBSE');
      if (cached) {
        assertEmbeddingDimension(cached, 'research query cache');
        embeddings = [cached];
        logger.debug('Using cached embedding for research query');
      } else {
        // Fetch from AI service
        const embedRes = await fetch(`${config.AI_SERVICE_URL}/embed`, {
          method: 'POST',
          headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ texts: [question] }),
          signal: AbortSignal.timeout(config.AI_SERVICE_TIMEOUT_MS),
        });
        
        if (!embedRes.ok) {
          throw new Error('Failed to embed question');
        }
        const result = await embedRes.json() as { embeddings?: number[][] };
        if (!result.embeddings || result.embeddings.length === 0) {
          throw new Error('No embeddings returned from AI service');
        }
        assertEmbeddingDimension(result.embeddings[0], 'research query ai-service response');
        embeddings = result.embeddings;
        
        // Cache for future use
        await cacheEmbedding(cacheKey, 'sentence-transformers/LaBSE', embeddings[0]);
      }

      if (!embeddings || embeddings.length === 0) {
        throw new Error('Missing embeddings for research query');
      }

      // 2. Search for relevant chunks
      const searchQuery = matterId
        ? `SELECT dc.id, dc.document_id, dc.text_content, dc.chunk_index, dc.page_from, dc.page_to,
                  d.source_name as document_title,
                  1 - (dc.embedding <=> $1::vector) as relevance_score
           FROM document_chunks dc
           JOIN documents d ON dc.document_id = d.id
           WHERE d.tenant_id = $2 AND d.matter_id = $3
           ORDER BY dc.embedding <=> $1::vector LIMIT 20`
        : `SELECT dc.id, dc.document_id, dc.text_content, dc.chunk_index, dc.page_from, dc.page_to,
                  d.source_name as document_title,
                  1 - (dc.embedding <=> $1::vector) as relevance_score
           FROM document_chunks dc
           JOIN documents d ON dc.document_id = d.id
           WHERE d.tenant_id = $2
           ORDER BY dc.embedding <=> $1::vector LIMIT 20`;

      const searchParams = matterId 
        ? [`[${embeddings[0].join(',')}]`, authReq.tenantId, matterId]
        : [`[${embeddings[0].join(',')}]`, authReq.tenantId];

      const chunks = await query<ResearchChunkRow>(searchQuery, searchParams);

      // 3. Build AI context for enhanced reasoning (if matter-scoped)
      let contextPrompt = '';
      if (matterId && chunks.rows.length > 0) {
        try {
          const aiContext = await buildAIContext(
            authReq.tenantId, 
            chunks.rows[0].document_id, 
            question
          );
          contextPrompt = formatContextForPrompt(aiContext);
        } catch (err) {
          logger.warn({ err }, 'Failed to build AI context, proceeding without');
        }
      }

      // 4. Call AI service for synthesis
      usageStarted = true;
      const aiResponse = await fetch(`${config.AI_SERVICE_URL}/research`, {
        method: 'POST',
        headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
          query: question,
          chunks: chunks.rows.map((c, index) => ({
            chunk_id: c.id,
            document_id: c.document_id,
            document_name: c.document_title,
            text: c.text_content,
            page_number: c.page_from ?? c.page_to ?? null,
            relevance_score: Number(c.relevance_score) || 0,
            source_type: 'tenant_document',
            source_verified: true,
            rank: index + 1,
            language: responseLanguage,
          })),
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
        `INSERT INTO research_history (tenant_id, matter_id, attorney_id, question, answer, citations, sources_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          authReq.tenantId, 
          matterId || null, 
          authReq.advocateId, 
          question, 
          result.answer, 
          JSON.stringify(result.citations || []),
          chunks.rows.length
        ]
      );

      return {
        success: true, 
        data: {
          answer: result.answer,
          citations: result.citations || [],
          sources: chunks.rows.map((c) => ({
            documentId: c.document_id,
            title: c.document_title,
            relevance: c.relevance_score,
            pageFrom: c.page_from,
            pageTo: c.page_to,
            snippet: c.text_content.slice(0, 200)
          })),
           confidence: result.confidence || 0.85
         }
       };
    } catch (error) {
      logger.error({ error }, 'Research query failed');
      return reply.status(500).send({
        success: false,
        error: { code: 'RESEARCH_FAILED', message: 'Research query failed' }
      });
      } finally {
        if (usageStarted) {
          await incrementResearchUsage(authReq.tenantId).catch((e) => {
            logger.error({ e }, 'Failed to track research usage on /query');
          });
        }
      }
  });

  // POST /api/research/stream - SSE streaming response for legal research
  fastify.post('/api/research/stream', { 
    preHandler: [authenticateRequest, enforceActiveSubscription, enforceResearchQuota] 
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { query: question, matterId, language } = z.object({
      query: z.string().min(1).max(2000),
      matterId: z.string().uuid().nullable().optional(),
      language: supportedLanguageSchema.optional(),
    }).parse(request.body);
    const responseLanguage = language ?? 'en';

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Track whether stream actually started (for billing accuracy)
    let streamStarted = false;

    try {
      // 1. Embed question with caching
      let embeddings: number[][] | null = null;
      const cacheKey = question.toLowerCase().trim();
      
      const cached = await getCachedEmbedding(cacheKey, 'sentence-transformers/LaBSE');
      if (cached) {
        assertEmbeddingDimension(cached, 'research stream cache');
        embeddings = [cached];
        logger.debug('Using cached embedding for research stream');
      } else {
        const embedRes = await fetch(`${config.AI_SERVICE_URL}/embed`, {
          method: 'POST',
          headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ texts: [question] }),
        });
        const result = await embedRes.json() as { embeddings?: number[][] };
        if (!result.embeddings || result.embeddings.length === 0) {
          throw new Error('No embeddings returned from AI service');
        }
        assertEmbeddingDimension(result.embeddings[0], 'research stream ai-service response');
        embeddings = result.embeddings;
        await cacheEmbedding(cacheKey, 'sentence-transformers/LaBSE', embeddings[0]);
      }

      if (!embeddings || embeddings.length === 0) {
        throw new Error('Missing embeddings for research stream');
      }

      // 2. Search for relevant chunks
      const searchQuery = matterId
        ? `SELECT dc.id, dc.document_id, dc.text_content, dc.chunk_index, dc.page_from, dc.page_to,
                  d.source_name as document_title,
                  1 - (dc.embedding <=> $1::vector) as relevance_score
           FROM document_chunks dc
           JOIN documents d ON dc.document_id = d.id
           WHERE d.tenant_id = $2 AND d.matter_id = $3
           ORDER BY dc.embedding <=> $1::vector LIMIT 20`
        : `SELECT dc.id, dc.document_id, dc.text_content, dc.chunk_index, dc.page_from, dc.page_to,
                  d.source_name as document_title,
                  1 - (dc.embedding <=> $1::vector) as relevance_score
           FROM document_chunks dc
           JOIN documents d ON dc.document_id = d.id
           WHERE d.tenant_id = $2
           ORDER BY dc.embedding <=> $1::vector LIMIT 20`;

      const searchParams = matterId 
        ? [`[${embeddings[0].join(',')}]`, authReq.tenantId, matterId]
        : [`[${embeddings[0].join(',')}]`, authReq.tenantId];

      const chunks = await query<ResearchChunkRow>(searchQuery, searchParams);

      // 3. Send sources immediately
      sendEvent({ 
        type: 'sources', 
        sources: chunks.rows.map((c) => ({ 
          documentId: c.document_id, 
          title: c.document_title, 
          relevance: c.relevance_score, 
          pageFrom: c.page_from,
          pageTo: c.page_to,
          snippet: c.text_content.slice(0, 200) 
        })) 
      });

      // Mark stream as started (AI service call begins now)
      streamStarted = true;

      // 4. Stream synthesis from AI service (SSE)
      const aiResponse = await fetch(`${config.AI_SERVICE_URL}/research`, {
        method: 'POST',
        headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
          query: question, 
          chunks: chunks.rows.map((c, index) => ({
            chunk_id: c.id,
            document_id: c.document_id,
            document_name: c.document_title,
            text: c.text_content,
            page_number: c.page_from ?? c.page_to ?? null,
            relevance_score: Number(c.relevance_score) || 0,
            source_type: 'tenant_document',
            source_verified: true,
            rank: index + 1,
            language: responseLanguage,
          })),
          language: responseLanguage,
          stream: true 
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
          logger.debug({ eventError, dataPayload }, 'Ignoring malformed AI stream event');
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
        `INSERT INTO research_history (tenant_id, matter_id, attorney_id, question, answer, citations, sources_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          authReq.tenantId,
          matterId || null,
          authReq.advocateId,
          question,
          fullAnswer,
          JSON.stringify(citationsPayload),
          chunks.rows.length,
        ]
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
  });

  // GET /api/research/history - Get research history
  fastify.get('/api/research/history', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { matterId, limit = '20' } = request.query as { matterId?: string; limit?: string };
    
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
  });

  // GET /api/research/indiankanoon - Proxy/fallback legal case search
  fastify.get('/api/research/indiankanoon', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { q, limit = '20' } = z.object({
      q: z.string().min(2),
      limit: z.string().optional(),
    }).parse(request.query);

    const limitNum = Math.min(Math.max(Number.parseInt(limit || '20', 10) || 20, 1), 50);
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
      [authReq.tenantId, likeQuery, limitNum]
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
          'IndiaKanoon upstream request failed, returning tenant-local fallback results'
        );
      } catch (error) {
        logger.warn({ error }, 'IndiaKanoon upstream request threw, returning tenant-local fallback results');
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
  });

  // ============================================================
  // INDIA LEGAL OPERATIONS ROUTES
  // ============================================================

  // GET /api/bare-acts
  fastify.get('/api/bare-acts', { preHandler: authenticateRequest }, async (request) => {
    const queryParams = z.object({
      language: supportedLanguageSchema.optional(),
      search: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    }).parse(request.query);

    const limitNum = Math.min(Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1), 200);
    const offsetNum = Math.max(Number.parseInt(queryParams.offset || '0', 10) || 0, 0);
    const params: unknown[] = [];
    let whereClause = 'WHERE is_active = TRUE';

    if (queryParams.language) {
      params.push(queryParams.language);
      whereClause += ` AND language = $${params.length}`;
    }
    if (queryParams.search) {
      params.push(`%${queryParams.search.trim()}%`);
      whereClause += ` AND (title ILIKE $${params.length} OR short_title ILIKE $${params.length})`;
    }

    params.push(limitNum, offsetNum);
    const rows = await query<{
      id: string;
      title: string;
      short_title: string;
      year: number;
      act_number: string | null;
      jurisdiction: string;
      language: string;
      full_text_url: string | null;
    }>(
      `SELECT id, title, short_title, year, act_number, jurisdiction, language, full_text_url
       FROM bare_acts
       ${whereClause}
       ORDER BY year DESC, title ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      success: true,
      data: rows.rows.map((act) => ({
        id: act.id,
        slug: toActSlug(act.short_title || act.title),
        title: act.title,
        shortTitle: act.short_title,
        year: act.year,
        actNumber: act.act_number,
        jurisdiction: act.jurisdiction,
        language: act.language,
        fullTextUrl: act.full_text_url,
      })),
    };
  });

  // GET /api/bare-acts/:slug
  fastify.get('/api/bare-acts/:slug', { preHandler: authenticateRequest }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const normalizedSlug = slug.trim().toLowerCase();

    const act = await queryOne<{
      id: string;
      title: string;
      short_title: string;
      year: number;
      act_number: string | null;
      jurisdiction: string;
      language: string;
      full_text_url: string | null;
    }>(
      `SELECT id, title, short_title, year, act_number, jurisdiction, language, full_text_url
       FROM bare_acts
       WHERE is_active = TRUE
         AND (
           id::text = $1
           OR lower(regexp_replace(COALESCE(short_title, title), '[^a-z0-9]+', '-', 'g')) = $1
         )
       LIMIT 1`,
      [normalizedSlug]
    );

    if (!act) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ACT_NOT_FOUND', message: 'Bare act not found' },
      });
    }

    const sections = await query<{
      id: string;
      section_number: string;
      section_title: string | null;
      section_text: string;
      subsections: unknown;
      cross_references: string[] | null;
      tags: string[] | null;
    }>(
      `SELECT id, section_number, section_title, section_text, subsections, cross_references, tags
       FROM bare_act_sections
       WHERE act_id = $1
       ORDER BY section_number ASC`,
      [act.id]
    );

    return {
      success: true,
      data: {
        id: act.id,
        slug: toActSlug(act.short_title || act.title),
        title: act.title,
        shortTitle: act.short_title,
        year: act.year,
        actNumber: act.act_number,
        jurisdiction: act.jurisdiction,
        language: act.language,
        fullTextUrl: act.full_text_url,
        sections: sections.rows.map((section) => ({
          id: section.id,
          sectionNumber: section.section_number,
          sectionTitle: section.section_title,
          sectionText: section.section_text,
          subsections: section.subsections ?? [],
          crossReferences: section.cross_references ?? [],
          tags: section.tags ?? [],
        })),
      },
    };
  });

  // GET /api/court-cases
  fastify.get('/api/court-cases', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const queryParams = z.object({
      matterId: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.string().optional(),
    }).parse(request.query);

    const limitNum = Math.min(Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1), 200);
    const params: unknown[] = [authReq.tenantId];
    let whereClause = 'WHERE tenant_id = $1';

    if (queryParams.matterId) {
      params.push(queryParams.matterId);
      whereClause += ` AND matter_id = $${params.length}`;
    }
    if (queryParams.status) {
      params.push(queryParams.status);
      whereClause += ` AND current_status = $${params.length}`;
    }

    params.push(limitNum);

    const rows = await query<{
      id: string;
      matter_id: string | null;
      cnr_number: string;
      court_name: string;
      court_complex: string | null;
      case_type: string | null;
      filing_date: string | null;
      current_status: string | null;
      next_hearing_date: string | null;
      last_synced_at: string | null;
      created_at: string;
    }>(
      `SELECT id, matter_id, cnr_number, court_name, court_complex, case_type,
              filing_date, current_status, next_hearing_date, last_synced_at, created_at
       FROM court_cases
       ${whereClause}
       ORDER BY next_hearing_date ASC NULLS LAST, created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return { success: true, data: rows.rows };
  });

  // POST /api/court-cases
  fastify.post('/api/court-cases', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = z.object({
      matterId: z.string().uuid().optional(),
      cnrNumber: z.string().min(6).max(64),
      courtName: z.string().min(2).max(200),
      courtComplex: z.string().max(200).optional(),
      caseType: z.string().max(120).optional(),
      filingDate: z.string().optional(),
      currentStatus: z.string().max(120).optional(),
      nextHearingDate: z.string().optional(),
    }).parse(request.body);

    try {
      const created = await queryOne<{ id: string }>(
        `INSERT INTO court_cases (
           tenant_id, matter_id, cnr_number, court_name, court_complex,
           case_type, filing_date, current_status, next_hearing_date, last_synced_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9::timestamptz, NOW())
         RETURNING id`,
        [
          authReq.tenantId,
          body.matterId || null,
          body.cnrNumber.trim().toUpperCase(),
          body.courtName.trim(),
          body.courtComplex || null,
          body.caseType || null,
          body.filingDate || null,
          body.currentStatus || 'pending_sync',
          body.nextHearingDate || null,
        ]
      );

      return reply.status(201).send({
        success: true,
        data: { id: created?.id, syncStatus: 'pending' },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === '23505') {
        return reply.status(409).send({
          success: false,
          error: { code: 'CNR_EXISTS', message: 'Court case with this CNR already exists' },
        });
      }
      throw error;
    }
  });

  // GET /api/hearings
  fastify.get('/api/hearings', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const queryParams = z.object({
      matterId: z.string().uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.string().optional(),
    }).parse(request.query);

    const limitNum = Math.min(Math.max(Number.parseInt(queryParams.limit || '100', 10) || 100, 1), 500);
    const params: unknown[] = [authReq.tenantId];
    let whereClause = 'WHERE hd.tenant_id = $1';

    if (queryParams.matterId) {
      params.push(queryParams.matterId);
      whereClause += ` AND hd.matter_id = $${params.length}`;
    }
    if (queryParams.from) {
      params.push(queryParams.from);
      whereClause += ` AND hd.hearing_date >= $${params.length}::timestamptz`;
    }
    if (queryParams.to) {
      params.push(queryParams.to);
      whereClause += ` AND hd.hearing_date <= $${params.length}::timestamptz`;
    }

    params.push(limitNum);

    const rows = await query<{
      id: string;
      court_case_id: string;
      matter_id: string | null;
      hearing_date: string;
      purpose: string | null;
      result: string | null;
      next_date: string | null;
      notes: string | null;
      cnr_number: string | null;
      court_name: string | null;
      current_status: string | null;
    }>(
      `SELECT hd.id, hd.court_case_id, hd.matter_id, hd.hearing_date, hd.purpose,
              hd.result, hd.next_date, hd.notes,
              cc.cnr_number, cc.court_name, cc.current_status
       FROM hearing_dates hd
       LEFT JOIN court_cases cc ON cc.id = hd.court_case_id
       ${whereClause}
       ORDER BY hd.hearing_date ASC
       LIMIT $${params.length}`,
      params
    );

    return { success: true, data: rows.rows };
  });

  // GET /api/invoices
  fastify.get('/api/invoices', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const queryParams = z.object({
      status: z.string().optional(),
      limit: z.string().optional(),
    }).parse(request.query);

    const limitNum = Math.min(Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1), 200);
    const params: unknown[] = [authReq.tenantId];
    let whereClause = 'WHERE tenant_id = $1';

    if (queryParams.status) {
      params.push(queryParams.status);
      whereClause += ` AND status = $${params.length}`;
    }

    params.push(limitNum);

    const rows = await query<{
      id: string;
      matter_id: string | null;
      client_name: string;
      client_gstin: string | null;
      firm_gstin: string | null;
      invoice_number: string;
      issue_date: string;
      due_date: string;
      subtotal_paise: string;
      gst_rate: string;
      gst_amount_paise: string;
      total_paise: string;
      status: string;
      razorpay_payment_id: string | null;
      created_at: string;
    }>(
      `SELECT id, matter_id, client_name, client_gstin, firm_gstin, invoice_number,
              issue_date, due_date, subtotal_paise, gst_rate, gst_amount_paise,
              total_paise, status, razorpay_payment_id, created_at
       FROM invoices
       ${whereClause}
       ORDER BY issue_date DESC, created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return { success: true, data: rows.rows };
  });

  // POST /api/invoices
  fastify.post('/api/invoices', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = z.object({
      matterId: z.string().uuid().optional(),
      clientName: z.string().min(2).max(200),
      clientGstin: z.string().max(32).optional(),
      invoiceNumber: z.string().max(64).optional(),
      issueDate: z.string().optional(),
      dueDate: z.string(),
      gstRate: z.number().min(0).max(40).optional(),
      status: z.enum(['draft', 'issued', 'paid', 'void']).optional(),
      lineItems: z.array(z.object({
        description: z.string().min(1).max(500),
        quantity: z.number().positive().default(1),
        unitAmountPaise: z.number().int().positive(),
      })).min(1),
    }).parse(request.body);

    const issueDate = body.issueDate || new Date().toISOString().slice(0, 10);
    const invoiceNumber = body.invoiceNumber?.trim() || `INV-${issueDate.replace(/-/g, '')}-${generateSecureToken(3).toUpperCase()}`;
    const gstRate = body.gstRate ?? config.GST_RATE;
    const subtotalPaise = body.lineItems.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitAmountPaise),
      0
    );
    const gstAmountPaise = Math.round((subtotalPaise * gstRate) / 100);
    const totalPaise = subtotalPaise + gstAmountPaise;

    try {
      const created = await withTransaction(async (tx) => {
        const invoice = await tx.queryOne<{ id: string }>(
          `INSERT INTO invoices (
             tenant_id, matter_id, client_name, client_gstin, firm_gstin, invoice_number,
             issue_date, due_date, subtotal_paise, gst_rate, gst_amount_paise, total_paise, status, created_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10, $11, $12, $13, $14)
           RETURNING id`,
          [
            authReq.tenantId,
            body.matterId || null,
            body.clientName,
            body.clientGstin || null,
            config.FIRM_GSTIN || null,
            invoiceNumber,
            issueDate,
            body.dueDate,
            subtotalPaise,
            gstRate,
            gstAmountPaise,
            totalPaise,
            body.status || 'draft',
            authReq.advocateId,
          ]
        );

        for (const item of body.lineItems) {
          const lineTotal = Math.round(item.quantity * item.unitAmountPaise);
          await tx.query(
            `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_amount_paise, total_amount_paise)
             VALUES ($1, $2, $3, $4, $5)`,
            [invoice?.id, item.description, item.quantity, item.unitAmountPaise, lineTotal]
          );
        }

        await tx.query(
          `INSERT INTO gst_details (
             invoice_id, sac_code, gst_rate, taxable_amount_paise, cgst_amount_paise, sgst_amount_paise, igst_amount_paise
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoice?.id,
            '998212',
            gstRate,
            subtotalPaise,
            Math.round(gstAmountPaise / 2),
            Math.round(gstAmountPaise / 2),
            0,
          ]
        );

        return invoice;
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: created?.id,
          invoiceNumber,
          subtotalPaise,
          gstAmountPaise,
          totalPaise,
          status: body.status || 'draft',
        },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === '23505') {
        return reply.status(409).send({
          success: false,
          error: { code: 'INVOICE_NUMBER_EXISTS', message: 'Invoice number already exists for this tenant' },
        });
      }
      throw error;
    }
  });

  // GET /api/dpdp/requests
  fastify.get('/api/dpdp/requests', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const rows = await query<{
      id: string;
      advocate_id: string | null;
      request_type: string;
      status: string;
      details: string | null;
      resolved_at: string | null;
      created_at: string;
    }>(
      `SELECT id, advocate_id, request_type, status, details, resolved_at, created_at
       FROM dpdp_requests
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [authReq.tenantId]
    );

    return { success: true, data: rows.rows };
  });

  // POST /api/dpdp/consent
  fastify.post('/api/dpdp/consent', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = z.object({
      accepted: z.boolean(),
      version: z.string().optional(),
      details: z.string().max(1000).optional(),
    }).parse(request.body);

    if (!body.accepted) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CONSENT_REQUIRED', message: 'DPDP consent must be accepted' },
      });
    }

    const consentVersion = body.version || config.DPDP_CONSENT_VERSION;
    const detailPayload = JSON.stringify({
      consentVersion,
      details: body.details || null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
    });

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE tenants
         SET dpdp_consent_given_at = NOW(),
             dpdp_consent_ip = $2::inet
         WHERE id = $1`,
        [authReq.tenantId, request.ip]
      );
      await tx.query(
        `INSERT INTO dpdp_requests (tenant_id, advocate_id, request_type, status, details, resolved_at)
         VALUES ($1, $2, 'consent', 'resolved', $3, NOW())`,
        [authReq.tenantId, authReq.advocateId, detailPayload]
      );
    });

    return {
      success: true,
      data: {
        accepted: true,
        version: consentVersion,
        consentedAt: new Date().toISOString(),
      },
    };
  });

  // ============================================================
  // ANALYTICS ROUTES
  // ============================================================

  // GET /api/analytics/firm
  fastify.get(
    '/api/analytics/firm',
    { preHandler: [authenticateRequest, requireRoles('admin', 'partner')] },
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
        [authReq.tenantId]
      );

      // Get flag distribution by severity
      const flagDistribution = await query<{ severity: string; count: number }>(
        `SELECT severity, COUNT(*) as count
         FROM flags WHERE tenant_id = $1 AND status = 'open'
         GROUP BY severity`,
        [authReq.tenantId]
      );

      // Get clause type distribution
      const clauseDistribution = await query<{ clause_type: string; count: number }>(
        `SELECT clause_type, COUNT(*) as count
         FROM clauses WHERE tenant_id = $1
         GROUP BY clause_type
         ORDER BY count DESC
         LIMIT 10`,
        [authReq.tenantId]
      );

      return {
        success: true,
        data: {
          metrics,
          flagDistribution: flagDistribution.rows,
          clauseDistribution: clauseDistribution.rows,
        },
      };
    }
  );

  // ============================================================
  // BILLING ROUTES
  // ============================================================

  // GET /billing/status - Get billing status
  fastify.get(
    '/billing/status',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;

      const { getBillingStatus } = await import('./billing.js');
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
    }
  );

  // POST /billing/checkout - Create checkout session
  fastify.post(
    '/billing/checkout',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z.object({
        plan: z.enum(['starter', 'growth', 'professional', 'enterprise']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }).parse(request.body);

      // Integration with Razorpay via billing module
      try {
        const { createCheckoutSession } = await import('./billing.js');
        const billingContact = await queryOne<{ email: string; firm_name: string }>(
          `SELECT a.email, t.name as firm_name
           FROM attorneys a
           JOIN tenants t ON t.id = a.tenant_id
           WHERE a.id = $1 AND a.tenant_id = $2`,
          [authReq.advocateId, authReq.tenantId]
        );

        if (!billingContact) {
          return reply.status(404).send({ success: false, error: { message: 'Billing contact not found' } });
        }

        const session = await createCheckoutSession(
          authReq.tenantId,
          billingContact.email,
          billingContact.firm_name,
          body.plan,
          body.successUrl,
          body.cancelUrl
        );
        return { success: true, data: { sessionUrl: session.url } };
      } catch (error) {
        logger.error({ error }, 'Failed to create checkout session');
        return reply.status(500).send({ success: false, error: { message: 'Billing service unavailable' } });
      }
    }
  );

  // GET /quota/check - Check quota status
  fastify.get(
    '/quota/check',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { type } = request.query as { type?: 'document' | 'research' };
      const quotaType: 'document' | 'research' = type === 'research' ? 'research' : 'document';

      try {
        const { checkQuota } = await import('./billing.js');
        const quotaStatus = await checkQuota(authReq.tenantId, quotaType);
        return { success: true, data: quotaStatus };
      } catch (error) {
        return reply.status(500).send({ success: false, error: { message: 'Quota check failed' } });
      }
    }
  );

  // ============================================================
  // LEGAL RULES ROUTES
  // ============================================================

  // GET /legal-rules/:state - Get rules for a state
  fastify.get(
    '/legal-rules/:state',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const { state } = request.params as { state: string };

      try {
        const { getRulesForState, INDIAN_JURISDICTIONS } = await import('./legal-rules.js');
        
        if (!INDIAN_JURISDICTIONS.some((jurisdiction: { code: string }) => jurisdiction.code === state.toUpperCase())) {
          return reply.status(400).send({ success: false, error: { message: 'Invalid state code' } });
        }

        const rules = getRulesForState(state.toUpperCase());
        return { success: true, data: rules };
      } catch (error) {
        return reply.status(500).send({ success: false, error: { message: 'Failed to get legal rules' } });
      }
    }
  );

  // GET /legal-rules/:state/:clauseType - Get specific clause rules for state
  fastify.get(
    '/legal-rules/:state/:clauseType',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const { state, clauseType } = request.params as { state: string; clauseType: string };

      try {
        const { getRulesForState } = await import('./legal-rules.js');
        const rules = getRulesForState(state.toUpperCase());
        const clauseRule = rules.find(r => r.clauseType === clauseType);
        
        if (!clauseRule) {
          return reply.status(404).send({ success: false, error: { message: 'No specific rule for this clause type' } });
        }

        return { success: true, data: clauseRule };
      } catch (error) {
        return reply.status(500).send({ success: false, error: { message: 'Failed to get legal rules' } });
      }
    }
  );

  // POST /legal-rules/check - Check clause compliance
  fastify.post(
    '/legal-rules/check',
    { preHandler: [authenticateRequest] },
    async (request, reply) => {
      const body = z.object({
        clauseType: z.string(),
        text: z.string(),
        jurisdiction: z.string().optional(),
        jurisdictions: z.array(z.string()).optional(),
        metadata: z.record(z.any()).optional(),
      }).parse(request.body);

      try {
        const { checkClauseCompliance } = await import('./legal-rules.js');
        const result = checkClauseCompliance(
          body.clauseType,
          body.text,
          body.jurisdiction || 'DL'
        );
        return { success: true, data: result };
      } catch (error) {
        return reply.status(500).send({ success: false, error: { message: 'Compliance check failed' } });
      }
    }
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
        const { getJobStatus } = await import('./worker.js');
        
        // Try each queue type
        const queues = ['document', 'clause', 'risk', 'obligation'];
        for (const queue of queues) {
          const status = await getJobStatus(queue, id);
          if (status) {
            return { success: true, data: status };
          }
        }

        return reply.status(404).send({ success: false, error: { message: 'Job not found' } });
      } catch (error) {
        return reply.status(500).send({ success: false, error: { message: 'Failed to get job status' } });
      }
    }
  );

  // ============================================================
  // DOCUMENT ADDITIONAL ROUTES
  // ============================================================

  // POST /api/documents/:id/suggest - Get AI redline suggestions
  fastify.post('/api/documents/:id/suggest', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = z.object({
      clauseType: z.string().optional(),
      jurisdiction: z.string().optional(),
    }).parse(request.body);

    // Verify document access
    const document = await queryOne<{ id: string; matter_id: string }>(
      `SELECT id, matter_id FROM documents WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!document) {
      return reply.status(404).send({ success: false, error: { message: 'Document not found' } });
    }

    try {
      const response = await fetch(`${config.AI_SERVICE_URL}/suggest-redline`, {
        method: 'POST',
        headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          documentId: id,
          tenantId: authReq.tenantId,
          clauseType: body.clauseType,
          jurisdiction: body.jurisdiction,
        }),
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const suggestions = await response.json();
      return { success: true, data: suggestions };
    } catch (error) {
      logger.error({ error }, 'Failed to get AI suggestions');
      return reply.status(500).send({ success: false, error: { message: 'Failed to generate suggestions' } });
    }
  });

  // POST /api/documents/:id/export - Export document as DOCX
  fastify.post('/api/documents/:id/export', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = z.object({
      format: z.enum(['docx', 'pdf']).default('docx'),
      includeRedlines: z.boolean().default(true),
      includeComments: z.boolean().default(true),
    }).parse(request.body);

    const document = await queryOne<{ id: string; source_name: string; file_uri: string }>(
      `SELECT id, source_name, file_uri FROM documents WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!document) {
      return reply.status(404).send({ success: false, error: { message: 'Document not found' } });
    }

    // For now, return download URL to original file
    // Full implementation would generate DOCX with redlines
    const storage = await import('./storage.js');
    const url = await storage.getSignedDownloadUrl(document.file_uri, 3600);

    return { success: true, data: { downloadUrl: url, format: body.format } };
  });

  // GET /api/documents/:id/flags - Get flags for a document
  fastify.get('/api/documents/:id/flags', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const documentFlags = await query<{
      id: string;
      severity: string;
      flag_type: string;
      reason: string;
      clause_id: string | null;
      recommended_fix: string | null;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, severity, flag_type, reason, clause_id, recommended_fix, status, created_at
        FROM flags WHERE document_id = $1 AND tenant_id = $2
         ORDER BY CASE severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'warn' THEN 3
           WHEN 'low' THEN 4
           ELSE 5
         END`,
      [id, authReq.tenantId]
    );

    return { success: true, data: documentFlags.rows };
  });

  // GET /api/documents/:id/obligations - Get obligations from a document
  fastify.get('/api/documents/:id/obligations', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const documentObligations = await query<{
      id: string;
      obligation_type: string;
      description: string;
      responsible_party: string;
      deadline: Date | null;
      status: string;
      priority: string;
    }>(
      `SELECT id, obligation_type, description, responsible_party, deadline, status, priority
       FROM obligations WHERE document_id = $1 AND tenant_id = $2
       ORDER BY deadline NULLS LAST`,
      [id, authReq.tenantId]
    );

    return { success: true, data: documentObligations.rows };
  });

  // ============================================================
  // MATTER ADDITIONAL ROUTES
  // ============================================================

  // DELETE /api/matters/:id - Delete/archive matter
  fastify.delete('/api/matters/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const existing = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!existing) {
      return reply.status(404).send({ success: false, error: { message: 'Matter not found' } });
    }

    // Soft delete - set to archived
    await query(
      `UPDATE matters SET status = 'archived', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id)
       VALUES ($1, $2, 'matter.archived', 'matter', $3)`,
      [authReq.tenantId, authReq.advocateId, id]
    );

    return { success: true };
  });

  // GET /api/matters/:id/timeline - Get matter timeline events
  fastify.get('/api/matters/:id/timeline', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const queryParams = request.query as { limit?: string };
    const limit = Math.min(Number.parseInt(queryParams.limit || '50', 10), 100);

    const timeline = await query<{
      id: string;
      event_type: string;
      object_type: string | null;
      object_id: string | null;
      actor_advocate_id: string | null;
      metadata: unknown;
      created_at: Date;
    }>(
      `SELECT ae.id, ae.event_type, ae.object_type, ae.object_id, ae.actor_advocate_id, ae.metadata, ae.created_at
       FROM audit_events ae
       WHERE ae.tenant_id = $1 AND (
         (ae.object_type = 'matter' AND ae.object_id = $2) OR
         ae.object_id IN (SELECT id::text FROM documents WHERE matter_id = $2) OR
         ae.object_id IN (SELECT id::text FROM flags WHERE matter_id = $2)
       )
       ORDER BY ae.created_at DESC
       LIMIT $3`,
      [authReq.tenantId, id, limit]
    );

    return { success: true, data: timeline.rows };
  });

  // GET /api/matters/:id/analytics - Get matter-specific analytics
  fastify.get('/api/matters/:id/analytics', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    // Verify matter exists
    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { message: 'Matter not found' } });
    }

    const analytics = await queryOne<{
      total_documents: number;
      processed_documents: number;
      total_clauses: number;
      total_flags: number;
      open_flags: number;
      critical_flags: number;
      high_flags: number;
      medium_flags: number;
      low_flags: number;
      total_obligations: number;
      overdue_obligations: number;
    }>(
      `SELECT 
         (SELECT COUNT(*) FROM documents WHERE matter_id = $1 AND tenant_id = $2) as total_documents,
         (SELECT COUNT(*) FROM documents WHERE matter_id = $1 AND tenant_id = $2 AND ingestion_status = 'normalized') as processed_documents,
         (SELECT COUNT(*)
          FROM clauses c
          JOIN documents d ON c.document_id = d.id
          WHERE d.matter_id = $1 AND c.tenant_id = $2) as total_clauses,
         (SELECT COUNT(*) FROM flags WHERE matter_id = $1 AND tenant_id = $2) as total_flags,
         (SELECT COUNT(*) FROM flags WHERE matter_id = $1 AND tenant_id = $2 AND status = 'open') as open_flags,
         (SELECT COUNT(*) FROM flags WHERE matter_id = $1 AND tenant_id = $2 AND status = 'open' AND severity = 'critical') as critical_flags,
         (SELECT COUNT(*) FROM flags WHERE matter_id = $1 AND tenant_id = $2 AND status = 'open' AND severity = 'high') as high_flags,
         (SELECT COUNT(*) FROM flags WHERE matter_id = $1 AND tenant_id = $2 AND status = 'open' AND severity = 'medium') as medium_flags,
         (SELECT COUNT(*) FROM flags WHERE matter_id = $1 AND tenant_id = $2 AND status = 'open' AND severity = 'low') as low_flags,
         (SELECT COUNT(*) FROM obligations WHERE matter_id = $1 AND tenant_id = $2) as total_obligations,
         (SELECT COUNT(*) FROM obligations WHERE matter_id = $1 AND tenant_id = $2 AND status = 'overdue') as overdue_obligations`,
      [id, authReq.tenantId]
    );

    return {
      success: true,
      data: {
        totalDocuments: analytics?.total_documents || 0,
        processedDocuments: analytics?.processed_documents || 0,
        processingQueue: (analytics?.total_documents || 0) - (analytics?.processed_documents || 0),
        totalClauses: analytics?.total_clauses || 0,
        totalFlags: analytics?.total_flags || 0,
        openFlags: analytics?.open_flags || 0,
        flagsByRisk: {
          critical: analytics?.critical_flags || 0,
          high: analytics?.high_flags || 0,
          medium: analytics?.medium_flags || 0,
          low: analytics?.low_flags || 0,
        },
        totalObligations: analytics?.total_obligations || 0,
        overdueObligations: analytics?.overdue_obligations || 0,
      },
    };
  });

  // POST /api/matters/:id/share-links - Create client portal share link
  fastify.post('/api/matters/:id/share-links', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = z.object({
      accessLevel: z.enum(['read', 'comment']).default('read'),
      expiresInDays: z.number().min(1).max(90).default(7),
      maxViews: z.number().min(1).max(1000).optional(),
      watermarkText: z.string().optional(),
    }).parse(request.body);

    // Verify matter exists
    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { message: 'Matter not found' } });
    }

    const token = generateSecureToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);

    const shareLink = await queryOne<{ id: string }>(
      `INSERT INTO share_links (tenant_id, matter_id, token_hash, access_level, watermark_text, expires_at, max_views, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [authReq.tenantId, id, tokenHash, body.accessLevel, body.watermarkText || null, expiresAt, body.maxViews || 50, authReq.advocateId]
    );

    const portalUrl = `${config.FRONTEND_URL}/portal/${token}`;

    return reply.status(201).send({
      success: true,
      data: {
        id: shareLink?.id,
        url: portalUrl,
        expiresAt,
        accessLevel: body.accessLevel,
      },
    });
  });

  // GET /api/portal/:shareToken - Resolve a public client portal share token
  fastify.get('/api/portal/:shareToken', async (request, reply) => {
    const { shareToken } = request.params as { shareToken: string };
    const tokenHash = hashToken(shareToken);

    const shareLink = await queryOne<{
      id: string;
      tenant_id: string;
      matter_id: string;
      access_level: 'read' | 'comment';
      expires_at: Date;
      max_views: number | null;
      view_count: number;
      matter_name: string;
      notes: string | null;
      client_name: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT sl.id, sl.tenant_id, sl.matter_id, sl.access_level, sl.expires_at, sl.max_views, sl.view_count,
              m.matter_name, m.notes, m.client_name, m.status, m.created_at
       FROM share_links sl
       JOIN matters m ON sl.matter_id = m.id
       WHERE sl.token_hash = $1`,
      [tokenHash]
    );

    if (!shareLink) {
      return reply.status(404).send({ success: false, error: { message: 'Invalid shared link' } });
    }

    if (new Date(shareLink.expires_at).getTime() < Date.now()) {
      return reply.status(410).send({ success: false, error: { message: 'Shared link has expired' } });
    }

    if (shareLink.max_views !== null && shareLink.view_count >= shareLink.max_views) {
      return reply.status(410).send({ success: false, error: { message: 'Shared link view limit reached' } });
    }

    await query(`UPDATE share_links SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`, [shareLink.id]);

    const documents = await query<{
      id: string;
      source_name: string;
      doc_type: string;
      word_count: number | null;
      created_at: Date;
    }>(
      `SELECT id, source_name, doc_type, word_count, created_at
       FROM documents
       WHERE tenant_id = $1 AND matter_id = $2
       ORDER BY created_at DESC`,
      [shareLink.tenant_id, shareLink.matter_id]
    );

    const clauses = await query<{
      id: string;
      clause_type: string;
      text_excerpt: string;
      document_name: string;
    }>(
      `SELECT c.id, c.clause_type, c.text_excerpt, d.source_name as document_name
       FROM clauses c
       JOIN documents d ON c.document_id = d.id
       WHERE c.tenant_id = $1 AND d.matter_id = $2
       ORDER BY c.created_at DESC
       LIMIT 200`,
      [shareLink.tenant_id, shareLink.matter_id]
    );

    const flags = await query<{
      id: string;
      flag_type: string;
      severity: string;
      reason: string;
      document_name: string | null;
    }>(
      `SELECT f.id, f.flag_type, f.severity, f.reason, d.source_name as document_name
       FROM flags f
       LEFT JOIN documents d ON f.document_id = d.id
       WHERE f.tenant_id = $1 AND f.matter_id = $2
       ORDER BY CASE f.severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'warn' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END, f.created_at DESC
       LIMIT 200`,
      [shareLink.tenant_id, shareLink.matter_id]
    );

    const canViewAdvanced = shareLink.access_level === 'comment';

    return {
      success: true,
      data: {
        id: shareLink.matter_id,
        name: shareLink.matter_name,
        description: shareLink.notes || '',
        clientName: shareLink.client_name,
        status: shareLink.status,
        createdAt: shareLink.created_at,
        expiresAt: shareLink.expires_at,
        permissions: {
          viewDocuments: true,
          downloadDocuments: true,
          viewClauses: canViewAdvanced,
          viewFlags: canViewAdvanced,
        },
        documents: documents.rows.map((document) => ({
          id: document.id,
          name: document.source_name,
          type: document.doc_type,
          size: Math.max((document.word_count || 0) * 6, 0),
          uploadedAt: document.created_at,
        })),
        clauses: canViewAdvanced
          ? clauses.rows.map((clause) => ({
              id: clause.id,
              type: clause.clause_type,
              text: clause.text_excerpt,
              documentName: clause.document_name,
            }))
          : [],
        flags: canViewAdvanced
          ? flags.rows.map((flag) => ({
              id: flag.id,
              type: flag.flag_type,
              severity: flag.severity,
              description: flag.reason,
              documentName: flag.document_name || 'Matter',
            }))
          : [],
      },
    };
  });

  // GET /api/portal/:shareToken/documents/:documentId/download - Resolve signed file URL
  fastify.get('/api/portal/:shareToken/documents/:documentId/download', async (request, reply) => {
    const { shareToken, documentId } = request.params as { shareToken: string; documentId: string };
    const tokenHash = hashToken(shareToken);

    const shareLink = await queryOne<{
      id: string;
      tenant_id: string;
      matter_id: string;
      expires_at: Date;
      max_views: number | null;
      view_count: number;
    }>(
      `SELECT id, tenant_id, matter_id, expires_at, max_views, view_count
       FROM share_links
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!shareLink) {
      return reply.status(404).send({ success: false, error: { message: 'Invalid shared link' } });
    }

    if (new Date(shareLink.expires_at).getTime() < Date.now()) {
      return reply.status(410).send({ success: false, error: { message: 'Shared link has expired' } });
    }

    if (shareLink.max_views !== null && shareLink.view_count >= shareLink.max_views) {
      return reply.status(410).send({ success: false, error: { message: 'Shared link view limit reached' } });
    }

    const document = await queryOne<{
      id: string;
      source_name: string;
      file_uri: string | null;
    }>(
      `SELECT id, source_name, file_uri
       FROM documents
       WHERE id = $1 AND tenant_id = $2 AND matter_id = $3`,
      [documentId, shareLink.tenant_id, shareLink.matter_id]
    );

    if (!document || !document.file_uri) {
      return reply.status(404).send({ success: false, error: { message: 'Document not available' } });
    }

    const storage = await import('./storage.js');
    const downloadUrl = await storage.getSignedDownloadUrl(document.file_uri, 900);

    return { success: true, data: { downloadUrl, fileName: document.source_name } };
  });

  // POST /api/matters/:id/report - Generate executive report
  fastify.post('/api/matters/:id/report', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = z.object({
      format: z.enum(['pdf', 'docx']).default('pdf'),
      sections: z.array(z.enum(['summary', 'flags', 'clauses', 'obligations', 'timeline'])).default(['summary', 'flags', 'clauses']),
    }).parse(request.body);

    // Verify matter exists
    const matter = await queryOne<{ id: string; matter_name: string }>(
      `SELECT id, matter_name FROM matters WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { message: 'Matter not found' } });
    }

    // Queue report generation job
    const { addJob } = await import('./worker.js');
    const job = await addJob('report.generate', {
      tenantId: authReq.tenantId,
      matterId: id,
      requestedBy: authReq.advocateId,
      format: body.format,
      sections: body.sections,
    });

    return {
      success: true,
      data: {
        jobId: job.id,
        message: 'Report generation started. You will be notified when ready.',
      },
    };
  });

  // ============================================================
  // OBLIGATION ROUTES
  // ============================================================

  // GET /api/obligations - List all obligations for tenant
  fastify.get('/api/obligations', { preHandler: authenticateRequest }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const queryParams = request.query as { status?: string; matterId?: string; page?: string; limit?: string };
    
    const page = Number.parseInt(queryParams.page || '1', 10);
    const limit = Math.min(Number.parseInt(queryParams.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE o.tenant_id = $1';
    const params: unknown[] = [authReq.tenantId];
    let paramIndex = 2;

    if (queryParams.matterId) {
      whereClause += ` AND o.matter_id = $${paramIndex}`;
      params.push(queryParams.matterId);
      paramIndex++;
    }

    if (queryParams.status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      params.push(queryParams.status);
      paramIndex++;
    }

    const obligations = await query<{
      id: string;
      matter_id: string;
      matter_name: string;
      document_id: string;
      obligation_type: string;
      description: string;
      responsible_party: string;
      deadline: Date | null;
      status: string;
      priority: string;
    }>(
      `SELECT o.id, o.matter_id, m.matter_name, o.document_id, o.obligation_type, 
              o.description, o.responsible_party, o.deadline, o.status, o.priority
        FROM obligations o
        JOIN matters m ON o.matter_id = m.id
        ${whereClause}
        ORDER BY o.deadline NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { success: true, data: obligations.rows };
  });

  // POST /api/obligations - Create manual obligation
  fastify.post('/api/obligations', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = z.object({
      matterId: z.string().uuid(),
      documentId: z.string().uuid().optional(),
      obligationType: z.string(),
      description: z.string(),
      responsibleParty: z.enum(['client', 'counterparty', 'both', 'third_party']),
      deadline: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
      reminderDaysBefore: z.array(z.number()).optional(),
    }).parse(request.body);

    // Verify matter access
    const matter = await queryOne<{ id: string }>(
      `SELECT id FROM matters WHERE id = $1 AND tenant_id = $2`,
      [body.matterId, authReq.tenantId]
    );

    if (!matter) {
      return reply.status(404).send({ success: false, error: { message: 'Matter not found' } });
    }

    const obligation = await queryOne<{ id: string }>(
      `INSERT INTO obligations (tenant_id, matter_id, document_id, obligation_type, description, 
                                responsible_party, deadline, priority, reminder_days_before)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        authReq.tenantId,
        body.matterId,
        body.documentId || null,
        body.obligationType,
        body.description,
        body.responsibleParty,
        body.deadline || null,
        body.priority,
        body.reminderDaysBefore || [7, 3, 1],
      ]
    );

    return reply.status(201).send({ success: true, data: { id: obligation?.id } });
  });

  // PATCH /api/obligations/:id - Update obligation
  fastify.patch('/api/obligations/:id', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'overdue', 'waived']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
      deadline: z.string().optional(),
      notes: z.string().optional(),
    }).parse(request.body);

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM obligations WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!existing) {
      return reply.status(404).send({ success: false, error: { message: 'Obligation not found' } });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(body.status);
      paramIndex++;
      if (body.status === 'completed') {
        updates.push(`completed_at = NOW()`);
        updates.push(`completed_by = $${paramIndex}`);
        values.push(authReq.advocateId);
        paramIndex++;
      }
    }
    if (body.priority) { updates.push(`priority = $${paramIndex}`); values.push(body.priority); paramIndex++; }
    if (body.deadline) { updates.push(`deadline = $${paramIndex}`); values.push(body.deadline); paramIndex++; }
    if (body.notes !== undefined) { updates.push(`notes = $${paramIndex}`); values.push(body.notes); paramIndex++; }

    values.push(id, authReq.tenantId);

    await query(
      `UPDATE obligations SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
      values
    );

    return { success: true };
  });

  // POST /api/obligations/:id/calendar - Export obligation as iCal
  fastify.post('/api/obligations/:id/calendar', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const obligation = await queryOne<{
      id: string;
      description: string;
      deadline: Date | null;
      matter_name: string;
    }>(
      `SELECT o.id, o.description, o.deadline, m.matter_name
       FROM obligations o
       JOIN matters m ON o.matter_id = m.id
       WHERE o.id = $1 AND o.tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!obligation) {
      return reply.status(404).send({ success: false, error: { message: 'Obligation not found' } });
    }

    if (!obligation.deadline) {
      return reply.status(400).send({ success: false, error: { message: 'Obligation has no deadline' } });
    }

    // Generate iCal format
    const icalDate = `${new Date(obligation.deadline).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EvidentIS//Legal Platform//EN
BEGIN:VEVENT
UID:${obligation.id}@evidentis.law
DTSTAMP:${icalDate}
DTSTART:${icalDate}
SUMMARY:${obligation.matter_name} - ${obligation.description}
DESCRIPTION:Legal obligation from EvidentIS
END:VEVENT
END:VCALENDAR`;

    reply.header('Content-Type', 'text/calendar');
    reply.header('Content-Disposition', `attachment; filename="obligation-${id}.ics"`);
    return reply.send(ical);
  });

  // GET /api/obligations/:id/remind - Send reminder for obligation
  fastify.get('/api/obligations/:id/remind', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const obligation = await queryOne<{
      id: string;
      description: string;
      deadline: Date | null;
      matter_id: string;
    }>(
      `SELECT id, description, deadline, matter_id FROM obligations 
       WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (!obligation) {
      return reply.status(404).send({ success: false, error: { message: 'Obligation not found' } });
    }

    // Queue reminder email job
    const { addJob } = await import('./worker.js');
    await addJob('obligation.remind', {
      tenantId: authReq.tenantId,
      obligationId: id,
      matterId: obligation.matter_id,
    });

    // Update last reminder sent
    await query(
      `UPDATE obligations SET last_reminder_sent_at = NOW() WHERE id = $1`,
      [id]
    );

    return { success: true, data: { message: 'Reminder sent' } };
  });

  // ============================================================
  // ANALYTICS ADDITIONAL ROUTES
  // ============================================================

  // GET /api/analytics/attorneys - Advocate productivity metrics
  fastify.get(
    '/api/analytics/attorneys',
    { preHandler: [authenticateRequest, requireRoles('admin', 'partner')] },
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
                (SELECT COUNT(*) FROM matters WHERE lead_advocate_id = a.id OR lead_attorney_id = a.id) as matters_count,
                (SELECT COUNT(*) FROM review_actions WHERE reviewer_id = a.id) as documents_reviewed,
                (SELECT COUNT(*) FROM flags WHERE reviewed_by = a.id AND status != 'open') as flags_resolved
         FROM attorneys a
         WHERE a.tenant_id = $1 AND a.status = 'active'
         ORDER BY matters_count DESC`,
        [authReq.tenantId]
      );

      return { success: true, data: attorneys.rows };
    }
  );

  // ============================================================
  // AI ROUTES
  // ============================================================

  // GET /api/ai/models - List available AI models
  fastify.get('/api/ai/models', { preHandler: [authenticateRequest, requireRoles('admin')] }, async (request, reply) => {
    try {
      const response = await fetch(`${config.AI_SERVICE_URL}/models`, {
        headers: getAiServiceHeaders(),
      });
      if (!response.ok) throw new Error('AI service unavailable');
      const models = await response.json();
      return { success: true, data: models };
    } catch (error) {
      return reply.status(503).send({ success: false, error: { message: 'AI service unavailable' } });
    }
  });

  // GET /api/ai/costs - Get AI usage costs
  fastify.get('/api/ai/costs', { preHandler: [authenticateRequest, requireRoles('admin')] }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const queryParams = request.query as { startDate?: string; endDate?: string };

    const startDate = queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
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
      [authReq.tenantId, startDate, endDate]
    );

    return { success: true, data: costs.rows };
  });

  // ============================================================
  // WEBHOOK ROUTES
  // ============================================================

  // GET /api/webhooks - List webhooks
  fastify.get('/api/webhooks', { preHandler: [authenticateRequest, requireRoles('admin')] }, async (request) => {
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
      [authReq.tenantId]
    );

    return { success: true, data: webhooks.rows };
  });

  // POST /api/webhooks - Create webhook
  fastify.post('/api/webhooks', { preHandler: [authenticateRequest, requireRoles('admin')] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = z.object({
      url: z.string().url(),
      events: z.array(z.string()).min(1),
    }).parse(request.body);

    const secret = generateSecureToken(32);
    const webhook = await queryOne<{ id: string }>(
      `INSERT INTO webhooks (tenant_id, url, events, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [authReq.tenantId, body.url, body.events, secret]
    );

    return reply.status(201).send({
      success: true,
      data: { id: webhook?.id, secret },
    });
  });

  // DELETE /api/webhooks/:id - Delete webhook
  fastify.delete('/api/webhooks/:id', { preHandler: [authenticateRequest, requireRoles('admin')] }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const result = await query(
      `DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2`,
      [id, authReq.tenantId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Webhook not found' } });
    }

    return { success: true };
  });

  // ============================================================
  // BILLING ADDITIONAL ROUTES
  // ============================================================

  // POST /billing/portal - Create Razorpay billing management session
  fastify.post(
    '/billing/portal',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z.object({
        returnUrl: z.string().url().optional(),
      }).parse(request.body);

      try {
        const { createCustomerPortalSession } = await import('./billing.js');
        const session = await createCustomerPortalSession(
          authReq.tenantId,
          body.returnUrl || `${config.FRONTEND_URL}/billing`
        );
        return { success: true, data: { url: session.url } };
      } catch (error) {
        logger.error({ error }, 'Failed to create portal session');
        return reply.status(500).send({ success: false, error: { message: 'Billing portal unavailable' } });
      }
    }
  );

  // ============================================================
  // AUTH ADDITIONAL ROUTES
  // ============================================================

  // POST /auth/exchange - Accept invitation and create account
  fastify.post('/auth/exchange', async (request, reply) => {
    const body = z.object({
      token: z.string(),
      email: z.string().email(),
      password: z.string().min(12),
      displayName: z.string().min(1),
    }).parse(request.body);

    const tokenHash = hashToken(body.token);
    const invitation = await queryOne<{
      id: string;
      tenant_id: string;
      email: string;
      role: string;
      expires_at: Date;
      status: string;
    }>(
      `SELECT id, tenant_id, email, role, expires_at, status
       FROM invitations WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!invitation) {
      return reply.status(400).send({ success: false, error: { message: 'Invalid invitation' } });
    }

    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      return reply.status(400).send({ success: false, error: { message: 'Invitation expired' } });
    }

    if (invitation.email.toLowerCase() !== body.email.toLowerCase()) {
      return reply.status(400).send({ success: false, error: { message: 'Email does not match invitation' } });
    }

    // Validate password
    const validation = validatePasswordPolicy(body.password);
    if (!validation.valid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: validation.errors.join(', ') },
      });
    }

    const passwordHash = await hashPassword(body.password);

    const attorney = await withTransaction(async (tx) => {
      // Create attorney
      const newAttorney = await tx.queryOne<{ id: string }>(
        `INSERT INTO attorneys (tenant_id, email, display_name, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id`,
        [invitation.tenant_id, body.email.toLowerCase(), body.displayName, passwordHash, invitation.role]
      );

      // Mark invitation as accepted
      await tx.query(
        `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
        [invitation.id]
      );

      return newAttorney;
    });

    if (!attorney) {
      return reply.status(500).send({ success: false, error: { message: 'Failed to create attorney' } });
    }

    // Generate tokens and login
    const tokenId = generateSecureToken(16);
    const accessToken = await generateAccessToken({
      sub: attorney.id,
      tenantId: invitation.tenant_id,
      email: body.email,
      role: invitation.role,
    });

    const newRefreshToken = await generateRefreshToken({
      sub: attorney.id,
      tenantId: invitation.tenant_id,
      email: body.email,
      role: invitation.role,
      tokenId,
    });

    await query(
      `INSERT INTO refresh_tokens (attorney_id, tenant_id, token_hash, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [attorney.id, invitation.tenant_id, hashToken(newRefreshToken), request.headers['user-agent'], request.ip]
    );

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(201).send({
      success: true,
      data: {
        accessToken,
        attorney: {
          id: attorney.id,
          tenantId: invitation.tenant_id,
          email: body.email,
          displayName: body.displayName,
          role: invitation.role,
        },
        advocate: {
          id: attorney.id,
          tenantId: invitation.tenant_id,
          email: body.email,
          displayName: body.displayName,
          role: invitation.role,
        },
      },
    });
  });

  // ============================================================
  // REVIEW ROUTES
  // ============================================================

  // POST /api/review/feedback - Submit feedback on clause/suggestion
  fastify.post('/api/review/feedback', { preHandler: authenticateRequest }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = z.object({
      clauseId: z.string().uuid().optional(),
      suggestionId: z.string().uuid().optional(),
      action: z.enum(['approve', 'reject', 'modify']),
      notes: z.string().optional(),
      modifiedText: z.string().optional(),
    }).parse(request.body);

    if (!body.clauseId && !body.suggestionId) {
      return reply.status(400).send({ success: false, error: { message: 'Either clauseId or suggestionId required' } });
    }

    if (body.suggestionId) {
      // Update clause suggestion
      const statusMap = { approve: 'accepted', reject: 'rejected', modify: 'modified' } as const;
      await query(
        `UPDATE clause_suggestions 
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, final_text = $4
         WHERE id = $5 AND tenant_id = $6`,
        [statusMap[body.action], authReq.advocateId, body.notes || null, body.modifiedText || null, body.suggestionId, authReq.tenantId]
      );
    }

    if (body.clauseId) {
      // Update clause reviewer status
      const statusMap = { approve: 'approved', reject: 'rejected', modify: 'modified' } as const;
      await query(
        `UPDATE clauses SET reviewer_status = $1 WHERE id = $2 AND tenant_id = $3`,
        [statusMap[body.action], body.clauseId, authReq.tenantId]
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
      ]
    );

    return { success: true };
  });

  logger.info('Routes registered');
}
