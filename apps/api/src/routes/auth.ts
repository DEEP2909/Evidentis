/**
 * EvidentIS API — auth Routes
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

import * as OTPAuth from 'otpauth';
import { fileTypeFromBuffer } from 'file-type';
import {
  type AccessTokenPayload,
  generateAccessToken,
  generateFingerprint,
  generateRefreshToken,
  verifyAccessToken,
} from '../auth.js';
import { corsOrigins, rateLimits } from '../config.js';
import { sendInvitationEmail, sendPasswordResetEmail } from '../email.js';
import { redis } from '../redis.js';
import { attorneyRepo, tenantRepo } from '../repository.js';
import {
  generateApiKey,
  generateRecoveryCodes,
  generateSecureToken,
  hashPassword,
  hashRecoveryCodes,
  hashToken,
  validatePasswordPolicy,
  verifyPassword,
} from '../security.js';
import {
  loginSchema,
  _registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpSendSchema,
  otpVerifySchema,
  inviteSchema,
  normalizeIndianPhoneNumber,
  getPhoneLookupDigits,
  maskPhoneNumber,
  generateOtpCode,
  sendOtpViaMsg91,
  resolveCorsOrigin,
} from './_helpers.js';


export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/register
  fastify.post(
    '/auth/register',
    {
      config: {
        rateLimit: {
          max: rateLimits.auth.requests,
          timeWindow: rateLimits.auth.windowMs,
        },
      },
    },
    async (request, reply) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(12),
          invitationCode: z.string().optional(),
        })
        .parse(request.body);

      // Validate password
      const validation = validatePasswordPolicy(body.password);
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: validation.errors.join(', '),
          },
        });
      }

      const passwordHash = await hashPassword(body.password);

      let tenantId: string;
      let role = 'admin';

      if (body.invitationCode) {
        // Invitation-based registration
        const tokenHash = hashToken(body.invitationCode);
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
          [tokenHash],
        );

        if (
          !invitation ||
          invitation.status !== 'pending' ||
          new Date(invitation.expires_at) < new Date()
        ) {
          return reply.status(400).send({
            success: false,
            error: { message: 'Invalid or expired invitation' },
          });
        }

        if (invitation.email.toLowerCase() !== body.email.toLowerCase()) {
          return reply.status(400).send({
            success: false,
            error: { message: 'Email does not match invitation' },
          });
        }

        tenantId = invitation.tenant_id;
        role = invitation.role;

        await withTransaction(async (tx) => {
          await tx.query(
            `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
            [invitation.id],
          );
        });
      } else {
        // New tenant registration (Starter Plan)
        const slug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const existingTenant = await tenantRepo.findBySlug(slug);
        const finalSlug = existingTenant ? `${slug}-${generateSecureToken(4)}` : slug;

        const newTenant = await tenantRepo.create({
          name: body.name,
          slug: finalSlug,
          plan: 'starter',
        });
        tenantId = newTenant.id;
      }

      // Create attorney
      const attorney = await attorneyRepo.create(tenantId, {
        email: body.email,
        displayName: body.name,
        passwordHash,
        role,
        status: 'active' as any,
      } as any);

      // Generate tokens with fingerprinting
      const fingerprint = generateFingerprint(
        request.headers['user-agent'] || '',
        request.ip,
      );
      const tokenId = generateSecureToken(16);
      const accessToken = await generateAccessToken({
        sub: attorney.id,
        tenantId,
        email: body.email,
        role,
        fingerprint,
      });

      const refreshToken = await generateRefreshToken({
        sub: attorney.id,
        tenantId,
        email: body.email,
        role,
        tokenId,
        fingerprint,
      });

      // Store refresh token with fingerprint
      await query(
        `INSERT INTO refresh_tokens (advocate_id, tenant_id, token_hash, user_agent, ip_address, fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          attorney.id,
          tenantId,
          hashToken(refreshToken),
          request.headers['user-agent'] || '',
          request.ip,
          fingerprint,
        ],
      );

      reply.setCookie('refreshToken', refreshToken, {
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
            tenantId,
            email: body.email,
            displayName: body.name,
            role,
          },
        },
      });
    },
  );

  // POST /auth/login
  fastify.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: rateLimits.auth.requests,
          timeWindow: rateLimits.auth.windowMs,
        },
      },
    },
    async (request, reply) => {
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
        [email.toLowerCase()],
      );

      if (!attorney) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }

      if (tenantSlug && attorney.tenant_slug !== tenantSlug) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }

      // Check if account is locked
      if (
        attorney.locked_until &&
        new Date(attorney.locked_until) > new Date()
      ) {
        return reply.status(423).send({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked',
          },
        });
      }

      // Check if account is suspended
      if (attorney.status === 'suspended') {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Account has been suspended',
          },
        });
      }

      // Verify password
      const validPassword = await verifyPassword(
        password,
        attorney.password_hash,
      );
      if (!validPassword) {
        // Increment failed attempts
        const newAttempts = attorney.failed_login_attempts + 1;
        const lockUntil =
          newAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
            : null;

        await query(
          `UPDATE attorneys 
         SET failed_login_attempts = $1, locked_until = $2 
         WHERE id = $3`,
          [newAttempts, lockUntil, attorney.id],
        );

        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
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

        // Verify MFA code
        if (!attorney.mfa_secret) {
          return reply.status(500).send({
            success: false,
            error: {
              code: 'MFA_SETUP_INCOMPLETE',
              message: 'MFA is enabled but not properly configured',
            },
          });
        }

        const totp = new OTPAuth.TOTP({
          issuer: 'EvidentIS',
          label: attorney.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(attorney.mfa_secret),
        });

        const delta = totp.validate({ token: mfaCode, window: 1 });
        if (delta === null) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_MFA_CODE',
              message: 'Invalid or expired MFA code',
            },
          });
        }
      }

      // Generate tokens with fingerprinting
      const fingerprint = generateFingerprint(
        request.headers['user-agent'] || '',
        request.ip,
      );
      const tokenId = generateSecureToken(16);
      const accessToken = await generateAccessToken({
        sub: attorney.id,
        tenantId: attorney.tenant_id,
        email: attorney.email,
        role: attorney.role,
        fingerprint,
      });

      const refreshToken = await generateRefreshToken({
        sub: attorney.id,
        tenantId: attorney.tenant_id,
        email: attorney.email,
        role: attorney.role,
        tokenId,
        fingerprint,
      });

      // Store refresh token hash with fingerprint
      await query(
        `INSERT INTO refresh_tokens (advocate_id, tenant_id, token_hash, user_agent, ip_address, fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          attorney.id,
          attorney.tenant_id,
          hashToken(refreshToken),
          request.headers['user-agent'] || '',
          request.ip,
          fingerprint,
        ],
      );

      // Reset failed attempts and update last login
      await query(
        `UPDATE attorneys 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() 
       WHERE id = $1`,
        [attorney.id],
      );

      // Log audit event
      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, 'auth.login', $3, $4)`,
        [
          attorney.tenant_id,
          attorney.id,
          request.ip,
          request.headers['user-agent'],
        ],
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
    },
  );

  // POST /auth/logout
  fastify.post(
    '/auth/logout',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        await query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
          [hashToken(refreshToken)],
        );
      }

      // Log audit event
      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, 'auth.logout', $3, $4)`,
        [
          authReq.tenantId,
          authReq.advocateId,
          request.ip,
          request.headers['user-agent'],
        ],
      );

      reply.clearCookie('refreshToken', { path: '/auth/refresh' });
      return { success: true };
    },
  );

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token provided',
        },
      });
    }

    // ── Atomic lock to prevent TOCTOU race in distributed deployments ────
    // Two concurrent refresh requests with the same token will race:
    // both pass the initial check before either invalidates the old token.
    // Redis SET NX ensures only one request proceeds per token.
    const tokenHash = hashToken(refreshToken);
    const lockKey = `refresh_lock:${tokenHash}`;
    const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'REFRESH_IN_PROGRESS',
          message: 'Token refresh already in progress. Please retry.',
        },
      });
    }
    // ────────────────────────────────────────────────────────────────────

    try {
    // Find and validate refresh token
    const tokenRecord = await queryOne<{
      id: string;
      advocate_id: string;
      tenant_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      rotated_to: string | null;
      fingerprint: string | null;
    }>(
      `SELECT id, advocate_id, tenant_id, expires_at, revoked_at, rotated_to, fingerprint
       FROM refresh_tokens WHERE token_hash = $1`,
      [hashToken(refreshToken)],
    );

    if (!tokenRecord) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      });
    }

    // Check if token is revoked or expired
    if (
      tokenRecord.revoked_at ||
      new Date(tokenRecord.expires_at) < new Date()
    ) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token has expired' },
      });
    }

    // Verify session fingerprint to prevent hijacking
    const currentFingerprint = generateFingerprint(
      request.headers['user-agent'] || '',
      request.ip,
    );
    if (tokenRecord.fingerprint && tokenRecord.fingerprint !== currentFingerprint) {
      logger.warn(
        {
          sub: tokenRecord.advocate_id,
          expected: tokenRecord.fingerprint,
          actual: currentFingerprint,
        },
        'Refresh token fingerprint mismatch',
      );
      return reply.status(401).send({
        success: false,
        error: { code: 'SESSION_HIJACKED', message: 'Environment change detected' },
      });
    }

    // Check for token reuse (replay attack)
    if (tokenRecord.rotated_to) {
      // Revoke entire token family
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE advocate_id = $1',
        [tokenRecord.advocate_id],
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
      'SELECT id, email, role, status FROM attorneys WHERE id = $1 AND tenant_id = $2',
      [tokenRecord.advocate_id, tokenRecord.tenant_id],
    );

    if (!attorney || attorney.status !== 'active') {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_ACCOUNT',
          message: 'Account not found or inactive',
        },
      });
    }

    // Generate new tokens with fingerprinting
    const newTokenId = generateSecureToken(16);
    const accessToken = await generateAccessToken({
      sub: attorney.id,
      tenantId: tokenRecord.tenant_id,
      email: attorney.email,
      role: attorney.role,
      fingerprint: currentFingerprint,
    });

    const newRefreshToken = await generateRefreshToken({
      sub: attorney.id,
      tenantId: tokenRecord.tenant_id,
      email: attorney.email,
      role: attorney.role,
      tokenId: newTokenId,
      fingerprint: currentFingerprint,
    });

    // Rotate token
    const newTokenHash = hashToken(newRefreshToken);
    await withTransaction(async (tx) => {
      // Create new token with fingerprint
      const newToken = await tx.queryOne<{ id: string }>(
        `INSERT INTO refresh_tokens (advocate_id, tenant_id, token_hash, user_agent, ip_address, fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          attorney.id,
          tokenRecord.tenant_id,
          newTokenHash,
          request.headers['user-agent'],
          request.ip,
          currentFingerprint,
        ],
      );

      // Mark old token as rotated
      await tx.query(
        'UPDATE refresh_tokens SET rotated_to = $1 WHERE id = $2',
        [newToken?.id, tokenRecord.id],
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
    } finally {
      // Release the atomic lock regardless of outcome
      await redis.del(lockKey);
    }
  });

  // POST /auth/forgot-password
  const sendOtpHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const body = otpSendSchema.parse(request.body);
    const normalizedPhone = normalizeIndianPhoneNumber(body.phoneNumber);
    if (!normalizedPhone) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: 'Enter a valid Indian mobile number',
        },
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
      params,
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
    const expiresAt = new Date(
      Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE advocate_otps
         SET consumed_at = NOW()
         WHERE phone_number = $1 AND purpose = $2 AND consumed_at IS NULL`,
        [normalizedPhone, body.purpose],
      );

      await tx.query(
        `INSERT INTO advocate_otps (tenant_id, advocate_id, phone_number, purpose, otp_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          attorney.tenant_id,
          attorney.id,
          normalizedPhone,
          body.purpose,
          otpHash,
          expiresAt,
        ],
      );

      await tx.query(
        'UPDATE attorneys SET otp_last_sent_at = NOW() WHERE id = $1',
        [attorney.id],
      );
    });

    let deliveryMode: 'sent' | 'logged' = 'logged';
    try {
      deliveryMode = await sendOtpViaMsg91(normalizedPhone, otpCode);
    } catch (error) {
      logger.error(
        { error, phone: maskPhoneNumber(normalizedPhone) },
        'Failed to send OTP via MSG91',
      );
      return reply.status(502).send({
        success: false,
        error: {
          code: 'OTP_DELIVERY_FAILED',
          message: 'Unable to deliver OTP right now',
        },
      });
    }

    return {
      success: true,
      data: {
        sent: true,
        phoneMasked: maskPhoneNumber(normalizedPhone),
        expiresInMinutes: config.OTP_EXPIRY_MINUTES,
        deliveryMode,
        ...(deliveryMode === 'logged' &&
        config.NODE_ENV !== 'production' &&
        config.EXPOSE_OTP_PREVIEW === 'true'
          ? { otpPreview: otpCode }
          : {}),
      },
    };
  };

  fastify.post(
    '/api/auth/otp/send',
    {
      config: {
        rateLimit: {
          max: rateLimits.otp.requests,
          timeWindow: rateLimits.otp.windowMs,
        },
      },
    },
    sendOtpHandler,
  );

  const verifyOtpHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const body = otpVerifySchema.parse(request.body);
    const normalizedPhone = normalizeIndianPhoneNumber(body.phoneNumber);
    if (!normalizedPhone) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: 'Enter a valid Indian mobile number',
        },
      });
    }

    // ── Per-phone Redis brute-force counter ──────────────────────────────
    // Prevents distributed attackers from enumerating 6-digit OTPs by
    // rate-limiting at the phone+purpose level regardless of IP.
    const bruteForceKey = `otp_bf:${normalizedPhone}:${body.purpose}`;
    const MAX_OTP_VERIFY_ATTEMPTS = 5;
    const OTP_LOCKOUT_SECONDS = config.OTP_EXPIRY_MINUTES * 60;

    const attempts = await redis.incr(bruteForceKey);
    if (attempts === 1) {
      // Set TTL on first attempt (matches OTP expiry window)
      await redis.expire(bruteForceKey, OTP_LOCKOUT_SECONDS);
    }

    if (attempts > MAX_OTP_VERIFY_ATTEMPTS) {
      logger.warn(
        { phone: normalizedPhone, purpose: body.purpose, attempts },
        'OTP brute-force threshold exceeded',
      );
      return reply.status(429).send({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many verification attempts for this number. Please request a new OTP.',
        },
      });
    }
    // ────────────────────────────────────────────────────────────────────

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
      otp_failed_attempts: number;
      otp_locked_until: Date | null;
    }>(
      `SELECT o.id, o.tenant_id, o.advocate_id, o.otp_hash, o.expires_at,
              a.email, a.display_name, a.role, a.status,
              a.otp_failed_attempts, a.otp_locked_until
       FROM advocate_otps o
       JOIN attorneys a ON a.id = o.advocate_id
       JOIN tenants t ON t.id = o.tenant_id
       WHERE o.phone_number = $1
         AND o.purpose = $2
         AND o.consumed_at IS NULL${tenantFilter}
       ORDER BY o.created_at DESC
       LIMIT 1`,
      params,
    );

    if (!otpRecord) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
      });
    }

    if (otpRecord.status !== 'active') {
      return reply.status(401).send({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is not active' },
      });
    }

    if (
      otpRecord.otp_locked_until &&
      new Date(otpRecord.otp_locked_until).getTime() > Date.now()
    ) {
      return reply.status(429).send({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Too many failed OTP attempts. Try again later.' },
      });
    }

    const expectedHash = hashToken(
      `${normalizedPhone}:${body.purpose}:${body.otp}`,
    );
    if (expectedHash !== otpRecord.otp_hash) {
      const attempts = otpRecord.otp_failed_attempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      
      await query(
        `UPDATE attorneys SET otp_failed_attempts = $1, otp_locked_until = $2 WHERE id = $3`,
        [attempts, lockedUntil, otpRecord.advocate_id]
      );

      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
      });
    }

    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      await query(
        'UPDATE advocate_otps SET consumed_at = NOW() WHERE id = $1',
        [otpRecord.id],
      );
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
      await tx.query(
        'UPDATE advocate_otps SET consumed_at = NOW() WHERE id = $1',
        [otpRecord.id],
      );
      await tx.query(
        `INSERT INTO refresh_tokens (advocate_id, tenant_id, token_hash, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          otpRecord.advocate_id,
          otpRecord.tenant_id,
          hashToken(refreshToken),
          request.headers['user-agent'],
          request.ip,
        ],
      );
      await tx.query(
        `UPDATE attorneys
         SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(),
             otp_failed_attempts = 0, otp_locked_until = NULL
         WHERE id = $1`,
        [otpRecord.advocate_id],
      );
      // Clear Redis brute-force counter on successful verification
      await redis.del(`otp_bf:${normalizedPhone}:${body.purpose}`);
      await tx.query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, user_agent)
         VALUES ($1, $2, 'auth.login.otp', $3, $4)`,
        [
          otpRecord.tenant_id,
          otpRecord.advocate_id,
          request.ip,
          request.headers['user-agent'],
        ],
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

  fastify.post(
    '/api/auth/otp/verify',
    {
      config: {
        rateLimit: {
          max: rateLimits.otp.requests,
          timeWindow: rateLimits.otp.windowMs,
        },
      },
    },
    verifyOtpHandler,
  );

  // POST /auth/forgot-password
  fastify.post('/auth/forgot-password', async (request, _reply) => {
    const { email } = forgotPasswordSchema.parse(request.body);

    const attorney = await queryOne<{
      id: string;
      display_name: string;
      tenant_id: string;
    }>(
      `SELECT id, display_name, tenant_id FROM attorneys WHERE email = $1 AND status = 'active'`,
      [email.toLowerCase()],
    );

    // Always return success to prevent email enumeration
    if (!attorney) {
      return { success: true };
    }

    // Invalidate previous reset tokens
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW(), status = 'used' 
       WHERE advocate_id = $1 AND status = 'active'`,
      [attorney.id],
    );

    // Generate reset token
    const token = generateSecureToken(32);
    const tokenHash = hashToken(token);

    await query(
      `INSERT INTO password_reset_tokens (advocate_id, token_hash)
       VALUES ($1, $2)`,
      [attorney.id, tokenHash],
    );

    // Send email
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl, attorney.display_name);

    // Log audit event
    await query(
      `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address, metadata)
       VALUES ($1, $2, 'auth.forgot_password', $3, $4)`,
      [attorney.tenant_id, attorney.id, request.ip, JSON.stringify({ email })],
    );

    return { success: true };
  });

  // POST /auth/reset-password
  fastify.post('/auth/reset-password', async (request, reply) => {
    const { token, password, newPassword } = resetPasswordSchema.parse(
      request.body,
    );
    const effectivePassword = newPassword ?? password ?? '';

    // Validate password policy
    const validation = validatePasswordPolicy(effectivePassword);
    if (!validation.valid) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: validation.errors.join(', '),
        },
      });
    }

    const tokenHash = hashToken(token);
    const tokenRecord = await queryOne<{
      id: string;
      advocate_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, advocate_id, expires_at, used_at 
       FROM password_reset_tokens 
       WHERE token_hash = $1 AND status = 'active'`,
      [tokenHash],
    );

    if (
      !tokenRecord ||
      tokenRecord.used_at ||
      new Date(tokenRecord.expires_at) < new Date()
    ) {
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
        [passwordHash, tokenRecord.advocate_id],
      );

      // Mark token as used
      await tx.query(
        `UPDATE password_reset_tokens SET used_at = NOW(), status = 'used' WHERE id = $1`,
        [tokenRecord.id],
      );

      // Revoke all refresh tokens (log out all sessions)
      await tx.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE advocate_id = $1',
        [tokenRecord.advocate_id],
      );
    });

    return { success: true };
  });

  // GET /auth/me
  fastify.get(
    '/auth/me',
    { preHandler: authenticateRequest },
    async (request) => {
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
        [authReq.advocateId, authReq.tenantId],
      );

      const tenant = await queryOne<{
        id: string;
        name: string;
        slug: string;
        plan: string;
        logo_url: string | null;
      }>('SELECT id, name, slug, plan, logo_url FROM tenants WHERE id = $1', [
        authReq.tenantId,
      ]);

      return {
        success: true,
        data: {
          attorney,
          advocate: attorney,
          tenant,
        },
      };
    },
  );

  // POST /auth/mfa/setup
  // POST /auth/mfa/setup
  fastify.post(
    '/auth/mfa/setup',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const secret = new OTPAuth.Secret({ size: 20 }).base32;
      const issuer = encodeURIComponent('EvidentIS');
      const label = encodeURIComponent(authReq.tokenPayload.email);
      const qrCodeUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;

      await query(
        'UPDATE attorneys SET mfa_secret = $1, mfa_enabled = true WHERE id = $2 AND tenant_id = $3',
        [secret, authReq.advocateId, authReq.tenantId],
      );

      return {
        success: true,
        data: {
          secret,
          qrCodeUrl,
        },
      };
    },
  );

  // POST /auth/mfa/disable
  fastify.post(
    '/auth/mfa/disable',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { password } = z.object({ password: z.string() }).parse(request.body);

      // Verify password before allowing MFA disable
      const attorney = await queryOne<{ password_hash: string }>(
        'SELECT password_hash FROM attorneys WHERE id = $1 AND tenant_id = $2',
        [authReq.advocateId, authReq.tenantId],
      );

      if (!attorney) {
        return reply.status(401).send({ success: false, error: { message: 'User not found' } });
      }

      const isValid = await verifyPassword(password, attorney.password_hash);
      if (!isValid) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Invalid password' },
        });
      }

      await attorneyRepo.disableMfa(authReq.tenantId, authReq.advocateId);

      // Log audit event
      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, ip_address)
         VALUES ($1, $2, 'auth.mfa_disabled', $3)`,
        [authReq.tenantId, authReq.advocateId, request.ip],
      );

      return { success: true };
    },
  );


  // AUTH ADDITIONAL ROUTES
  // ============================================================

  // POST /auth/exchange - Accept invitation and create account
  fastify.post(
    '/auth/exchange',
    {
      config: {
        rateLimit: {
          max: rateLimits.auth.requests,
          timeWindow: rateLimits.auth.windowMs,
        },
      },
    },
    async (request, reply) => {
      const body = z
        .object({
          token: z.string(),
          email: z.string().email(),
          password: z.string().min(12),
          displayName: z.string().min(1),
        })
        .parse(request.body);

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
        [tokenHash],
      );

      if (!invitation) {
        return reply
          .status(400)
          .send({ success: false, error: { message: 'Invalid invitation' } });
      }

      if (
        invitation.status !== 'pending' ||
        new Date(invitation.expires_at) < new Date()
      ) {
        return reply
          .status(400)
          .send({ success: false, error: { message: 'Invitation expired' } });
      }

      if (invitation.email.toLowerCase() !== body.email.toLowerCase()) {
        return reply
          .status(400)
          .send({
            success: false,
            error: { message: 'Email does not match invitation' },
          });
      }

      // Validate password
      const validation = validatePasswordPolicy(body.password);
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: validation.errors.join(', '),
          },
        });
      }

      const passwordHash = await hashPassword(body.password);

      const attorney = await withTransaction(async (tx) => {
        // Create attorney
        const newAttorney = await tx.queryOne<{ id: string }>(
          `INSERT INTO attorneys (tenant_id, email, display_name, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id`,
          [
            invitation.tenant_id,
            body.email.toLowerCase(),
            body.displayName,
            passwordHash,
            invitation.role,
          ],
        );

        // Mark invitation as accepted
        await tx.query(
          `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
          [invitation.id],
        );

        return newAttorney;
      });

      if (!attorney) {
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Failed to create attorney' },
          });
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
        `INSERT INTO refresh_tokens (advocate_id, tenant_id, token_hash, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
        [
          attorney.id,
          invitation.tenant_id,
          hashToken(newRefreshToken),
          request.headers['user-agent'],
          request.ip,
        ],
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
    },
  );

  // ============================================================
}
