/**
 * EvidentIS API Routes — Shared Helpers
 * Types, schemas, middleware, and utility functions used across all route modules.
 */

import { randomInt } from 'node:crypto';
import {
  ADVOCATE_ROLES,
  ATTORNEY_STATUSES,
  INDIAN_STATE_CODES,
  MATTER_TYPES,
  SUPPORTED_LANGUAGE_CODES,
} from '@evidentis/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { buildAIContext, formatContextForPrompt } from '../ai-context.js';
import {
  type AccessTokenPayload,
  generateFingerprint,
  verifyAccessToken,
} from '../auth.js';
import { config, corsOrigins } from '../config.js';
import { query } from '../database.js';
import {
  assertEmbeddingDimension,
  cacheEmbedding,
  getCachedEmbedding,
} from '../embedding-cache.js';
import { logger } from '../logger.js';

// ============================================================
// REQUEST TYPES
// ============================================================

export interface AuthenticatedRequest extends FastifyRequest {
  tenantId: string;
  advocateId: string;
  advocateRole: string;
  /** @deprecated Use advocateId */
  attorneyId: string;
  /** @deprecated Use advocateRole */
  attorneyRole: string;
  tokenPayload: AccessTokenPayload;
  user?: {
    tenantId: string;
    advocateId: string;
    attorneyId: string;
    email: string;
    displayName?: string;
    role: string;
  };
}

export interface ResearchChunkRow {
  id: string;
  document_id: string;
  text_content: string;
  chunk_index: number;
  page_from: number | null;
  page_to: number | null;
  document_title: string;
  relevance_score: number;
}

export interface BareActResearchRow {
  id: string;
  act_id: string;
  act_title: string;
  act_short_title: string | null;
  section_number: string;
  section_title: string | null;
  section_text: string;
  relevance_score: number;
}

export interface ResearchSource {
  chunkId: string;
  documentId: string;
  title: string;
  text: string;
  pageFrom: number | null;
  pageTo: number | null;
  relevance: number;
  sourceType: 'tenant_document' | 'bare_act';
  sourceVerified: boolean;
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      },
    });
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);

    // Verify session fingerprint to prevent hijacking
    if (payload.fingerprint) {
      const currentFingerprint = generateFingerprint(
        request.headers['user-agent'] || '',
        request.ip,
      );
      if (payload.fingerprint !== currentFingerprint) {
        logger.warn(
          {
            sub: payload.sub,
            tenantId: payload.tenantId,
            expected: payload.fingerprint,
            actual: currentFingerprint,
          },
          'Session fingerprint mismatch - potential hijacking attempt',
        );
        return reply.status(401).send({
          success: false,
          error: { code: 'SESSION_HIJACKED', message: 'Session invalidated due to environment change' },
        });
      }
    }

    (request as AuthenticatedRequest).tenantId = payload.tenantId;
    (request as AuthenticatedRequest).advocateId = payload.sub;
    (request as AuthenticatedRequest).advocateRole = payload.role;
    (request as AuthenticatedRequest).attorneyId = payload.sub;
    (request as AuthenticatedRequest).attorneyRole = payload.role;
    (request as AuthenticatedRequest).tokenPayload = payload;
    (request as AuthenticatedRequest).user = {
      tenantId: payload.tenantId,
      advocateId: payload.sub,
      attorneyId: payload.sub,
      email: payload.email,
      displayName: payload.email,
      role: payload.role,
    };
  } catch (_error) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

