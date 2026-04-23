/**
 * EvidentIS Tenant Isolation Middleware
 * Enforces strict tenant separation at the middleware level
 * CRITICAL: Every database query MUST be filtered by tenant_id
 */

import type {
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';
import { pool } from './database.js';
import { logger } from './logger.js';

type SortDirection = 'ASC' | 'DESC';

type TenantScopeConfig =
  | { mode: 'column'; column: string }
  | {
      mode: 'parent';
      localColumn: string;
      parentTable: string;
      parentIdColumn: string;
      parentTenantColumn: string;
    }
  | { mode: 'global' };

interface TenantTableConfig {
  supportsSoftDelete: boolean;
  sortableColumns: Set<string>;
  tenantScope?: TenantScopeConfig;
}

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TENANT_TABLE_ALIASES: Record<string, string> = {
  sso_configs: 'sso_configurations',
};

const TENANT_TABLE_CONFIG: Record<string, TenantTableConfig> = {
  attorneys: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'updated_at',
      'display_name',
      'email',
      'status',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  matters: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'updated_at',
      'matter_name',
      'matter_code',
      'status',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  documents: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'updated_at',
      'source_name',
      'ingestion_status',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  document_chunks: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'chunk_index']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  clauses: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'clause_type', 'confidence']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  flags: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'severity', 'status']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  playbooks: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'name', 'version']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  obligations: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'deadline', 'status', 'priority']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  clause_suggestions: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'status', 'confidence']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  review_actions: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'action_type']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  audit_events: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'event_type', 'object_type']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  workflow_jobs: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'updated_at',
      'status',
      'job_type',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  research_history: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  ai_model_events: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'task_type', 'model_name']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  analytics_daily: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['date', 'created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  analytics_matters: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['date', 'matter_id', 'created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  user_activity: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'action']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  tenant_ai_quotas: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['updated_at', 'quota_reset_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  api_keys: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'last_used_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  invitations: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'expires_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  password_reset_tokens: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'expires_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  mfa_enrollments: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  refresh_tokens: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'expires_at', 'revoked_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  passkeys: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'last_used_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  webauthn_credentials: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'last_used_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  sso_configurations: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'updated_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  domain_verifications: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'domain']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  identity_links: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'provider']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  scim_tokens: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'expires_at', 'last_used_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  scim_sync_logs: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'operation', 'resource_type']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  share_links: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'expires_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  webhooks: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  court_cases: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'last_synced_at',
      'next_hearing_date',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  hearing_dates: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'hearing_date', 'next_date']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  cause_lists: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'cause_date', 'court_name']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  section_bookmarks: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  case_citations: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'judgment_date',
      'court',
      'citation_number',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  saved_judgments: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  legal_notices: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'response_deadline_at',
      'sent_at',
      'notice_type',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  notifications: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'sent_at', 'status', 'type']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  advocate_otps: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'expires_at', 'consumed_at']),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  dpdp_requests: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'resolved_at',
      'status',
      'request_type',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  invoices: {
    supportsSoftDelete: false,
    sortableColumns: new Set([
      'created_at',
      'issue_date',
      'due_date',
      'status',
    ]),
    tenantScope: { mode: 'column', column: 'tenant_id' },
  },
  invoice_line_items: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'description']),
    tenantScope: {
      mode: 'parent',
      localColumn: 'invoice_id',
      parentTable: 'invoices',
      parentIdColumn: 'id',
      parentTenantColumn: 'tenant_id',
    },
  },
  gst_details: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'sac_code', 'gst_rate']),
    tenantScope: {
      mode: 'parent',
      localColumn: 'invoice_id',
      parentTable: 'invoices',
      parentIdColumn: 'id',
      parentTenantColumn: 'tenant_id',
    },
  },
  bare_acts: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'title', 'year', 'language']),
    tenantScope: { mode: 'global' },
  },
  bare_act_sections: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'section_number', 'section_title']),
    tenantScope: { mode: 'global' },
  },
  legal_templates: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'name', 'category', 'language']),
    tenantScope: { mode: 'global' },
  },
  privacy_notices: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'language', 'version']),
    tenantScope: { mode: 'global' },
  },
  citation_networks: {
    supportsSoftDelete: false,
    sortableColumns: new Set(['created_at', 'relation_type']),
    tenantScope: { mode: 'global' },
  },
};

