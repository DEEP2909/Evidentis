/* eslint-disable camelcase */
/**
 * EvidentIS Tenant Onboarding Migration
 * Migration: 20260417000023_tenant-onboarding.js
 * 
 * Creates tenant_onboarding table to track onboarding step completion
 * server-side. Previously tracked only in localStorage, which meant
 * admins who cleared browser data or logged in from a different device
 * saw the checklist again.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('tenant_onboarding', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE',
    },
    step_key: {
      type: 'varchar(64)',
      notNull: true,
    },
    completed_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    completed_by: {
      type: 'uuid',
      references: 'attorneys(id)',
      onDelete: 'SET NULL',
    },
  });

  // Unique constraint: each step can only be completed once per tenant
  pgm.addConstraint('tenant_onboarding', 'uq_tenant_onboarding_step', {
    unique: ['tenant_id', 'step_key'],
  });

  // Index for fast lookup by tenant
  pgm.createIndex('tenant_onboarding', 'tenant_id', {
    name: 'idx_tenant_onboarding_tenant',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('tenant_onboarding');
};
