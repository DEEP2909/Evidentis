/* eslint-disable camelcase */
/**
 * Remove legacy USD-denominated AI cost column after paise migration.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE ai_model_events
      ADD COLUMN IF NOT EXISTS estimated_cost_paise bigint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cost_currency text NOT NULL DEFAULT 'INR';

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ai_model_events'
          AND column_name = 'cost_usd'
      ) THEN
        UPDATE ai_model_events
        SET estimated_cost_paise = ROUND(COALESCE(cost_usd, 0)::numeric * 8300)::bigint
        WHERE estimated_cost_paise = 0
          AND cost_usd IS NOT NULL;

        ALTER TABLE ai_model_events
          DROP COLUMN cost_usd;
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE ai_model_events
      ADD COLUMN IF NOT EXISTS cost_usd numeric(10,6);
  `);
};
