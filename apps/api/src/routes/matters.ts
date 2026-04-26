/**
 * EvidentIS API — matter Routes
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
  matterCreateSchema,
  matterUpdateSchema,
  parseJsonObject,
  getAiServiceHeaders,
  resolveCorsOrigin,
} from './_helpers.js';
import { redis } from '../redis.js';
import {
  generateSecureToken,
  hashToken,
} from '../security.js';
import { sendInvitationEmail } from '../email.js';


export default async function matterRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================================
  // MATTER ROUTES
  // ============================================================

  // GET /api/matters
  fastify.get(
    '/api/matters',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = request.query as {
        page?: string;
        limit?: string;
        status?: string;
        search?: string;
      };

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '20', 10),
        100,
      );
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
        [...params, limit, offset],
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM matters m ${whereClause}`,
        params,
      );

      return {
        success: true,
        data: {
          matters: matters.rows,
          pagination: {
            page,
            limit,
            total: Number.parseInt(countResult?.count || '0', 10),
            totalPages: Math.ceil(
              Number.parseInt(countResult?.count || '0', 10) / limit,
            ),
          },
        },
      };
    },
  );

  // POST /api/matters
  fastify.post(
    '/api/matters',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = matterCreateSchema.parse(request.body);
      const leadAdvocateId = body.leadAdvocateId ?? null;
      const dealValuePaise = body.dealValuePaise ?? body.dealValueCents ?? null;

      const matter = await queryOne<{ id: string }>(
        `INSERT INTO matters (tenant_id, matter_code, matter_name, matter_type, client_name,
                            counterparty_name, governing_law_state, priority, lead_advocate_id,
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
        ],
      );

      // Log audit event
      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id, metadata)
       VALUES ($1, $2, 'matter.created', 'matter', $3, $4)`,
        [
          authReq.tenantId,
          authReq.advocateId,
          matter?.id,
          JSON.stringify(body),
        ],
      );

      return reply.status(201).send({
        success: true,
        data: { id: matter?.id },
      });
    },
  );

  // GET /api/matters/:id
  fastify.get(
    '/api/matters/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
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
        target_close_date: Date | null;
        deal_value_paise: number | null;
        deal_value_cents: number | null;
        notes: string | null;
        tags: string[];
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, matter_code, matter_name, matter_type, client_name, counterparty_name,
              governing_law_state, status, priority, health_score, lead_advocate_id,
              target_close_date, deal_value_paise, deal_value_cents, notes, tags, created_at, updated_at
       FROM matters WHERE id = $1 AND tenant_id = $2`,
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Matter not found' },
        });
      }

      return { success: true, data: matter };
    },
  );

  // PATCH /api/matters/:id
  fastify.patch(
    '/api/matters/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = matterUpdateSchema.parse(request.body);
      const normalizedBody = { ...body } as Record<string, unknown>;
      if (body.leadAdvocateId !== undefined || body.leadAttorneyId !== undefined) {
        const resolvedLead = body.leadAdvocateId ?? body.leadAttorneyId ?? null;
        normalizedBody.leadAdvocateId = resolvedLead;
        normalizedBody.leadAttorneyId = undefined;
      }
      if (
        body.dealValuePaise !== undefined ||
        body.dealValueCents !== undefined
      ) {
        const resolvedValue =
          body.dealValuePaise ?? body.dealValueCents ?? null;
        normalizedBody.dealValuePaise = resolvedValue;
        normalizedBody.dealValueCents = resolvedValue;
      }

      // Check matter exists and belongs to tenant
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Matter not found' },
        });
      }

      // Build dynamic update query
      const updates: string[] = ['"updated_at" = NOW()'];
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
        targetCloseDate: 'target_close_date',
        dealValuePaise: 'deal_value_paise',
        dealValueCents: 'deal_value_cents',
        notes: 'notes',
        tags: 'tags',
      };

      for (const [key, column] of Object.entries(fieldMap)) {
        if (normalizedBody[key] !== undefined) {
          updates.push(`"${column}" = $${paramIndex}`);
          values.push(normalizedBody[key]);
          paramIndex++;
        }
      }

      values.push(id, authReq.tenantId);

      await query(
        `UPDATE matters SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
        values,
      );

      // Log audit event
      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id, metadata)
       VALUES ($1, $2, 'matter.updated', 'matter', $3, $4)`,
        [
          authReq.tenantId,
          authReq.advocateId,
          id,
          JSON.stringify(normalizedBody),
        ],
      );

      return { success: true };
    },
  );

  // ============================================================

  // MATTER ADDITIONAL ROUTES
  // ============================================================

  // DELETE /api/matters/:id - Delete/archive matter
  fastify.delete(
    '/api/matters/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      const existing = await queryOne<{ id: string; status: string }>(
        'SELECT id, status FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!existing) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Matter not found' } });
      }

      // Soft delete - set to archived
      await query(
        `UPDATE matters SET status = 'archived', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [id, authReq.tenantId],
      );

      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id)
       VALUES ($1, $2, 'matter.archived', 'matter', $3)`,
        [authReq.tenantId, authReq.advocateId, id],
      );

      return { success: true };
    },
  );

  // GET /api/matters/:id/timeline - Get matter timeline events
  fastify.get(
    '/api/matters/:id/timeline',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const queryParams = request.query as { limit?: string };
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '50', 10),
        100,
      );

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
        [authReq.tenantId, id, limit],
      );

      return { success: true, data: timeline.rows };
    },
  );

  // GET /api/matters/:id/analytics - Get matter-specific analytics
  fastify.get(
    '/api/matters/:id/analytics',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      // Verify matter exists
      const matter = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Matter not found' } });
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
        [id, authReq.tenantId],
      );

      return {
        success: true,
        data: {
          totalDocuments: analytics?.total_documents || 0,
          processedDocuments: analytics?.processed_documents || 0,
          processingQueue:
            (analytics?.total_documents || 0) -
            (analytics?.processed_documents || 0),
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
    },
  );

  // POST /api/matters/:id/share-links - Create client portal share link
  fastify.post(
    '/api/matters/:id/share-links',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = z
        .object({
          accessLevel: z.enum(['read', 'comment']).default('read'),
          expiresInDays: z.number().min(1).max(90).default(7),
          maxViews: z.number().min(1).max(1000).optional(),
          watermarkText: z.string().optional(),
        })
        .parse(request.body);

      // Verify matter exists
      const matter = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Matter not found' } });
      }

      const token = generateSecureToken(32);
      const tokenHash = hashToken(token);
      const expiresAt = new Date(
        Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000,
      );

      const shareLink = await queryOne<{ id: string }>(
        `INSERT INTO share_links (tenant_id, matter_id, token_hash, access_level, watermark_text, expires_at, max_views, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
        [
          authReq.tenantId,
          id,
          tokenHash,
          body.accessLevel,
          body.watermarkText || null,
          expiresAt,
          body.maxViews || 50,
          authReq.advocateId,
        ],
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
    },
  );

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
      [tokenHash],
    );

    if (!shareLink) {
      return reply
        .status(404)
        .send({ success: false, error: { message: 'Invalid shared link' } });
    }

    if (new Date(shareLink.expires_at).getTime() < Date.now()) {
      return reply
        .status(410)
        .send({
          success: false,
          error: { message: 'Shared link has expired' },
        });
    }

    if (
      shareLink.max_views !== null &&
      shareLink.view_count >= shareLink.max_views
    ) {
      return reply
        .status(410)
        .send({
          success: false,
          error: { message: 'Shared link view limit reached' },
        });
    }

    await query(
      'UPDATE share_links SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1',
      [shareLink.id],
    );

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
      [shareLink.tenant_id, shareLink.matter_id],
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
      [shareLink.tenant_id, shareLink.matter_id],
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
      [shareLink.tenant_id, shareLink.matter_id],
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
  fastify.get(
    '/api/portal/:shareToken/documents/:documentId/download',
    async (request, reply) => {
      const { shareToken, documentId } = request.params as {
        shareToken: string;
        documentId: string;
      };
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
        [tokenHash],
      );

      if (!shareLink) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Invalid shared link' } });
      }

      if (new Date(shareLink.expires_at).getTime() < Date.now()) {
        return reply
          .status(410)
          .send({
            success: false,
            error: { message: 'Shared link has expired' },
          });
      }

      if (
        shareLink.max_views !== null &&
        shareLink.view_count >= shareLink.max_views
      ) {
        return reply
          .status(410)
          .send({
            success: false,
            error: { message: 'Shared link view limit reached' },
          });
      }

      const document = await queryOne<{
        id: string;
        source_name: string;
        file_uri: string | null;
      }>(
        `SELECT id, source_name, file_uri
       FROM documents
       WHERE id = $1 AND tenant_id = $2 AND matter_id = $3`,
        [documentId, shareLink.tenant_id, shareLink.matter_id],
      );

      if (!document || !document.file_uri) {
        return reply
          .status(404)
          .send({
            success: false,
            error: { message: 'Document not available' },
          });
      }

      const storage = await import('../storage.js');
      const downloadUrl = await storage.getSignedDownloadUrl(
        document.file_uri,
        900,
      );

      return {
        success: true,
        data: { downloadUrl, fileName: document.source_name },
      };
    },
  );

  // POST /api/matters/:id/report - Generate executive report
  fastify.post(
    '/api/matters/:id/report',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = z
        .object({
          format: z.enum(['pdf', 'docx']).default('pdf'),
          sections: z
            .array(
              z.enum([
                'summary',
                'flags',
                'clauses',
                'obligations',
                'timeline',
              ]),
            )
            .default(['summary', 'flags', 'clauses']),
        })
        .parse(request.body);

      // Verify matter exists
      const matter = await queryOne<{ id: string; matter_name: string }>(
        'SELECT id, matter_name FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Matter not found' } });
      }

      // Queue report generation job
      const { addJob } = await import('../worker.js');
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
          message:
            'Report generation started. You will be notified when ready.',
        },
      };
    },
  );

  // ============================================================
}