function normalizeTenantTableName(table: string): string {
  const normalized = table.trim().toLowerCase();
  return TENANT_TABLE_ALIASES[normalized] ?? normalized;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function assertSafeIdentifier(identifier: string, label: string): string {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Invalid ${label}: ${identifier}`);
  }
  return identifier;
}

function getTenantTableConfig(table: string): TenantTableConfig {
  const normalized = normalizeTenantTableName(table);
  if (!TENANT_TABLE_CONFIG[normalized]) {
    throw new Error(`Unsupported tenant-scoped table: ${table}`);
  }
  return TENANT_TABLE_CONFIG[normalized];
}

function getSafeTableName(table: string): string {
  const normalized = normalizeTenantTableName(table);
  getTenantTableConfig(normalized);
  return quoteIdentifier(normalized);
}

function parseOrderBy(
  orderBy: string,
  sortableColumns: Set<string>,
): { column: string; direction: SortDirection } {
  const [rawColumn, rawDirection] = orderBy.trim().split(/\s+/, 2);
  const column = assertSafeIdentifier(
    rawColumn,
    'orderBy column',
  ).toLowerCase();
  if (!sortableColumns.has(column)) {
    throw new Error(`Unsupported orderBy column: ${column}`);
  }
  const direction = rawDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return { column, direction };
}

function resolveTenantScope(config: TenantTableConfig): TenantScopeConfig {
  return config.tenantScope ?? { mode: 'column', column: 'tenant_id' };
}

function getSafeParentScope(
  scope: Extract<TenantScopeConfig, { mode: 'parent' }>,
) {
  const safeParentTable = quoteIdentifier(
    assertSafeIdentifier(scope.parentTable, 'parent scope table').toLowerCase(),
  );
  const safeLocalColumn = quoteIdentifier(
    assertSafeIdentifier(scope.localColumn, 'parent scope local column'),
  );
  const safeParentIdColumn = quoteIdentifier(
    assertSafeIdentifier(scope.parentIdColumn, 'parent scope parent id column'),
  );
  const safeParentTenantColumn = quoteIdentifier(
    assertSafeIdentifier(
      scope.parentTenantColumn,
      'parent scope parent tenant column',
    ),
  );
  return {
    safeParentTable,
    safeLocalColumn,
    safeParentIdColumn,
    safeParentTenantColumn,
  };
}

function getTenantScopeSelectParts(
  scope: TenantScopeConfig,
  tenantParamIndex: number,
  localAlias: string,
): { joins: string[]; filters: string[] } {
  if (scope.mode === 'global') {
    return { joins: [], filters: [] };
  }

  if (scope.mode === 'column') {
    const safeTenantColumn = quoteIdentifier(
      assertSafeIdentifier(scope.column, 'tenant scope column'),
    );
    return {
      joins: [],
      filters: [`${localAlias}.${safeTenantColumn} = $${tenantParamIndex}`],
    };
  }

  const parentScope = getSafeParentScope(scope);
  return {
    joins: [
      `JOIN ${parentScope.safeParentTable} p ON ${localAlias}.${parentScope.safeLocalColumn} = p.${parentScope.safeParentIdColumn}`,
    ],
    filters: [`p.${parentScope.safeParentTenantColumn} = $${tenantParamIndex}`],
  };
}

function assertTenantScopedWriteAllowed(
  table: string,
  scope: TenantScopeConfig,
): asserts scope is Exclude<TenantScopeConfig, { mode: 'global' }> {
  if (scope.mode === 'global') {
    throw new Error(
      `Writes to global table ${table} are not allowed via tenant-scoped helper`,
    );
  }
}

// Extend FastifyRequest to include tenant context
declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    tenantContext: TenantContext;
    getTenantQuery: () => ReturnType<typeof createTenantScopedQuery>;
  }
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tier: 'starter' | 'growth' | 'professional' | 'enterprise';
  features: string[];
  limits: TenantLimits;
}

export interface TenantLimits {
  maxDocuments: number;
  maxMatters: number;
  maxUsers: number;
  maxStorageBytes: number;
  aiQueriesPerMonth: number;
  documentsPerMonth: number;
}

// Default limits by tier
const TIER_LIMITS: Record<string, TenantLimits> = {
  starter: {
    maxDocuments: 1000,
    maxMatters: 50,
    maxUsers: 5,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    aiQueriesPerMonth: 500,
    documentsPerMonth: 100,
  },
  growth: {
    maxDocuments: 10000,
    maxMatters: 250,
    maxUsers: 25,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    aiQueriesPerMonth: 2500,
    documentsPerMonth: 500,
  },
  professional: {
    maxDocuments: 100000,
    maxMatters: 1000,
    maxUsers: 100,
    maxStorageBytes: 1024 * 1024 * 1024 * 1024, // 1 TB
    aiQueriesPerMonth: 10000,
    documentsPerMonth: 2000,
  },
  enterprise: {
    maxDocuments: -1, // unlimited
    maxMatters: -1,
    maxUsers: -1,
    maxStorageBytes: -1,
    aiQueriesPerMonth: -1,
    documentsPerMonth: -1,
  },
};

/**
 * Load tenant context from database
 */
async function loadTenantContext(
  tenantId: string,
): Promise<TenantContext | null> {
  try {
    const result = await pool.query<{
      id: string;
      name: string;
      plan: string | null;
      settings: unknown;
    }>(
      `SELECT id, name, plan, settings
       FROM tenants
       WHERE id = $1`,
      [tenantId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const tenant = result.rows[0];
    const tierCandidate = tenant.plan || 'starter';
    const tier = tierCandidate in TIER_LIMITS ? tierCandidate : 'starter';
    const tenantSettings =
      tenant.settings && typeof tenant.settings === 'object'
        ? (tenant.settings as Record<string, unknown>)
        : {};
    const featuresCandidate = tenantSettings.features;
    const features = Array.isArray(featuresCandidate)
      ? featuresCandidate.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tier: tier as TenantContext['tier'],
      features,
      limits: TIER_LIMITS[tier] || TIER_LIMITS.starter,
    };
  } catch (error) {
    logger.error({ error, tenantId }, 'Failed to load tenant context');
    return null;
  }
}

/**
 * Validate that a resource belongs to the requesting tenant
 */
export async function validateTenantOwnership(
  tenantId: string,
  table: string,
  resourceId: string,
): Promise<boolean> {
  try {
    const tableConfig = getTenantTableConfig(table);
    const safeTableName = getSafeTableName(table);
    const scope = resolveTenantScope(tableConfig);
    const whereClauses = ['t.id = $1'];
    const joinClauses: string[] = [];
    const scopeParts = getTenantScopeSelectParts(scope, 2, 't');
    joinClauses.push(...scopeParts.joins);
    whereClauses.push(...scopeParts.filters);
    if (tableConfig.supportsSoftDelete) {
      whereClauses.push('t.deleted_at IS NULL');
    }
    const result = await pool.query(
      `SELECT 1 FROM ${safeTableName} t ${joinClauses.join(' ')} WHERE ${whereClauses.join(' AND ')} LIMIT 1`,
      [resourceId, tenantId],
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error(
      { error, tenantId, table, resourceId },
      'Tenant ownership check failed',
    );
    return false;
  }
}

/**
 * Create a scoped query helper that automatically adds tenant_id filter
 */
export function createTenantScopedQuery(tenantId: string) {
  return {
    /**
     * Execute a query with automatic tenant_id filtering
     */
    async query<T = unknown>(
      sql: string,
      params: unknown[] = [],
    ): Promise<T[]> {
      // Verify the query includes tenant_id filter
      if (!sql.toLowerCase().includes('tenant_id')) {
        throw new Error(
          'Query must include tenant_id filter for tenant isolation',
        );
      }

      const result = await pool.query(sql, params);
      return result.rows as T[];
    },

    /**
     * Find by ID with tenant scope
     */
    async findById<T = unknown>(table: string, id: string): Promise<T | null> {
      const tableConfig = getTenantTableConfig(table);
      const safeTableName = getSafeTableName(table);
      const scope = resolveTenantScope(tableConfig);
      const whereClauses = ['t.id = $1'];
      const joinClauses: string[] = [];
      const scopeParts = getTenantScopeSelectParts(scope, 2, 't');
      joinClauses.push(...scopeParts.joins);
      whereClauses.push(...scopeParts.filters);
      if (tableConfig.supportsSoftDelete) {
        whereClauses.push('t.deleted_at IS NULL');
      }
      const result = await pool.query(
        `SELECT t.* FROM ${safeTableName} t ${joinClauses.join(' ')} WHERE ${whereClauses.join(' AND ')}`,
        [id, tenantId],
      );
      return result.rows[0] || null;
    },

    /**
     * Find many with tenant scope
     */
    async findMany<T = unknown>(
      table: string,
      conditions: Record<string, unknown> = {},
      options: { limit?: number; offset?: number; orderBy?: string } = {},
    ): Promise<T[]> {
      const tableConfig = getTenantTableConfig(table);
      const safeTableName = getSafeTableName(table);
      const scope = resolveTenantScope(tableConfig);
      const whereConditions: string[] = [];
      const joinClauses: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (scope.mode !== 'global') {
        const tenantParamIndex = paramIndex;
        params.push(tenantId);
        paramIndex++;
        const scopeParts = getTenantScopeSelectParts(
          scope,
          tenantParamIndex,
          't',
        );
        joinClauses.push(...scopeParts.joins);
        whereConditions.push(...scopeParts.filters);
      }

      if (tableConfig.supportsSoftDelete) {
        whereConditions.push('t.deleted_at IS NULL');
      }

      for (const [key, value] of Object.entries(conditions)) {
        const safeKey = assertSafeIdentifier(key, 'condition column');
        whereConditions.push(`t.${quoteIdentifier(safeKey)} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }

      let sql = `SELECT t.* FROM ${safeTableName} t ${joinClauses.join(' ')}`;
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      if (options.orderBy) {
        const parsedOrder = parseOrderBy(
          options.orderBy,
          tableConfig.sortableColumns,
        );
        sql += ` ORDER BY t.${quoteIdentifier(parsedOrder.column)} ${parsedOrder.direction}`;
      }
      if (typeof options.limit === 'number') {
        sql += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
      }
      if (typeof options.offset === 'number') {
        sql += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }

      const result = await pool.query(sql, params);
      return result.rows as T[];
    },

    /**
     * Insert with tenant scope
     */
    async insert<T = unknown>(
      table: string,
      data: Record<string, unknown>,
    ): Promise<T> {
      const tableConfig = getTenantTableConfig(table);
      const safeTableName = getSafeTableName(table);
      const scope = resolveTenantScope(tableConfig);
      assertTenantScopedWriteAllowed(table, scope);

      let dataWithTenant: Record<string, unknown>;
      if (scope.mode === 'column') {
        const tenantColumn = assertSafeIdentifier(
          scope.column,
          'tenant scope column',
        );
        dataWithTenant = { ...data, [tenantColumn]: tenantId };
      } else if (scope.mode === 'parent') {
        dataWithTenant = { ...data };
        if (!(scope.localColumn in dataWithTenant)) {
          throw new Error(
            `Missing parent scope column '${scope.localColumn}' for ${table} insert`,
          );
        }
      } else {
        throw new Error(`Unsupported tenant scope mode for ${table}`);
      }

      const columns = Object.keys(dataWithTenant);
      const values = Object.values(dataWithTenant);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const safeColumns = columns.map((column) =>
        quoteIdentifier(assertSafeIdentifier(column, 'insert column')),
      );

      const result = await pool.query(
        `INSERT INTO ${safeTableName} (${safeColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values,
      );
      return result.rows[0] as T;
    },

    /**
     * Update with tenant scope
     */
    async update<T = unknown>(
      table: string,
      id: string,
      data: Record<string, unknown>,
    ): Promise<T | null> {
      if (Object.keys(data).length === 0) {
        return this.findById<T>(table, id);
      }

      const tableConfig = getTenantTableConfig(table);
      const scope = resolveTenantScope(tableConfig);
      assertTenantScopedWriteAllowed(table, scope);
      const safeTableName = getSafeTableName(table);
      const updates = Object.entries(data)
        .map(
          ([key], i) =>
            `${quoteIdentifier(assertSafeIdentifier(key, 'update column'))} = $${i + 3}`,
        )
        .join(', ');
      const values = [id, tenantId, ...Object.values(data)];

      let result;
      if (scope.mode === 'column') {
        result = await pool.query(
          `UPDATE ${safeTableName} t
           SET ${updates}, updated_at = NOW()
           WHERE t.id = $1
             AND t.${quoteIdentifier(assertSafeIdentifier(scope.column, 'tenant scope column'))} = $2
             ${tableConfig.supportsSoftDelete ? 'AND t.deleted_at IS NULL' : ''}
           RETURNING *`,
          values,
        );
      } else if (scope.mode === 'parent') {
        result = await pool.query(
          `UPDATE ${safeTableName} t
           SET ${updates}, updated_at = NOW()
           FROM ${quoteIdentifier(assertSafeIdentifier(scope.parentTable, 'parent scope table').toLowerCase())} p
           WHERE t.id = $1
             AND t.${quoteIdentifier(assertSafeIdentifier(scope.localColumn, 'parent scope local column'))} =
                 p.${quoteIdentifier(assertSafeIdentifier(scope.parentIdColumn, 'parent scope parent id column'))}
             AND p.${quoteIdentifier(assertSafeIdentifier(scope.parentTenantColumn, 'parent scope parent tenant column'))} = $2
             ${tableConfig.supportsSoftDelete ? 'AND t.deleted_at IS NULL' : ''}
           RETURNING t.*`,
          values,
        );
      } else {
        throw new Error(`Unsupported tenant scope mode for ${table}`);
      }

      return result.rows[0] || null;
    },

    /**
     * Soft delete with tenant scope
     */
    async softDelete(table: string, id: string): Promise<boolean> {
      const tableConfig = getTenantTableConfig(table);
      const scope = resolveTenantScope(tableConfig);
      assertTenantScopedWriteAllowed(table, scope);
      const safeTableName = getSafeTableName(table);
      if (scope.mode === 'column') {
        const tenantColumn = quoteIdentifier(
          assertSafeIdentifier(scope.column, 'tenant scope column'),
        );
        if (tableConfig.supportsSoftDelete) {
          const result = await pool.query(
            `UPDATE ${safeTableName} SET deleted_at = NOW() WHERE id = $1 AND ${tenantColumn} = $2`,
            [id, tenantId],
          );
          return (result.rowCount || 0) > 0;
        }

        const result = await pool.query(
          `DELETE FROM ${safeTableName} WHERE id = $1 AND ${tenantColumn} = $2`,
          [id, tenantId],
        );
        return (result.rowCount || 0) > 0;
      }

      if (scope.mode !== 'parent') {
        throw new Error(`Unsupported tenant scope mode for ${table}`);
      }

      const safeParentTable = quoteIdentifier(
        assertSafeIdentifier(
          scope.parentTable,
          'parent scope table',
        ).toLowerCase(),
      );
      const safeLocalColumn = quoteIdentifier(
        assertSafeIdentifier(scope.localColumn, 'parent scope local column'),
      );
      const safeParentIdColumn = quoteIdentifier(
        assertSafeIdentifier(
          scope.parentIdColumn,
          'parent scope parent id column',
        ),
      );
      const safeParentTenantColumn = quoteIdentifier(
        assertSafeIdentifier(
          scope.parentTenantColumn,
          'parent scope parent tenant column',
        ),
      );

      if (tableConfig.supportsSoftDelete) {
        const result = await pool.query(
          `UPDATE ${safeTableName} t
           SET deleted_at = NOW()
           FROM ${safeParentTable} p
           WHERE t.id = $1
             AND t.${safeLocalColumn} = p.${safeParentIdColumn}
             AND p.${safeParentTenantColumn} = $2`,
          [id, tenantId],
        );
        return (result.rowCount || 0) > 0;
      }

      const result = await pool.query(
        `DELETE FROM ${safeTableName} t
         USING ${safeParentTable} p
         WHERE t.id = $1
           AND t.${safeLocalColumn} = p.${safeParentIdColumn}
           AND p.${safeParentTenantColumn} = $2`,
        [id, tenantId],
      );
      return (result.rowCount || 0) > 0;
    },
  };
}

/**
 * Fastify plugin for tenant isolation
 */
const tenantIsolationPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  // Add hook to inject tenant context
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip for public routes
      const publicPaths = [
        '/health',
        '/ready',
        '/metrics',
        '/auth/login',
        '/auth/register',
      ];
      if (publicPaths.some((p) => request.url.startsWith(p))) {
        return;
      }

      const tenantId = request.tenantId;

      if (!tenantId) {
        // tenantId should be set by auth middleware
        return;
      }

      // Load full tenant context
      const context = await loadTenantContext(tenantId);

      if (!context) {
        logger.warn({ tenantId }, 'Tenant not found or deleted');
        return reply.status(403).send({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant account not found',
          },
        });
      }

      request.tenantContext = context;
    },
  );

  // Add decorator for tenant-scoped queries
  fastify.decorateRequest('getTenantQuery', function (this: FastifyRequest) {
    return createTenantScopedQuery(this.tenantId);
  });

  done();
};

export const registerTenantIsolation = fp(tenantIsolationPlugin, {
  name: 'tenant-isolation',
  dependencies: [],
});

/**
 * Middleware to check tenant resource limits
 */
export async function checkTenantLimits(
  tenantId: string,
  resourceType: 'documents' | 'matters' | 'users' | 'storage',
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const context = await loadTenantContext(tenantId);

  if (!context) {
    return { allowed: false, current: 0, limit: 0 };
  }

  let current = 0;
  let limit = 0;

  switch (resourceType) {
    case 'documents': {
      limit = context.limits.maxDocuments;
      const docResult = await pool.query(
        'SELECT COUNT(*) FROM documents WHERE tenant_id = $1',
        [tenantId],
      );
      current = Number.parseInt(docResult.rows[0].count, 10);
      break;
    }

    case 'matters': {
      limit = context.limits.maxMatters;
      const matterResult = await pool.query(
        'SELECT COUNT(*) FROM matters WHERE tenant_id = $1',
        [tenantId],
      );
      current = Number.parseInt(matterResult.rows[0].count, 10);
      break;
    }

    case 'users': {
      limit = context.limits.maxUsers;
      const userResult = await pool.query(
        'SELECT COUNT(*) FROM attorneys WHERE tenant_id = $1',
        [tenantId],
      );
      current = Number.parseInt(userResult.rows[0].count, 10);
      break;
    }

    case 'storage': {
      limit = context.limits.maxStorageBytes;
      const storageResult = await pool.query(
        'SELECT COALESCE(SUM(file_size_bytes), 0) AS total_bytes FROM documents WHERE tenant_id = $1',
        [tenantId],
      );
      current = Number.parseInt(storageResult.rows[0].total_bytes, 10);
      break;
    }
  }

  // -1 means unlimited
  const allowed = limit === -1 || current < limit;

  return { allowed, current, limit };
}
