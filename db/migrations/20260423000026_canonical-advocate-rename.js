/* eslint-disable camelcase */
/**
 * Canonical Advocate Rename Migration
 * Renames legacy attorney_id columns to advocate_id for schema consistency.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. refresh_tokens
  pgm.renameColumn('refresh_tokens', 'attorney_id', 'advocate_id');
  
  // 2. password_reset_tokens
  pgm.renameColumn('password_reset_tokens', 'attorney_id', 'advocate_id');
  
  // 3. mfa_enrollments
  pgm.renameColumn('mfa_enrollments', 'attorney_id', 'advocate_id');
  
  // 4. passkeys
  pgm.renameColumn('passkeys', 'attorney_id', 'advocate_id');

  // 5. identity_links
  pgm.renameColumn('identity_links', 'attorney_id', 'advocate_id');

  // 6. webauthn_credentials (if it exists)
  // Check if table exists before renaming to avoid migration failure
  pgm.sql(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webauthn_credentials') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webauthn_credentials' AND column_name = 'attorney_id') THEN
          ALTER TABLE webauthn_credentials RENAME COLUMN attorney_id TO advocate_id;
        END IF;
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.renameColumn('refresh_tokens', 'advocate_id', 'attorney_id');
  pgm.renameColumn('password_reset_tokens', 'advocate_id', 'attorney_id');
  pgm.renameColumn('mfa_enrollments', 'advocate_id', 'attorney_id');
  pgm.renameColumn('passkeys', 'advocate_id', 'attorney_id');
  pgm.renameColumn('identity_links', 'advocate_id', 'attorney_id');
  
  pgm.sql(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webauthn_credentials') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webauthn_credentials' AND column_name = 'advocate_id') THEN
          ALTER TABLE webauthn_credentials RENAME COLUMN advocate_id TO attorney_id;
        END IF;
      END IF;
    END $$;
  `);
};
