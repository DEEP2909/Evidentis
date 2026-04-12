/* eslint-disable camelcase */
/**
 * Normalize default roles to advocate terminology.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'attorneys'
          AND column_name = 'role'
      ) THEN
        ALTER TABLE attorneys ALTER COLUMN role SET DEFAULT 'advocate';
        UPDATE attorneys SET role = 'advocate' WHERE role = 'attorney';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invitations'
          AND column_name = 'role'
      ) THEN
        ALTER TABLE invitations ALTER COLUMN role SET DEFAULT 'advocate';
        UPDATE invitations SET role = 'advocate' WHERE role = 'attorney';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sso_configs'
          AND column_name = 'default_role'
      ) THEN
        ALTER TABLE sso_configs ALTER COLUMN default_role SET DEFAULT 'advocate';
        UPDATE sso_configs SET default_role = 'advocate' WHERE default_role = 'attorney';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sso_configurations'
          AND column_name = 'default_role'
      ) THEN
        ALTER TABLE sso_configurations ALTER COLUMN default_role SET DEFAULT 'advocate';
        UPDATE sso_configurations SET default_role = 'advocate' WHERE default_role = 'attorney';
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
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'attorneys'
          AND column_name = 'role'
      ) THEN
        ALTER TABLE attorneys ALTER COLUMN role SET DEFAULT 'attorney';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invitations'
          AND column_name = 'role'
      ) THEN
        ALTER TABLE invitations ALTER COLUMN role SET DEFAULT 'attorney';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sso_configs'
          AND column_name = 'default_role'
      ) THEN
        ALTER TABLE sso_configs ALTER COLUMN default_role SET DEFAULT 'attorney';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sso_configurations'
          AND column_name = 'default_role'
      ) THEN
        ALTER TABLE sso_configurations ALTER COLUMN default_role SET DEFAULT 'attorney';
      END IF;
    END
    $$;
  `);
};
