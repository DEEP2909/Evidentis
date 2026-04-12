/* eslint-disable camelcase */
/**
 * Rename legacy audit actor column to advocate-first terminology.
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
          AND table_name = 'audit_events'
          AND column_name = 'actor_attorney_id'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_events'
          AND column_name = 'actor_advocate_id'
      ) THEN
        ALTER TABLE audit_events
          RENAME COLUMN actor_attorney_id TO actor_advocate_id;
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
          AND table_name = 'audit_events'
          AND column_name = 'actor_advocate_id'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_events'
          AND column_name = 'actor_attorney_id'
      ) THEN
        ALTER TABLE audit_events
          RENAME COLUMN actor_advocate_id TO actor_attorney_id;
      END IF;
    END
    $$;
  `);
};
