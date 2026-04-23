import crypto from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', async () => {
  const actual =
    await vi.importActual<typeof import('../src/config.js')>(
      '../src/config.js',
    );
  return {
    ...actual,
    config: {
      ...actual.config,
      RAZORPAY_WEBHOOK_SECRET: 'unit-test-secret',
    },
  };
});

import {
  PLANS,
  calculateInvoiceTotals,
  verifyRazorpayWebhookSignature,
} from '../src/billing';

describe('India billing', () => {
  it('uses India plan prices and GST configuration', () => {
    expect(PLANS.starter.priceInPaise).toBe(499900);
    expect(PLANS.professional.gstRatePercent).toBe(18);
    expect(PLANS.enterprise.features.maxAdvocates).toBe(50);
  });

  it('calculates GST-inclusive totals in paise', () => {
    const totals = calculateInvoiceTotals(499900, 18);
    expect(totals.subtotalPaise).toBe(499900);
    expect(totals.gstAmountPaise).toBe(89982);
    expect(totals.totalPaise).toBe(589882);
  });

  it('verifies razorpay webhook signatures using HMAC SHA256', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto
      .createHmac('sha256', 'unit-test-secret')
      .update(body)
      .digest('hex');
    expect(verifyRazorpayWebhookSignature(body, signature)).toBe(true);
  });

  it('rejects invalid webhook signatures', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.failed' }));
    expect(verifyRazorpayWebhookSignature(body, 'not-valid')).toBe(false);
  });
});
