/**
 * EvidentIS India Razorpay Billing Integration
 * GST-aware pricing, checkout, webhook handling, and quota reporting.
 */

import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { PRIMARY_LANGUAGE_CODES, SUPPORTED_LANGUAGE_CODES } from '@evidentis/shared';

import { config } from './config.js';
import { pool } from './database.js';
import { logger } from './logger.js';

export const PLANS = {
  starter: {
    name: 'Starter',
    priceInPaise: 499900,
    gstRatePercent: 18,
    features: {
      maxAdvocates: 3,
      maxDocumentsPerMonth: 100,
      maxResearchQueriesPerMonth: 200,
      aiTier: 'opensource',
      languages: ['en', 'hi'],
      support: 'email',
    },
  },
  growth: {
    name: 'Growth',
    priceInPaise: 1499900,
    gstRatePercent: 18,
    features: {
      maxAdvocates: 15,
      maxDocumentsPerMonth: 500,
      maxResearchQueriesPerMonth: 1000,
      aiTier: 'hybrid',
      languages: PRIMARY_LANGUAGE_CODES,
      support: 'priority',
    },
  },
  professional: {
    name: 'Professional',
    priceInPaise: 2499900,
    gstRatePercent: 18,
    features: {
      maxAdvocates: 30,
      maxDocumentsPerMonth: 2000,
      maxResearchQueriesPerMonth: 5000,
      aiTier: 'premium_api',
      languages: SUPPORTED_LANGUAGE_CODES,
      support: 'dedicated',
    },
  },
  enterprise: {
    name: 'Enterprise',
    priceInPaise: 3999900,
    gstRatePercent: 18,
    features: {
      maxAdvocates: 50,
      maxDocumentsPerMonth: null,
      maxResearchQueriesPerMonth: null,
      aiTier: 'premium_api',
      languages: SUPPORTED_LANGUAGE_CODES,
      support: 'dedicated',
    },
  },
  custom: {
    name: 'Custom',
    priceInPaise: null,
    gstRatePercent: 18,
    features: {
      maxAdvocates: null,
      maxDocumentsPerMonth: null,
      maxResearchQueriesPerMonth: null,
      aiTier: 'premium_api',
      languages: SUPPORTED_LANGUAGE_CODES,
      support: 'dedicated',
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

export interface BillingStatus {
  plan: PlanType;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  usage: {
    documentsThisMonth: number;
    documentsLimit: number | null;
    researchThisMonth: number;
    researchLimit: number | null;
    advocatesActive: number;
    advocatesLimit: number | null;
  };
}

function getRazorpayClient(): Razorpay {
  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured');
  }

  return new Razorpay({
    key_id: config.RAZORPAY_KEY_ID,
    key_secret: config.RAZORPAY_KEY_SECRET,
  });
}

export function calculateInvoiceTotals(subtotalPaise: number, gstRatePercent: number) {
  const gstAmountPaise = Math.round((subtotalPaise * gstRatePercent) / 100);
  const totalPaise = subtotalPaise + gstAmountPaise;

  return {
    subtotalPaise,
    gstRatePercent,
    gstAmountPaise,
    totalPaise,
  };
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!config.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
  }

  const expected = crypto
    .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function getTenantPlan(tenantId: string): Promise<PlanType> {
  const result = await pool.query<{ plan: string }>('SELECT plan FROM tenants WHERE id = $1', [tenantId]);
  const plan = result.rows[0]?.plan;
  return plan && plan in PLANS ? (plan as PlanType) : 'starter';
}

export async function createCheckoutSession(
  tenantId: string,
  advocateEmail: string,
  firmName: string,
  plan: PlanType,
  successUrl: string,
  _cancelUrl: string
): Promise<{ sessionId: string; url: string; orderId?: string }> {
  const planConfig = PLANS[plan];
  if (planConfig.priceInPaise === null) {
    throw new Error('Custom plan requires sales-assisted onboarding');
  }

  const totals = calculateInvoiceTotals(planConfig.priceInPaise, planConfig.gstRatePercent);
  const razorpay = getRazorpayClient();

  const paymentLink = await razorpay.paymentLink.create({
    amount: totals.totalPaise,
    currency: 'INR',
    accept_partial: false,
    description: `${firmName} - ${planConfig.name} plan`,
    customer: {
      email: advocateEmail,
      name: firmName,
    },
    callback_url: successUrl,
    callback_method: 'get',
      notes: {
        tenantId,
        plan,
        subtotalPaise: String(totals.subtotalPaise),
        gstAmountPaise: String(totals.gstAmountPaise),
        sacCode: '998212',
      },
  });

  await pool.query(
    `UPDATE tenants
     SET razorpay_customer_id = COALESCE(razorpay_customer_id, $2),
         plan = $3
     WHERE id = $1`,
    [tenantId, paymentLink.customer?.email ?? advocateEmail, plan]
  );

  return {
    sessionId: paymentLink.id,
    url: paymentLink.short_url ?? successUrl,
  };
}

export async function createCustomerPortalSession(_tenantId: string, returnUrl: string): Promise<{ url: string }> {
  return { url: `${returnUrl}?billing=managed` };
}

export async function getBillingStatus(tenantId: string): Promise<BillingStatus> {
  const tenant = await pool.query<{
    plan: string;
    subscription_status: string;
    trial_ends_at: Date | null;
  }>(
    `SELECT plan, subscription_status, trial_ends_at FROM tenants WHERE id = $1`,
    [tenantId]
  );

  const quotaResult = await pool.query<{
    monthly_doc_limit: number | null;
    monthly_research_limit: number | null;
    current_month_docs: number;
    current_month_research: number;
  }>(
    `SELECT monthly_doc_limit, monthly_research_limit, current_month_docs, current_month_research
     FROM tenant_ai_quotas WHERE tenant_id = $1`,
    [tenantId]
  );

  const advocatesResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM attorneys WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId]
  );

  const plan = (tenant.rows[0]?.plan in PLANS ? tenant.rows[0]?.plan : 'starter') as PlanType;
  const planConfig = PLANS[plan];
  const quota = quotaResult.rows[0] ?? {
    monthly_doc_limit: planConfig.features.maxDocumentsPerMonth,
    monthly_research_limit: planConfig.features.maxResearchQueriesPerMonth,
    current_month_docs: 0,
    current_month_research: 0,
  };

  return {
    plan,
    status: (tenant.rows[0]?.subscription_status as BillingStatus['status']) ?? 'none',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: tenant.rows[0]?.trial_ends_at ? new Date(tenant.rows[0].trial_ends_at) : null,
    usage: {
      documentsThisMonth: quota.current_month_docs,
      documentsLimit: quota.monthly_doc_limit,
      researchThisMonth: quota.current_month_research,
      researchLimit: quota.monthly_research_limit,
      advocatesActive: Number.parseInt(advocatesResult.rows[0]?.count ?? '0', 10),
      advocatesLimit: planConfig.features.maxAdvocates,
    },
  };
}

