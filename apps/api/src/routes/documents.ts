/**
 * EvidentIS API — document Routes
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

import { fileTypeFromBuffer } from 'file-type';
import { createDualRateLimiter } from '../rate-limit.js';
const aiSuggestionRateLimit = createDualRateLimiter('ai', 'ai_burst');
import {
  enforceActiveSubscription,
  enforceDocumentQuota,
  incrementDocumentUsage,
} from '../billing-enforcement.js';
import { startDocumentPipeline, getPipelineStatus } from '../orchestrator.js';
import {
  parseJsonObject,
  getAiServiceHeaders,
} from './_helpers.js';


export default async function documentRoutes(fastify: FastifyInstance): Promise<void> {
  // DOCUMENT ROUTES
  // ============================================================

  // POST /api/documents/upload
  fastify.post(
    '/api/documents/upload',
    {
      preHandler: [
        authenticateRequest,
        enforceActiveSubscription,
        enforceDocumentQuota,
      ],
    },
    async (request, reply) => {
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
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [matterId, authReq.tenantId],
      );

      if (!matter) {
        return reply.status(404).send({
          success: false,
          error: { code: 'MATTER_NOT_FOUND', message: 'Matter not found' },
        });
      }

      // Read file buffer
      const ALLOWED_MIME_TYPES = new Set([
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'image/gif',
      ]);

      const buffer = await data.toBuffer();
      const detected = await fileTypeFromBuffer(buffer);

      let mimeType = detected?.mime;
      if (!mimeType && data.mimetype === 'text/plain') {
        // file-type cannot detect plain text reliably, allow if client claims it's text
        // and it looks like valid UTF-8
        try {
          // Check if buffer is valid UTF-8
          const decoder = new TextDecoder('utf-8', { fatal: true });
          decoder.decode(buffer);
          mimeType = 'text/plain';
        } catch {
          mimeType = 'application/octet-stream';
        }
      } else if (!mimeType) {
        // Do not trust the client mimetype for binary files. If file-type can't detect it, reject it.
        mimeType = 'application/octet-stream';
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return reply.status(415).send({
          success: false,
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: `File type ${mimeType} is not supported. Upload PDF, DOCX, DOC, or TXT files.`,
          },
        });
      }

      const sha256Hash = (await import('../security.js')).sha256(buffer);

      // Check for duplicate
      const duplicate = await queryOne<{ id: string }>(
        'SELECT id FROM documents WHERE sha256 = $1 AND tenant_id = $2',
        [sha256Hash, authReq.tenantId],
      );

      if (duplicate) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'DUPLICATE',
            message: 'Document already exists',
            documentId: duplicate.id,
          },
        });
      }

      // Determine doc type from filename
      const filename = data.filename;
      let docType = 'other';
      const lowerFilename = filename.toLowerCase();
      if (
        lowerFilename.includes('nda') ||
        lowerFilename.includes('confidential')
      )
        docType = 'nda';
      else if (
        lowerFilename.includes('spa') ||
        lowerFilename.includes('purchase')
      )
        docType = 'spa';
      else if (
        lowerFilename.includes('loi') ||
        lowerFilename.includes('intent')
      )
        docType = 'loi';
      else if (lowerFilename.includes('employment'))
        docType = 'employment_agreement';
      else if (lowerFilename.includes('lease')) docType = 'lease';
      else if (lowerFilename.includes('amendment')) docType = 'amendment';
      else if (
        lowerFilename.includes('contract') ||
        lowerFilename.includes('agreement')
      )
        docType = 'contract';

      // Insert document record
      const document = await queryOne<{ id: string }>(
        `INSERT INTO documents (tenant_id, matter_id, source_name, mime_type, doc_type, sha256, file_size_bytes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
        [
          authReq.tenantId,
          matterId,
          filename,
          mimeType,
          docType,
          sha256Hash,
          buffer.length,
          authReq.advocateId,
        ],
      );

      if (!document) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'DOCUMENT_CREATE_FAILED',
            message: 'Failed to create document',
          },
        });
      }

      // Store file in quarantine
      const storage = await import('../storage.js');
      const fileKey = storage.generateDocumentKey(
        authReq.tenantId,
        document.id,
        filename,
        'quarantine',
      );
      await storage.uploadFile(fileKey, buffer, { contentType: mimeType });

      // Update document with file URI
      await query('UPDATE documents SET file_uri = $1 WHERE id = $2', [
        fileKey,
        document.id,
      ]);

      // Start the document processing pipeline via orchestrator
      const pipelineId = await startDocumentPipeline({
        tenantId: authReq.tenantId,
        documentId: document.id,
        matterId,
        fileUri: fileKey,
      });
      logger.info(
        { documentId: document.id, pipelineId },
        'Document pipeline started',
      );

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
    },
  );

  // GET /api/documents/:id
  fastify.get(
    '/api/documents/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
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
        [id, authReq.tenantId],
      );

      if (!document) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      return { success: true, data: document };
    },
  );

  // GET /api/documents - List documents across the tenant
  fastify.get(
    '/api/documents',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = z
        .object({
          search: z.string().trim().optional(),
          status: z.string().trim().optional(),
          page: z.string().optional(),
          limit: z.string().optional(),
        })
        .parse(request.query ?? {});

      const page = Math.max(
        Number.parseInt(queryParams.page || '1', 10) || 1,
        1,
      );
      const limit = Math.min(
        Math.max(Number.parseInt(queryParams.limit || '20', 10) || 20, 1),
        100,
      );
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE d.tenant_id = $1';
      const params: unknown[] = [authReq.tenantId];

      if (queryParams.search) {
        params.push(`%${queryParams.search}%`);
        whereClause += ` AND (d.source_name ILIKE $${params.length} OR m.matter_name ILIKE $${params.length})`;
      }

      if (queryParams.status) {
        const status = queryParams.status.toLowerCase();
        if (status === 'processed') {
          whereClause += ` AND d.ingestion_status = 'normalized'`;
        } else if (status === 'processing') {
          whereClause += ` AND d.ingestion_status IN ('uploaded', 'scanning', 'processing')`;
        } else if (status === 'failed') {
          whereClause += ` AND d.ingestion_status = 'failed'`;
        } else {
          params.push(queryParams.status);
          whereClause += ` AND d.ingestion_status = $${params.length}`;
        }
      }

      const documents = await query<{
        id: string;
        matter_id: string;
        matter_name: string;
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
        `SELECT d.id,
              d.matter_id,
              m.matter_name,
              d.source_name,
              d.mime_type,
              d.doc_type,
              d.ingestion_status,
              d.security_status,
              d.page_count,
              d.word_count,
              d.created_at,
              d.updated_at
       FROM documents d
       JOIN matters m ON m.id = d.matter_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
       FROM documents d
       JOIN matters m ON m.id = d.matter_id
       ${whereClause}`,
        params,
      );

      const total = Number.parseInt(countResult?.count || '0', 10);

      return {
        success: true,
        data: {
          documents: documents.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    },
  );

  // DELETE /api/documents/:id - Delete a document and its derived analysis
  fastify.delete(
    '/api/documents/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      const document = await queryOne<{
        id: string;
        matter_id: string;
        source_name: string;
        file_uri: string | null;
      }>(
        `SELECT id, matter_id, source_name, file_uri
       FROM documents
       WHERE id = $1 AND tenant_id = $2`,
        [id, authReq.tenantId],
      );

      if (!document) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      try {
        const { cancelPipeline } = await import('../orchestrator.js');
        await cancelPipeline(authReq.tenantId, id).catch(() => false);
      } catch (error) {
        logger.warn(
          { error, documentId: id },
          'Failed to cancel outstanding document pipeline jobs',
        );
      }

      if (document.file_uri) {
        try {
          const storage = await import('../storage.js');
          await storage.deleteFile(document.file_uri);
        } catch (error) {
          logger.warn(
            { error, documentId: id, fileUri: document.file_uri },
            'Failed to remove document from storage',
          );
        }
      }

      await query(
        `DELETE FROM documents
       WHERE id = $1 AND tenant_id = $2`,
        [id, authReq.tenantId],
      );

      await query(
        `INSERT INTO audit_events (tenant_id, actor_advocate_id, event_type, object_type, object_id)
       VALUES ($1, $2, 'document.deleted', 'document', $3)`,
        [authReq.tenantId, authReq.advocateId, id],
      );

      return {
        success: true,
        data: {
          id,
          matterId: document.matter_id,
          sourceName: document.source_name,
        },
      };
    },
  );

  // GET /api/documents/:id/clauses
  fastify.get(
    '/api/documents/:id/clauses',
    { preHandler: authenticateRequest },
    async (request) => {
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
        [id, authReq.tenantId],
      );

      return { success: true, data: clauses.rows };
    },
  );

  // GET /api/matters/:id/documents - List documents for a matter
  fastify.get(
    '/api/matters/:id/documents',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const queryParams = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const matter = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Matter not found' },
          });
      }

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '20', 10),
        100,
      );
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
        [...params, limit, offset],
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM documents d ${whereClause}`,
        params,
      );

      return {
        success: true,
        data: {
          documents: documents.rows,
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

  // GET /api/matters/:id/clauses - List extracted clauses for a matter
  fastify.get(
    '/api/matters/:id/clauses',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const queryParams = request.query as {
        clauseType?: string;
        riskLevel?: string;
        page?: string;
        limit?: string;
      };

      const matter = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Matter not found' },
          });
      }

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '50', 10),
        100,
      );
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
        [...params, limit, offset],
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
       FROM clauses c
       JOIN documents d ON c.document_id = d.id
       ${whereClause}`,
        params,
      );

      return {
        success: true,
        data: {
          clauses: clauses.rows,
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

  // GET /api/matters/:id/flags - List flags for a matter
  fastify.get(
    '/api/matters/:id/flags',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const queryParams = request.query as {
        status?: string;
        severity?: string;
        page?: string;
        limit?: string;
      };

      const matter = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Matter not found' },
          });
      }

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '50', 10),
        100,
      );
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
        [...params, limit, offset],
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM flags f ${whereClause}`,
        params,
      );

      return {
        success: true,
        data: {
          flags: flags.rows,
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

  // PATCH /api/matters/:id/flags/:flagId - Update flag review status
  fastify.patch(
    '/api/matters/:id/flags/:flagId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id, flagId } = request.params as { id: string; flagId: string };
      const body = z
        .object({
          status: z.enum(['accepted', 'rejected', 'deferred', 'open']),
          notes: z.string().optional(),
        })
        .parse(request.body);

      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM flags WHERE id = $1 AND matter_id = $2 AND tenant_id = $3',
        [flagId, id, authReq.tenantId],
      );

      if (!existing) {
        return reply
          .status(404)
          .send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Flag not found' },
          });
      }

      const statusMap: Record<
        typeof body.status,
        'approved' | 'rejected' | 'waived' | 'open'
      > = {
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
        [
          mappedStatus,
          body.notes || null,
          resolvedStatuses,
          authReq.advocateId,
          flagId,
          id,
          authReq.tenantId,
        ],
      );

      return { success: true, data: { id: flagId, status: mappedStatus } };
    },
  );

  // ============================================================

  // DOCUMENT ADDITIONAL ROUTES
  // ============================================================

  // POST /api/documents/:id/suggest - Get AI redline suggestions
  fastify.post(
    '/api/documents/:id/suggest',
    { preHandler: [authenticateRequest, aiSuggestionRateLimit] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = z
        .object({
          clauseType: z.string().optional(),
          jurisdiction: z.string().optional(),
        })
        .parse(request.body);

      // Verify document access
      const document = await queryOne<{ id: string; matter_id: string }>(
        'SELECT id, matter_id FROM documents WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!document) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Document not found' } });
      }

      try {
        const response = await fetch(
          `${config.AI_SERVICE_URL}/suggest-redline`,
          {
            method: 'POST',
            headers: getAiServiceHeaders({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              documentId: id,
              tenantId: authReq.tenantId,
              clauseType: body.clauseType,
              jurisdiction: body.jurisdiction,
            }),
          },
        );

        if (!response.ok) {
          throw new Error('AI service error');
        }

        const suggestions = await response.json();
        return { success: true, data: suggestions };
      } catch (error) {
        logger.error({ error }, 'Failed to get AI suggestions');
        return reply
          .status(500)
          .send({
            success: false,
            error: { message: 'Failed to generate suggestions' },
          });
      }
    },
  );

  // POST /api/documents/:id/export - Export document as DOCX
  fastify.post(
    '/api/documents/:id/export',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = z
        .object({
          format: z.enum(['docx', 'pdf']).default('docx'),
          includeRedlines: z.boolean().default(true),
          includeComments: z.boolean().default(true),
        })
        .parse(request.body);

      const document = await queryOne<{
        id: string;
        source_name: string;
        file_uri: string;
      }>(
        'SELECT id, source_name, file_uri FROM documents WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!document) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Document not found' } });
      }

      // For now, return download URL to original file
      // Full implementation would generate DOCX with redlines
      const storage = await import('../storage.js');
      const url = await storage.getSignedDownloadUrl(document.file_uri, 3600);

      return { success: true, data: { downloadUrl: url, format: body.format } };
    },
  );

  // GET /api/documents/:id/flags - Get flags for a document
  fastify.get(
    '/api/documents/:id/flags',
    { preHandler: authenticateRequest },
    async (request) => {
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
        [id, authReq.tenantId],
      );

      return { success: true, data: documentFlags.rows };
    },
  );

  // GET /api/documents/:id/obligations - Get obligations from a document
  fastify.get(
    '/api/documents/:id/obligations',
    { preHandler: authenticateRequest },
    async (request) => {
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
        [id, authReq.tenantId],
      );

      return { success: true, data: documentObligations.rows };
    },
  );

  // ============================================================
}
