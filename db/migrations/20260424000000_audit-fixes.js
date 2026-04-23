/**
 * Add feedback fields to research_history
 * Add OTP lockout fields to attorneys
 */

exports.up = async function (pgm) {
  // Add feedback columns to research_history
  pgm.addColumns('research_history', {
    user_rating: {
      type: 'smallint',
      check: 'user_rating IN (-1, 0, 1)'
    },
    user_correction: {
      type: 'text'
    },
    feedback_given_at: {
      type: 'timestamptz'
    }
  });

  // Add OTP lockout columns to attorneys
  pgm.addColumns('attorneys', {
    otp_failed_attempts: {
      type: 'int',
      notNull: true,
      default: 0
    },
    otp_locked_until: {
      type: 'timestamptz'
    }
  });
};

exports.down = async function (pgm) {
  pgm.dropColumns('attorneys', ['otp_failed_attempts', 'otp_locked_until']);
  pgm.dropColumns('research_history', ['user_rating', 'user_correction', 'feedback_given_at']);
};
