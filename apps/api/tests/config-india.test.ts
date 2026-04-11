import { describe, expect, it } from 'vitest';

import { config, passwordPolicy, rateLimits, trustProxy } from '../src/config';

describe('India API config defaults', () => {
  it('defaults to India localisation settings', () => {
    expect(config.DEFAULT_LANGUAGE).toBe('hi');
    expect(config.DEFAULT_CURRENCY).toBe('INR');
    expect(config.DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
    expect(config.DATA_RESIDENCY_REGION).toBe('centralindia');
  });

  it('exposes India integrations and compliance defaults', () => {
    expect(config.MSG91_SENDER_ID).toBe('EVDTIS');
    expect(config.GST_RATE).toBe(18);
    expect(config.DPDP_CONSENT_VERSION).toBe('1.0');
  });

  it('keeps secure password defaults', () => {
    expect(passwordPolicy.minLength).toBeGreaterThanOrEqual(12);
    expect(passwordPolicy.requireUppercase).toBe(true);
    expect(passwordPolicy.requireSpecial).toBe(true);
  });

  it('adds OTP-specific rate limiting', () => {
    expect(rateLimits.otp.requests).toBe(6);
    expect(rateLimits.otp.windowMs).toBe(15 * 60 * 1000);
  });

  it('does not trust proxy headers unless explicitly enabled', () => {
    expect(config.TRUST_PROXY).toBe('false');
    expect(trustProxy).toBe(false);
  });
});
