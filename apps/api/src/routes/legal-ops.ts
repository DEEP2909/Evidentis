/**
 * EvidentIS API — legalOps Routes
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
  getAiServiceHeaders,
  supportedLanguageSchema,
  indianStateSchema,
  toActSlug,
} from './_helpers.js';
import {
  enforceActiveSubscription,
} from '../billing-enforcement.js';


export default async function legalOpsRoutes(fastify: FastifyInstance): Promise<void> {
  // INDIA LEGAL OPERATIONS ROUTES
  // ============================================================

  // GET /api/bare-acts
  fastify.get(
    '/api/bare-acts',
    { preHandler: authenticateRequest },
    async (request) => {
      const queryParams = z
        .object({
          language: supportedLanguageSchema.optional(),
          search: z.string().optional(),
          limit: z.string().optional(),
          offset: z.string().optional(),
        })
        .parse(request.query);

      const limitNum = Math.min(
        Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1),
        200,
      );
      const offsetNum = Math.max(
        Number.parseInt(queryParams.offset || '0', 10) || 0,
        0,
      );
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
        params,
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
    },
  );

  // GET /api/bare-acts/:slug
  fastify.get(
    '/api/bare-acts/:slug',
    { preHandler: authenticateRequest },
    async (request, reply) => {
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
        [normalizedSlug],
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
        [act.id],
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
    },
  );

  // GET /api/court-cases
  fastify.get(
    '/api/court-cases',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = z
        .object({
          matterId: z.string().uuid().optional(),
          status: z.string().optional(),
          limit: z.string().optional(),
        })
        .parse(request.query);

      const limitNum = Math.min(
        Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1),
        200,
      );
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
        params,
      );

      return { success: true, data: rows.rows };
    },
  );

  // POST /api/court-cases
  fastify.post(
    '/api/court-cases',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          matterId: z.string().uuid().optional(),
          cnrNumber: z.string().min(6).max(64),
          courtName: z.string().min(2).max(200),
          courtComplex: z.string().max(200).optional(),
          caseType: z.string().max(120).optional(),
          filingDate: z.string().optional(),
          currentStatus: z.string().max(120).optional(),
          nextHearingDate: z.string().optional(),
        })
        .parse(request.body);

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
          ],
        );

        return reply.status(201).send({
          success: true,
          data: { id: created?.id, syncStatus: 'pending' },
        });
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error &&
          'code' in error &&
          (error as { code?: string }).code === '23505'
        ) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'CNR_EXISTS',
              message: 'Court case with this CNR already exists',
            },
          });
        }
        throw error;
      }
    },
  );

  // GET /api/hearings
  fastify.get(
    '/api/hearings',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = z
        .object({
          matterId: z.string().uuid().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          limit: z.string().optional(),
        })
        .parse(request.query);

      const limitNum = Math.min(
        Math.max(Number.parseInt(queryParams.limit || '100', 10) || 100, 1),
        500,
      );
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
        params,
      );

      return { success: true, data: rows.rows };
    },
  );

  // GET /api/invoices
  fastify.get(
    '/api/invoices',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = z
        .object({
          status: z.string().optional(),
          limit: z.string().optional(),
        })
        .parse(request.query);

      const limitNum = Math.min(
        Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1),
        200,
      );
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
        params,
      );

      return { success: true, data: rows.rows };
    },
  );

  // POST /api/invoices
  fastify.post(
    '/api/invoices',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          matterId: z.string().uuid().optional(),
          clientName: z.string().min(2).max(200),
          clientGstin: z.string().max(32).optional(),
          invoiceNumber: z.string().max(64).optional(),
          issueDate: z.string().optional(),
          dueDate: z.string(),
          gstRate: z.number().min(0).max(40).optional(),
          status: z.enum(['draft', 'issued', 'paid', 'void']).optional(),
          lineItems: z
            .array(
              z.object({
                description: z.string().min(1).max(500),
                quantity: z.number().positive().default(1),
                unitAmountPaise: z.number().int().positive(),
              }),
            )
            .min(1),
        })
        .parse(request.body);

      const issueDate = body.issueDate || new Date().toISOString().slice(0, 10);
      const customInvoiceNumber = body.invoiceNumber?.trim();
      const gstRate = body.gstRate ?? config.GST_RATE;
      const subtotalPaise = body.lineItems.reduce(
        (sum, item) => sum + Math.round(item.quantity * item.unitAmountPaise),
        0,
      );
      const gstAmountPaise = Math.round((subtotalPaise * gstRate) / 100);
      const totalPaise = subtotalPaise + gstAmountPaise;

      try {
        const created = await withTransaction(async (tx) => {
          let invoiceNumber = customInvoiceNumber;
          if (!invoiceNumber) {
            const parsedIssueDate = new Date(issueDate);
            if (Number.isNaN(parsedIssueDate.getTime())) {
              throw new Error('Invalid invoice issue date');
            }

            const issueYear = parsedIssueDate.getUTCFullYear();
            const issueMonth = parsedIssueDate.getUTCMonth() + 1;
            const fyStartYear = issueMonth >= 4 ? issueYear : issueYear - 1;
            const fyEndYearShort = String((fyStartYear + 1) % 100).padStart(
              2,
              '0',
            );
            const fyLabel = `${fyStartYear}-${fyEndYearShort}`;
            const prefix = `EVD/${fyLabel}/`;

            await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
              `invoice:${authReq.tenantId}:${fyLabel}`,
            ]);

            const sequenceResult = await tx.queryOne<{
              max_seq: number | null;
            }>(
              `SELECT COALESCE(MAX(NULLIF(substring(invoice_number FROM '([0-9]{4,})$'), '')::integer), 0) AS max_seq
             FROM invoices
             WHERE tenant_id = $1
               AND invoice_number LIKE $2`,
              [authReq.tenantId, `${prefix}%`],
            );

            const nextSequence = (sequenceResult?.max_seq ?? 0) + 1;
            invoiceNumber = `${prefix}${String(nextSequence).padStart(4, '0')}`;
          }

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
            ],
          );

          for (const item of body.lineItems) {
            const lineTotal = Math.round(item.quantity * item.unitAmountPaise);
            await tx.query(
              `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_amount_paise, total_amount_paise)
             VALUES ($1, $2, $3, $4, $5)`,
              [
                invoice?.id,
                item.description,
                item.quantity,
                item.unitAmountPaise,
                lineTotal,
              ],
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
            ],
          );

          return {
            id: invoice?.id,
            invoiceNumber,
          };
        });

        return reply.status(201).send({
          success: true,
          data: {
            id: created?.id,
            invoiceNumber: created?.invoiceNumber,
            subtotalPaise,
            gstAmountPaise,
            totalPaise,
            status: body.status || 'draft',
          },
        });
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error &&
          'code' in error &&
          (error as { code?: string }).code === '23505'
        ) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'INVOICE_NUMBER_EXISTS',
              message: 'Invoice number already exists for this tenant',
            },
          });
        }
        throw error;
      }
    },
  );

  // PATCH /api/invoices/:id/finalize
  fastify.patch(
    '/api/invoices/:id/finalize',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

      // Validate FIRM_GSTIN format
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!config.FIRM_GSTIN || !gstinRegex.test(config.FIRM_GSTIN)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FIRM_GSTIN',
            message: 'A valid firm GSTIN must be configured in settings before issuing invoices.',
          },
        });
      }

      const result = await query(
        `UPDATE invoices 
         SET status = 'issued', firm_gstin = $1
         WHERE id = $2 AND tenant_id = $3 AND status = 'draft'
         RETURNING id`,
        [config.FIRM_GSTIN, id, authReq.tenantId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND_OR_NOT_DRAFT',
            message: 'Invoice not found or already issued.',
          },
        });
      }

      return reply.send({ success: true });
    }
  );

  // GET /api/dpdp/requests
  fastify.get(
    '/api/dpdp/requests',
    { preHandler: authenticateRequest },
    async (request) => {
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
        [authReq.tenantId],
      );

      return { success: true, data: rows.rows };
    },
  );

  // POST /api/dpdp/consent
  fastify.post(
    '/api/dpdp/consent',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          accepted: z.boolean(),
          version: z.string().optional(),
          details: z.string().max(1000).optional(),
        })
        .parse(request.body);

      if (!body.accepted) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CONSENT_REQUIRED',
            message: 'DPDP consent must be accepted',
          },
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
          [authReq.tenantId, request.ip],
        );
        await tx.query(
          `INSERT INTO dpdp_requests (tenant_id, advocate_id, request_type, status, details, resolved_at)
         VALUES ($1, $2, 'consent', 'resolved', $3, NOW())`,
          [authReq.tenantId, authReq.advocateId, detailPayload],
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
    },
  );

  // ============================================================

  // OBLIGATION ROUTES
  // ============================================================

  // GET /api/obligations - List all obligations for tenant
  fastify.get(
    '/api/obligations',
    { preHandler: authenticateRequest },
    async (request) => {
      const authReq = request as AuthenticatedRequest;
      const queryParams = request.query as {
        status?: string;
        matterId?: string;
        page?: string;
        limit?: string;
      };

      const page = Number.parseInt(queryParams.page || '1', 10);
      const limit = Math.min(
        Number.parseInt(queryParams.limit || '20', 10),
        100,
      );
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
        [...params, limit, offset],
      );

      return { success: true, data: obligations.rows };
    },
  );

  // POST /api/obligations - Create manual obligation
  fastify.post(
    '/api/obligations',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const body = z
        .object({
          matterId: z.string().uuid(),
          documentId: z.string().uuid().optional(),
          obligationType: z.string(),
          description: z.string(),
          responsibleParty: z.enum([
            'client',
            'counterparty',
            'both',
            'third_party',
          ]),
          deadline: z.string().optional(),
          priority: z
            .enum(['low', 'normal', 'high', 'critical'])
            .default('normal'),
          reminderDaysBefore: z.array(z.number()).optional(),
        })
        .parse(request.body);

      // Verify matter access
      const matter = await queryOne<{ id: string }>(
        'SELECT id FROM matters WHERE id = $1 AND tenant_id = $2',
        [body.matterId, authReq.tenantId],
      );

      if (!matter) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Matter not found' } });
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
        ],
      );

      return reply
        .status(201)
        .send({ success: true, data: { id: obligation?.id } });
    },
  );

  // PATCH /api/obligations/:id - Update obligation
  fastify.patch(
    '/api/obligations/:id',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = z
        .object({
          status: z
            .enum(['pending', 'in_progress', 'completed', 'overdue', 'waived'])
            .optional(),
          priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
          deadline: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(request.body);

      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM obligations WHERE id = $1 AND tenant_id = $2',
        [id, authReq.tenantId],
      );

      if (!existing) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Obligation not found' } });
      }

      const updates: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (body.status) {
        updates.push(`status = $${paramIndex}`);
        values.push(body.status);
        paramIndex++;
        if (body.status === 'completed') {
          updates.push('completed_at = NOW()');
          updates.push(`completed_by = $${paramIndex}`);
          values.push(authReq.advocateId);
          paramIndex++;
        }
      }
      if (body.priority) {
        updates.push(`priority = $${paramIndex}`);
        values.push(body.priority);
        paramIndex++;
      }
      if (body.deadline) {
        updates.push(`deadline = $${paramIndex}`);
        values.push(body.deadline);
        paramIndex++;
      }
      if (body.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        values.push(body.notes);
        paramIndex++;
      }

      values.push(id, authReq.tenantId);

      await query(
        `UPDATE obligations SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
        values,
      );

      return { success: true };
    },
  );

  // POST /api/obligations/:id/calendar - Export obligation as iCal
  fastify.post(
    '/api/obligations/:id/calendar',
    { preHandler: authenticateRequest },
    async (request, reply) => {
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
        [id, authReq.tenantId],
      );

      if (!obligation) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Obligation not found' } });
      }

      if (!obligation.deadline) {
        return reply
          .status(400)
          .send({
            success: false,
            error: { message: 'Obligation has no deadline' },
          });
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
      reply.header(
        'Content-Disposition',
        `attachment; filename="obligation-${id}.ics"`,
      );
      return reply.send(ical);
    },
  );

  // GET /api/obligations/:id/remind - Send reminder for obligation
  fastify.get(
    '/api/obligations/:id/remind',
    { preHandler: authenticateRequest },
    async (request, reply) => {
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
        [id, authReq.tenantId],
      );

      if (!obligation) {
        return reply
          .status(404)
          .send({ success: false, error: { message: 'Obligation not found' } });
      }

      // Queue reminder email job
      const { addJob } = await import('../worker.js');
      await addJob('obligation.remind', {
        tenantId: authReq.tenantId,
        obligationId: id,
        matterId: obligation.matter_id,
      });

      // Update last reminder sent
      await query(
        'UPDATE obligations SET last_reminder_sent_at = NOW() WHERE id = $1',
        [id],
      );

      return { success: true, data: { message: 'Reminder sent' } };
    },
  );

  // ============================================================
}