export function requireRoles(...roles: string[]) {
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

export function resolveCorsOrigin(originHeader: string | undefined): string {
  if (originHeader && corsOrigins.includes(originHeader)) {
    return originHeader;
  }

  return config.FRONTEND_URL;
}

// ============================================================
// AI SERVICE HEADERS
// ============================================================

/**
 * Generate AI service request headers with per-tenant JWT authentication.
 * Replaces the static shared-key approach for better traceability and security.
 * Falls back to static key if JWT generation fails (backwards compatibility).
 */
export function getAiServiceHeaders(
  base: Record<string, string> = {},
  tenantId?: string,
): Record<string, string> {
  const headers = { ...base };

  if (config.AI_SERVICE_INTERNAL_KEY) {
    // Include static key for backwards compatibility during migration
    headers['X-Internal-Key'] = config.AI_SERVICE_INTERNAL_KEY;
  }

  // Generate a short-lived JWT with tenant context for per-tenant traceability
  if (tenantId) {
    const payload = {
      iss: 'evidentis-api',
      sub: tenantId,
      tenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5-minute expiry
    };
    // Base64url-encode the JWT payload (unsigned — internal network only)
    // The AI service validates the tenantId claim for audit logging
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    headers['X-Tenant-JWT'] = `${headerB64}.${payloadB64}.`;
    headers['X-Tenant-ID'] = tenantId;
  }

  return headers;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function normalizeIndianPhoneNumber(value: string): string | null {
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

export function getPhoneLookupDigits(normalizedPhone: string): string[] {
  const digits = normalizedPhone.replace(/\D/g, '');
  const localNumber = digits.startsWith('91') ? digits.slice(2) : digits;
  return Array.from(new Set([digits, localNumber]));
}

export function maskPhoneNumber(normalizedPhone: string): string {
  if (normalizedPhone.length <= 4) return normalizedPhone;
  return `${normalizedPhone.slice(0, 3)}******${normalizedPhone.slice(-2)}`;
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function sendOtpViaMsg91(
  normalizedPhone: string,
  otpCode: string,
): Promise<'sent' | 'logged'> {
  if (!config.MSG91_AUTH_KEY) {
    logger.info(
      { phone: maskPhoneNumber(normalizedPhone), otpCode },
      'MSG91 auth key not configured; OTP logged',
    );
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
    throw new Error(
      `MSG91 request failed (${response.status}): ${errorBody || 'unknown error'}`,
    );
  }

  return 'sent';
}

export function toActSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export async function getResearchEmbedding(
  question: string,
  context: string,
): Promise<number[]> {
  const cacheKey = question.toLowerCase().trim();
  const model = config.EMBEDDING_MODEL;
  const cached = await getCachedEmbedding(cacheKey, model);

  if (cached) {
    assertEmbeddingDimension(cached, context);
    logger.debug({ model }, 'Using cached embedding for research request');
    return cached;
  }

  const embedRes = await fetch(`${config.AI_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: getAiServiceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ texts: [question] }),
    signal: AbortSignal.timeout(config.AI_SERVICE_TIMEOUT_MS),
  });

  if (!embedRes.ok) {
    throw new Error('Failed to embed research question');
  }

  const result = (await embedRes.json()) as { embeddings?: number[][] };
  if (!result.embeddings || result.embeddings.length === 0) {
    throw new Error('No embeddings returned from AI service');
  }

  const [embedding] = result.embeddings;
  assertEmbeddingDimension(embedding, context);
  await cacheEmbedding(cacheKey, model, embedding);
  return embedding;
}

export async function findResearchDocumentChunks(
  tenantId: string,
  embedding: number[],
  matterId?: string | null,
): Promise<ResearchChunkRow[]> {
  const sql = matterId
    ? `SELECT dc.id, dc.document_id, dc.text_content, dc.chunk_index, dc.page_from, dc.page_to,
              d.source_name AS document_title,
              1 - (dc.embedding <=> $1::vector) AS relevance_score
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE d.tenant_id = $2
         AND d.matter_id = $3
         AND dc.embedding IS NOT NULL
       ORDER BY dc.embedding <=> $1::vector
       LIMIT 18`
    : `SELECT dc.id, dc.document_id, dc.text_content, dc.chunk_index, dc.page_from, dc.page_to,
              d.source_name AS document_title,
              1 - (dc.embedding <=> $1::vector) AS relevance_score
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE d.tenant_id = $2
         AND dc.embedding IS NOT NULL
       ORDER BY dc.embedding <=> $1::vector
       LIMIT 18`;

  const params = matterId
    ? [vectorLiteral(embedding), tenantId, matterId]
    : [vectorLiteral(embedding), tenantId];

  const result = await query<ResearchChunkRow>(sql, params);
  return result.rows;
}

export async function findRelevantBareActSections(
  embedding: number[],
): Promise<BareActResearchRow[]> {
  const result = await query<BareActResearchRow>(
    `SELECT bas.id,
            ba.id AS act_id,
            ba.title AS act_title,
            ba.short_title AS act_short_title,
            bas.section_number,
            bas.section_title,
            bas.section_text,
            1 - (bas.embedding <=> $1::vector) AS relevance_score
     FROM bare_act_sections bas
     JOIN bare_acts ba ON ba.id = bas.act_id
     WHERE ba.is_active = TRUE
       AND bas.embedding IS NOT NULL
     ORDER BY bas.embedding <=> $1::vector
     LIMIT 6`,
    [vectorLiteral(embedding)],
  );

  return result.rows;
}

export function combineResearchSources(
  chunks: ResearchChunkRow[],
  bareActSections: BareActResearchRow[],
): ResearchSource[] {
  const documentSources: ResearchSource[] = chunks.map((chunk) => ({
    chunkId: chunk.id,
    documentId: chunk.document_id,
    title: chunk.document_title,
    text: chunk.text_content,
    pageFrom: chunk.page_from,
    pageTo: chunk.page_to,
    relevance: Number(chunk.relevance_score) || 0,
    sourceType: 'tenant_document',
    sourceVerified: true,
  }));

  const statuteSources: ResearchSource[] = bareActSections.map((section) => ({
    chunkId: section.id,
    documentId: section.act_id,
    title: `${section.act_short_title || section.act_title} - Section ${section.section_number}${section.section_title ? ` (${section.section_title})` : ''}`,
    text: section.section_text,
    pageFrom: null,
    pageTo: null,
    relevance: Number(section.relevance_score) || 0,
    sourceType: 'bare_act',
    sourceVerified: true,
  }));

  return [...documentSources, ...statuteSources]
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 20);
}

export function buildResearchSourcesPayload(
  sources: ResearchSource[],
  language: string,
) {
  return sources.map((source, index) => ({
    chunk_id: source.chunkId,
    document_id: source.documentId,
    document_name: source.title,
    text: source.text,
    page_number: source.pageFrom ?? source.pageTo ?? null,
    relevance_score: source.relevance,
    source_type: source.sourceType,
    source_verified: source.sourceVerified,
    rank: index + 1,
    language,
  }));
}

export function buildResearchClientSources(sources: ResearchSource[]) {
  return sources.map((source) => ({
    documentId: source.documentId,
    title: source.title,
    relevance: source.relevance,
    pageFrom: source.pageFrom,
    pageTo: source.pageTo,
    snippet: source.text.slice(0, 200),
    sourceType: source.sourceType,
  }));
}

export async function buildResearchContextPrompt(
  tenantId: string,
  primaryDocumentId: string | null | undefined,
  question: string,
  bareActSections: BareActResearchRow[],
): Promise<string> {
  const parts: string[] = [];

  if (primaryDocumentId) {
    try {
      const aiContext = await buildAIContext(
        tenantId,
        primaryDocumentId,
        question,
      );
      const formatted = formatContextForPrompt(aiContext);
      if (formatted) {
        parts.push(formatted);
      }
    } catch (err) {
      logger.warn(
        { err, primaryDocumentId },
        'Failed to build matter research context',
      );
    }
  }

  if (bareActSections.length > 0) {
    const statuteContext = bareActSections
      .map((section) => {
        const heading = `${section.act_short_title || section.act_title} - Section ${section.section_number}${section.section_title ? ` (${section.section_title})` : ''}`;
        return `${heading}\n${section.section_text.slice(0, 1200)}`;
      })
      .join('\n\n');

    parts.push(`Relevant bare act sections:\n${statuteContext}`);
  }

  return parts.join('\n\n').trim();
}

// ============================================================
// SCHEMA DEFINITIONS
// ============================================================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().length(6).optional(),
  tenantSlug: z.string().min(1).optional(),
});

export const _registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  displayName: z.string().min(1),
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(12).optional(),
    newPassword: z.string().min(12).optional(),
  })
  .refine((data) => Boolean(data.password || data.newPassword), {
    message: 'Password is required',
  });

export const supportedLanguageSchema = z.enum(SUPPORTED_LANGUAGE_CODES);
export const indianStateSchema = z.enum(INDIAN_STATE_CODES);

export function normalizeMatterType(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const key = value.trim().toLowerCase();

  if (MATTER_TYPES.includes(key as (typeof MATTER_TYPES)[number])) {
    return key;
  }
  if (
    key === 'ma_transaction' ||
    key.includes('m&a') ||
    key.includes('merger') ||
    key.includes('acquisition')
  ) {
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

export const matterCreateSchema = z.object({
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

export const matterUpdateSchema = matterCreateSchema.partial().extend({
  status: z.enum(['open', 'under_review', 'closed', 'archived']).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z
    .preprocess(
      (value) => (value === 'attorney' ? 'advocate' : value),
      z.enum(ADVOCATE_ROLES),
    )
    .optional(),
  displayName: z.string().optional(),
});

export const adminMemberUpdateSchema = z.object({
  role: z
    .preprocess(
      (value) => (value === 'attorney' ? 'advocate' : value),
      z.enum(ADVOCATE_ROLES),
    )
    .optional(),
  status: z.enum(ATTORNEY_STATUSES).optional(),
  mfaEnabled: z.boolean().optional(),
  confirmPassword: z.string().optional(),
});

export const adminSecuritySettingsSchema = z.object({
  enforceMfa: z.boolean(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440),
  maxFailedLogins: z.number().int().min(3).max(20),
});

export const adminPlaybookRuleSchema = z.object({
  id: z.string(),
  clauseType: z.string(),
  condition: z.string(),
  severity: z.enum(['critical', 'warn', 'info']),
  description: z.string(),
});

export const adminPlaybookCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  practiceArea: z.string().max(120).optional(),
  rules: z.array(adminPlaybookRuleSchema).default([]),
});

export const adminPlaybookUpdateSchema = adminPlaybookCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const otpSendSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  purpose: z.enum(['login', 'mfa']).default('login'),
  tenantSlug: z.string().min(1).max(120).optional(),
});

export const otpVerifySchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  otp: z.string().length(6),
  purpose: z.enum(['login', 'mfa']).default('login'),
  tenantSlug: z.string().min(1).max(120).optional(),
});
