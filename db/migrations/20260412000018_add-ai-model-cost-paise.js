/* eslint-disable camelcase */
/**
 * Add paise-denominated AI model cost tracking.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE ai_model_events
      ADD COLUMN IF NOT EXISTS estimated_cost_paise bigint NOT NULL DEFAULT 0;

    UPDATE ai_model_events
    SET estimated_cost_paise = ROUND(COALESCE(cost_usd, 0)::numeric * 8300)::bigint
    WHERE estimated_cost_paise = 0
      AND cost_usd IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE ai_model_events
      DROP COLUMN IF EXISTS estimated_cost_paise;
  `);
};
