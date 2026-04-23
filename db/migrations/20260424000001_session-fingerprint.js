/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('refresh_tokens', {
    fingerprint: { type: 'text' },
  });
  pgm.createIndex('refresh_tokens', 'fingerprint');
};

exports.down = (pgm) => {
  pgm.dropColumn('refresh_tokens', 'fingerprint');
};
