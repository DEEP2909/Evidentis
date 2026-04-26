/**
 * EvidentIS API — admin Routes
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

import {
  adminMemberUpdateSchema,
  adminSecuritySettingsSchema,
  adminPlaybookCreateSchema,
  adminPlaybookUpdateSchema,
  inviteSchema,
  parseJsonObject,
} from './_helpers.js';
import { enforceAdvocateLimit } from '../billing-enforcement.js';
import { sendInvitationEmail } from '../email.js';
import { playbookRepo, attorneyRepo, tenantRepo } from '../repository.js';
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
  generateApiKey,
} from '../security.js';


export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // ADMIN ROUTES
  // ============================================================

  // GET /api/admin/members
  fastify.get(
    '/api/admin/members',
    { preHandler: [authenticateRequest, requireRoles('admin', 'partner')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;

      const members = await query<{
        id: string;
        display_name: string;
        email: string;
        role: string;
        status: string;
        mfa_enabled: boolean;
        last_login_at: Date | null;
      }>(
        `SELECT id, display_name, email, role, status, mfa_enabled, last_login_at
         FROM attorneys
         WHERE tenant_id = $1
         ORDER BY created_at ASC`,
        [authReq.tenantId],
      );

      return { success: true, data: { members: members.rows } };
    },
  );

  // PATCH /api/admin/attorneys/:id
  fastify.patch(
    '/api/admin/attorneys/:id',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = adminMemberUpdateSchema.parse(request.body);

      if (authReq.advocateId === id && (body.role || body.status)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SELF_UPDATE_RESTRICTED',
            message:
              'You cannot change your own role or status from this screen.',
          },
        });
      }

      const updates: string[] = [];
      const params: unknown[] = [id, authReq.tenantId];
      let paramIndex = 3;

      if (body.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        params.push(body.role);
      }
      if (body.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(body.status);
      }
      if (body.mfaEnabled !== undefined) {
        if (body.mfaEnabled === false) {
          // STEP-UP: Require admin password to disable MFA for someone else
          if (!body.confirmPassword) {
            return reply.status(400).send({
              success: false,
              error: {
                code: 'PASSWORD_REQUIRED',
                message: 'Admin password is required to disable MFA for team members.',
              },
            });
          }

          const admin = await queryOne<{ password_hash: string }>(
            'SELECT password_hash FROM attorneys WHERE id = $1 AND tenant_id = $2',
            [authReq.advocateId, authReq.tenantId],
          );

          if (!admin || !(await verifyPassword(body.confirmPassword, admin.password_hash))) {
            return reply.status(401).send({
              success: false,
              error: { code: 'INVALID_PASSWORD', message: 'Invalid admin password' },
            });
          }

          updates.push('mfa_secret = NULL');
          updates.push('mfa_recovery_codes = NULL');

          // Notify user
          const user = await queryOne<{ email: string; display_name: string }>(
            'SELECT email, display_name FROM attorneys WHERE id = $1 AND tenant_id = $2',
            [id, authReq.tenantId],
          );
          if (user) {
            const { sendMfaDisabledEmail } = await import('../email.js');
            await sendMfaDisabledEmail(user.email, user.display_name, 'an Admin');
          }
        }
        updates.push(`mfa_enabled = $${paramIndex++}`);
        params.push(body.mfaEnabled);
      }

      if (updates.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_UPDATES',
            message: 'No member updates were provided.',
          },
        });
      }

      const updated = await queryOne<{
        id: string;
        display_name: string;
        email: string;
        role: string;
        status: string;
        mfa_enabled: boolean;
        last_login_at: Date | null;
      }>(
        `UPDATE attorneys
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, display_name, email, role, status, mfa_enabled, last_login_at`,
        params,
      );

      if (!updated) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'MEMBER_NOT_FOUND',
            message: 'Team member not found.',
          },
        });
      }

      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id, metadata)
         VALUES ($1, $2, 'user.updated', 'attorney', $3, $4::jsonb)`,
        [authReq.tenantId, authReq.advocateId, id, JSON.stringify(body)],
      );

      return { success: true, data: updated };
    },
  );

  // GET /api/admin/security-settings
  fastify.get(
    '/api/admin/security-settings',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const tenant = await queryOne<{ settings: unknown }>(
        'SELECT settings FROM tenants WHERE id = $1',
        [authReq.tenantId],
      );

      const settings = parseJsonObject(tenant?.settings);
      const adminSecurity = parseJsonObject(settings.adminSecurity);

      return {
        success: true,
        data: {
          enforceMfa: Boolean(adminSecurity.enforceMfa ?? true),
          sessionTimeoutMinutes: Number(
            adminSecurity.sessionTimeoutMinutes ?? 60,
          ),
          maxFailedLogins: Number(adminSecurity.maxFailedLogins ?? 5),
        },
      };
    },
  );

  // PATCH /api/admin/security-settings
  fastify.patch(
    '/api/admin/security-settings',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const body = adminSecuritySettingsSchema.parse(request.body);

      const tenant = await queryOne<{ settings: unknown }>(
        'SELECT settings FROM tenants WHERE id = $1',
        [authReq.tenantId],
      );

      const currentSettings = parseJsonObject(tenant?.settings);
      const nextSettings = {
        ...currentSettings,
        adminSecurity: body,
      };

      await query(
        'UPDATE tenants SET settings = $2::jsonb, updated_at = NOW() WHERE id = $1',
        [authReq.tenantId, JSON.stringify(nextSettings)],
      );

      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, metadata)
         VALUES ($1, $2, 'admin.security_configured', 'tenant', $3::jsonb)`,
        [authReq.tenantId, authReq.advocateId, JSON.stringify(body)],
      );

      return { success: true, data: body };
    },
  );

  // GET /api/admin/sso
  fastify.get(
    '/api/admin/sso',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;

      const configs = await query<{
        id: string;
        provider_type: string;
        issuer_url: string | null;
        sso_url: string | null;
        enabled: boolean;
        updated_at: Date | null;
      }>(
        `SELECT id, provider_type, issuer_url, sso_url, enabled, updated_at
         FROM sso_configurations
         WHERE tenant_id = $1
         ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
        [authReq.tenantId],
      );

      return { success: true, data: configs.rows };
    },
  );

  // POST /api/admin/sso/saml
  fastify.post(
    '/api/admin/sso/saml',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          ssoUrl: z.string().url(),
          certificate: z.string().min(20),
        })
        .parse(request.body);

      const entityId = `${config.FRONTEND_URL.replace(/\/$/, '')}/saml/${authReq.tenantId}`;
      const record = await queryOne<{ id: string }>(
        `INSERT INTO sso_configurations (
           tenant_id, provider_type, issuer_url, metadata_url, certificate,
           sso_url, sign_requests, want_signed_assertions, enabled, created_at
         )
         VALUES ($1, 'saml', $2, $3, $4, $5, true, true, true, NOW())
         ON CONFLICT (tenant_id, provider_type) DO UPDATE SET
           issuer_url = EXCLUDED.issuer_url,
           metadata_url = EXCLUDED.metadata_url,
           certificate = EXCLUDED.certificate,
           sso_url = EXCLUDED.sso_url,
           enabled = true,
           updated_at = NOW()
         RETURNING id`,
        [
          authReq.tenantId,
          entityId,
          `${entityId}/metadata`,
          body.certificate,
          body.ssoUrl,
        ],
      );

      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id, metadata)
         VALUES ($1, $2, 'admin.sso_configured', 'sso_configuration', $3, $4::jsonb)`,
        [
          authReq.tenantId,
          authReq.advocateId,
          record?.id ?? null,
          JSON.stringify({ provider: 'saml', ssoUrl: body.ssoUrl }),
        ],
      );

      return {
        success: true,
        data: {
          id: record?.id ?? '',
          providerType: 'saml',
          issuerUrl: entityId,
          ssoUrl: body.ssoUrl,
          metadataUrl: `${entityId}/metadata`,
          enabled: true,
        },
      };
    },
  );

  // GET /api/admin/playbooks
  fastify.get(
    '/api/admin/playbooks',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const playbooks = await playbookRepo.list(authReq.tenantId);
      return { success: true, data: playbooks };
    },
  );

  // POST /api/admin/playbooks
  fastify.post(
    '/api/admin/playbooks',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = adminPlaybookCreateSchema.parse(request.body);
      const playbook = await playbookRepo.create(authReq.tenantId, {
        name: body.name,
        description: body.description,
        practiceArea: body.practiceArea,
        rules: body.rules,
        createdBy: authReq.advocateId,
      });

      return reply.status(201).send({ success: true, data: playbook });
    },
  );

  // PATCH /api/admin/playbooks/:id
  fastify.patch(
    '/api/admin/playbooks/:id',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = adminPlaybookUpdateSchema.parse(request.body);
      const playbook = await playbookRepo.update(authReq.tenantId, id, body);

      if (!playbook) {
        return reply.status(404).send({
          success: false,
          error: { code: 'PLAYBOOK_NOT_FOUND', message: 'Playbook not found.' },
        });
      }

      return { success: true, data: playbook };
    },
  );

  // DELETE /api/admin/playbooks/:id
  fastify.delete(
    '/api/admin/playbooks/:id',
    { preHandler: [authenticateRequest, requireRoles('admin')] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      const deleted = await query(
        'DELETE FROM playbooks WHERE tenant_id = $1 AND id = $2',
        [authReq.tenantId, id],
      );

      if (deleted.rowCount === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'PLAYBOOK_NOT_FOUND', message: 'Playbook not found.' },
        });
      }

      return { success: true };
    },
  );

  // POST /api/admin/attorneys (invite)
  fastify.post(
    '/api/admin/attorneys',
    {
      preHandler: [
        authenticateRequest,
        requireRoles('admin', 'partner'),
        enforceAdvocateLimit,
      ],
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = inviteSchema.parse(request.body);

      // Check if email already exists in tenant
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM attorneys WHERE email = $1 AND tenant_id = $2',
        [body.email.toLowerCase(), authReq.tenantId],
      );

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already exists in this organization',
          },
        });
      }

      // Generate invitation token
      const token = generateSecureToken(32);
      const tokenHash = hashToken(token);

      await query(
        `INSERT INTO invitations (tenant_id, email, role, token_hash, invited_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          authReq.tenantId,
          body.email.toLowerCase(),
          body.role || 'junior_advocate',
          tokenHash,
          authReq.advocateId,
        ],
      );

      // Get tenant and inviter info
      const tenant = await queryOne<{ name: string }>(
        'SELECT name FROM tenants WHERE id = $1',
        [authReq.tenantId],
      );
      const inviter = await queryOne<{ display_name: string }>(
        'SELECT display_name FROM attorneys WHERE id = $1',
        [authReq.advocateId],
      );

      // Send invitation email
      const inviteUrl = `${config.FRONTEND_URL}/invitation/${token}`;
      await sendInvitationEmail(
        body.email,
        inviteUrl,
        tenant?.name || 'Your Firm',
        inviter?.display_name || 'A colleague',
      );

      return reply.status(201).send({ success: true });
    },
  );

  // GET /api/admin/audit-log
  fastify.get(
    '/api/admin/audit-log',
    { preHandler: [authenticateRequest, requireRoles('admin', 'partner')] },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = request.query as {
        page?: string;
        limit?: string;
        eventType?: string;
      };

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '50', 10),
        100,
      );
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
        [...params, limit, offset],
      );

      return { success: true, data: events.rows };
    },
  );

  // ============================================================
}
