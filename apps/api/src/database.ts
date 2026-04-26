/**
 * EvidentIS Database Connection
 * PostgreSQL connection pool with proper connection management.
 * Supports RLS via per-connection `app.tenant_id` setting.
 * Optional read-replica pool for SELECT-heavy workloads.
 */

import fs from 'node:fs';
import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

const { Pool } = pg;
const POOL_REINITIALIZE_DRAIN_MS = 5000;

// ============================================================
// CONNECTION POOL
// ============================================================

function createPool(connectionString = config.DATABASE_URL): pg.Pool {
  return new Pool({
    connectionString,
    max: config.DB_POOL_MAX,
    idleTimeoutMillis: config.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: config.DB_CONNECT_TIMEOUT_MS,
    ssl:
      config.DB_SSL === 'true'
        ? {
            rejectUnauthorized: true,
            ca: config.DB_SSL_CA
              ? fs.readFileSync(config.DB_SSL_CA, 'utf8')
              : undefined,
          }
        : false,
  });
}

function attachPoolEventHandlers(dbPool: pg.Pool): void {
  dbPool.on('connect', () => {
    logger.debug('Database client connected');
  });

  dbPool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error');
  });
}

export let pool: pg.Pool = createPool();
attachPoolEventHandlers(pool);

// Read-replica pool for SELECT queries (optional)
export let replicaPool: pg.Pool | null = null;
if (config.DATABASE_REPLICA_URL) {
  replicaPool = createPool(config.DATABASE_REPLICA_URL);
  attachPoolEventHandlers(replicaPool);
  logger.info('Read-replica database pool initialized');
}

export async function reinitializePool(
  connectionString?: string,
): Promise<void> {
  const previousPool = pool;
  pool = createPool(connectionString ?? config.DATABASE_URL);
  attachPoolEventHandlers(pool);
  await new Promise((resolve) =>
    setTimeout(resolve, POOL_REINITIALIZE_DRAIN_MS),
  );
  await previousPool.end();
}

// ============================================================
// RLS: Per-Request Tenant Scoping
// ============================================================

/**
 * Set the app.tenant_id session variable for RLS enforcement.
 * MUST be called at the start of every authenticated request.
 *
 * This works in conjunction with the PostgreSQL RLS policies
 * defined in migration 021_row_level_security.sql.
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  await pool.query(`SET LOCAL app.tenant_id = $1`, [tenantId]);
}

/**
 * Acquire a client with tenant context already set.
 * Use for transactions that need RLS scoping.
 */
export async function acquireTenantClient(
  tenantId: string,
): Promise<pg.PoolClient> {
  const client = await pool.connect();
  await client.query(`SET app.tenant_id = $1`, [tenantId]);
  return client;
}

// ============================================================
// QUERY HELPERS
// ============================================================

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a parameterized query
 * NEVER use string concatenation for values - always use $N placeholders
 */
export async function query<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query(text, values);
  const duration = Date.now() - start;

  logger.debug(
    { query: text, duration, rows: result.rowCount },
    'Query executed',
  );

  return {
    rows: result.rows as T[],
    rowCount: result.rowCount || 0,
  };
}

/**
 * Execute a read-only query on the replica pool (falls back to primary if no replica).
 * Use for expensive SELECT operations like vector similarity search.
 */
export async function queryRead<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  const targetPool = replicaPool || pool;
  const start = Date.now();
  const result = await targetPool.query(text, values);
  const duration = Date.now() - start;

  logger.debug(
    { query: text, duration, rows: result.rowCount, replica: !!replicaPool },
    'Read query executed',
  );

  return {
    rows: result.rows as T[],
    rowCount: result.rowCount || 0,
  };
}

/**
 * Execute a query and return the first row or null
 */
export async function queryOne<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] || null;
}

/**
 * Execute a query expecting exactly one row
 * Throws if no row or multiple rows found
 */
export async function queryExactlyOne<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<T> {
  const result = await query<T>(text, values);
  if (result.rowCount === 0) {
    throw new Error('Expected exactly one row, got none');
  }
  if (result.rowCount > 1) {
    throw new Error(`Expected exactly one row, got ${result.rowCount}`);
  }
  return result.rows[0];
}

// ============================================================
// TRANSACTION SUPPORT
// ============================================================

export interface Transaction {
  query: <T>(text: string, values?: unknown[]) => Promise<QueryResult<T>>;
  queryOne: <T>(text: string, values?: unknown[]) => Promise<T | null>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

/**
 * Start a database transaction
 * Usage:
 *   const tx = await beginTransaction();
 *   try {
 *     await tx.query('INSERT ...');
 *     await tx.commit();
 *   } catch (e) {
 *     await tx.rollback();
 *     throw e;
 *   }
 */
export async function beginTransaction(): Promise<Transaction> {
  const client = await pool.connect();
  await client.query('BEGIN');

  return {
    query: async <T>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> => {
      const result = await client.query(text, values);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    },
    queryOne: async <T>(
      text: string,
      values?: unknown[],
    ): Promise<T | null> => {
      const result = await client.query(text, values);
      return (result.rows[0] as T) || null;
    },
    commit: async () => {
      await client.query('COMMIT');
      client.release();
    },
    rollback: async () => {
      await client.query('ROLLBACK');
      client.release();
    },
  };
}

/**
 * Execute a function within a transaction.
 * Optionally sets tenant context for RLS enforcement.
 * Automatically commits on success, rolls back on error.
 */
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
  tenantId?: string,
): Promise<T> {
  const tx = await beginTransaction();
  try {
    if (tenantId) {
      await tx.query(`SET LOCAL app.tenant_id = $1`, [tenantId]);
    }
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

export async function closeDatabasePool(): Promise<void> {
  logger.info('Closing database pool...');
  await pool.end();
  if (replicaPool) {
    await replicaPool.end();
    logger.info('Replica database pool closed');
  }
  logger.info('Database pool closed');
}