export async function checkQuota(
  tenantId: string,
  quotaType: 'document' | 'research'
): Promise<{ allowed: boolean; remaining: number; limit: number | null }> {
  const billingStatus = await getBillingStatus(tenantId);

  if (quotaType === 'document') {
    const limit = billingStatus.usage.documentsLimit;
    const used = billingStatus.usage.documentsThisMonth;
    return {
      allowed: limit === null || used < limit,
      remaining: limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
      limit,
    };
  }

  const limit = billingStatus.usage.researchLimit;
  const used = billingStatus.usage.researchThisMonth;
  return {
    allowed: limit === null || used < limit,
    remaining: limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
    limit,
  };
}

export async function incrementQuota(tenantId: string, quotaType: 'document' | 'research'): Promise<void> {
  const column = quotaType === 'document' ? 'current_month_docs' : 'current_month_research';

  await pool.query(
    `INSERT INTO tenant_ai_quotas (tenant_id, monthly_doc_limit, monthly_research_limit, api_tier)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId, PLANS.starter.features.maxDocumentsPerMonth, PLANS.starter.features.maxResearchQueriesPerMonth, 'opensource']
  );

  await pool.query(`UPDATE tenant_ai_quotas SET ${column} = ${column} + 1 WHERE tenant_id = $1`, [tenantId]);
}

export async function handleRazorpayWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new Error('Invalid webhook signature');
  }

  const event = JSON.parse(rawBody.toString());
  const eventType = event.event as string;
  const payment = event.payload?.payment?.entity;
  const notes = payment?.notes ?? {};
  const tenantId = notes.tenantId as string | undefined;
  const plan = (notes.plan as PlanType | undefined) ?? 'starter';

  if (!tenantId) {
    logger.warn({ eventType }, 'Razorpay webhook missing tenantId note');
    return { received: true };
  }

  if (eventType === 'payment.captured') {
    await pool.query(
      `UPDATE tenants
       SET subscription_status = 'active',
           plan = $2
       WHERE id = $1`,
      [tenantId, plan]
    );

    const planConfig = PLANS[plan];
    await pool.query(
      `INSERT INTO tenant_ai_quotas (tenant_id, monthly_doc_limit, monthly_research_limit, api_tier)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET
         monthly_doc_limit = $2,
         monthly_research_limit = $3,
         api_tier = $4,
         current_month_docs = 0,
         current_month_research = 0,
         quota_reset_at = now() + interval '1 month'`,
      [tenantId, planConfig.features.maxDocumentsPerMonth, planConfig.features.maxResearchQueriesPerMonth, planConfig.features.aiTier]
    );

    await pool.query(
      `INSERT INTO audit_events (tenant_id, event_type, object_type, metadata)
       VALUES ($1, 'billing.payment_captured', 'payment', $2)`,
      [tenantId, JSON.stringify({ razorpayPaymentId: payment?.id, plan, amount: payment?.amount })]
    );
  }

  if (eventType === 'payment.failed') {
    await pool.query(`UPDATE tenants SET subscription_status = 'past_due' WHERE id = $1`, [tenantId]);
  }

  return { received: true };
}

export async function reportUsage(subscriptionId: string, quantity: number, action: 'set' | 'increment' = 'increment'): Promise<void> {
  logger.info({ subscriptionId, quantity, action }, 'Usage reporting recorded for internal analytics');
}

export async function createInvoiceForPlan(tenantId: string, plan: PlanType, createdBy: string | null) {
  const planConfig = PLANS[plan];
  if (planConfig.priceInPaise === null) {
    throw new Error('Custom billing invoices must be generated manually');
  }

  const totals = calculateInvoiceTotals(planConfig.priceInPaise, planConfig.gstRatePercent);
  const tenantPlan = await getTenantPlan(tenantId);
  const invoiceNumber = `EVD-${tenantPlan.toUpperCase()}-${Date.now()}`;

  const invoice = await pool.query<{ id: string }>(
    `INSERT INTO invoices (
       tenant_id, client_name, invoice_number, issue_date, due_date,
       subtotal_paise, gst_rate, gst_amount_paise, total_paise, status, created_by
     )
     VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '15 days', $4, $5, $6, $7, 'draft', $8)
     RETURNING id`,
    [tenantId, 'Tenant Billing Account', invoiceNumber, totals.subtotalPaise, totals.gstRatePercent, totals.gstAmountPaise, totals.totalPaise, createdBy]
  );

  return {
    id: invoice.rows[0]?.id,
    invoiceNumber,
    ...totals,
  };
}
