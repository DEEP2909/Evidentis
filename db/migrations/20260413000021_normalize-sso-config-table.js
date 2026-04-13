/* eslint-disable camelcase */
/**
 * Normalize legacy SSO table name from sso_configs to sso_configurations.
 * Keeps migration idempotent for mixed environments.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'sso_configs'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'sso_configurations'
      ) THEN
        ALTER TABLE sso_configs RENAME TO sso_configurations;
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'sso_configurations'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'sso_configs'
      ) THEN
        ALTER TABLE sso_configurations RENAME TO sso_configs;
      END IF;
    END
    $$;
  `);
};
