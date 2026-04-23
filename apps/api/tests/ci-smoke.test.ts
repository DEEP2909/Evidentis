import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from '../src/index';

let app: Awaited<ReturnType<typeof build>>;

describe('CI Smoke', () => {
  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness health endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status?: string };
    expect(body.status).toBe('ok');
  });

  it('serves readiness endpoint with expected shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body) as {
      status?: string;
      checks?: unknown;
    };
    expect(body.status).toBeDefined();
    expect(body.checks).toBeDefined();
  });

  it('rejects razorpay webhook requests without signature header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      payload: { event: 'payment.captured' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid razorpay webhook signatures', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': 'invalid-signature',
      },
      payload: { event: 'payment.captured' },
    });

    expect(response.statusCode).toBe(400);
  });
});
