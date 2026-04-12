/* eslint-disable camelcase */
/**
 * Add paise-based matter value column while preserving legacy cents column.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE matters
      ADD COLUMN IF NOT EXISTS deal_value_paise bigint;

    UPDATE matters
    SET deal_value_paise = deal_value_cents
    WHERE deal_value_paise IS NULL
      AND deal_value_cents IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE matters
      DROP COLUMN IF EXISTS deal_value_paise;
  `);
};
