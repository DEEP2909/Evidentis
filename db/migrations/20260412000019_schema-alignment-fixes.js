/* eslint-disable camelcase */
/**
 * Runtime schema alignment fixes for India production defaults and analytics safety.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tenants
      ALTER COLUMN region SET DEFAULT 'centralindia';

    UPDATE tenants
    SET region = 'centralindia'
    WHERE region IS NULL OR region = 'us-east-1';

    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS file_size_bytes bigint NOT NULL DEFAULT 0;

    ALTER TABLE matters
      ADD COLUMN IF NOT EXISTS deal_value_paise bigint;

    UPDATE matters
    SET deal_value_paise = deal_value_cents
    WHERE deal_value_paise IS NULL
      AND deal_value_cents IS NOT NULL;

    ALTER TABLE gst_details
      ALTER COLUMN sac_code SET DEFAULT '998212';

    UPDATE gst_details
    SET sac_code = '998212'
    WHERE sac_code IS NULL OR sac_code = '9982';

    ALTER TABLE research_history
      ADD COLUMN IF NOT EXISTS advocate_id uuid REFERENCES attorneys(id) ON DELETE SET NULL;

    UPDATE research_history
    SET advocate_id = attorney_id
    WHERE advocate_id IS NULL
      AND attorney_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE research_history
      DROP COLUMN IF EXISTS advocate_id;

    ALTER TABLE gst_details
      ALTER COLUMN sac_code SET DEFAULT '9982';

    ALTER TABLE matters
      DROP COLUMN IF EXISTS deal_value_paise;

    ALTER TABLE documents
      DROP COLUMN IF EXISTS file_size_bytes;

    ALTER TABLE tenants
      ALTER COLUMN region SET DEFAULT 'us-east-1';
  `);
};
