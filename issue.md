Problem 1 — CURRENT_PLAN_KEY is hardcoded (the real bug)
Every tenant in your system will see "Professional" as their current plan regardless of what they actually subscribed to. The dashboard and admin page both import CURRENT_PLAN — a Starter firm will see "Professional" features highlighted, and an Enterprise firm sees the wrong limits.
CURRENT_PLAN shouldn't live in a static file at all. It should come from the API's billing response. Change your usage pattern:
typescript// Remove CURRENT_PLAN_KEY and CURRENT_PLAN entirely from pricing.ts

// In your auth store or a useBilling() hook, fetch the real plan:
const { data: billing } = useQuery({
  queryKey: ["billing"],
  queryFn: () => fetch("/api/billing/status").then(r => r.json()),
});

const currentPlan = EVIDENTIS_PLANS.find(p => p.key === billing?.plan) ?? null;

Problem 2 — Your plan keys and prices don't match your backend billing.ts
Your backend apps/api/src/billing.ts defines these plans with these prices:
Backend keyBackend pricestarter₹4,999/mogrowth₹14,999/moprofessional₹24,999/moenterprise₹39,999/mo
Your pricing.ts has professional at ₹14,999 — but that's actually the growth plan in the backend. You're missing growth entirely, and your professional price is ₹10,000 short.
Add the missing plan and fix the price:
typescriptexport type EvidentisPlan = {
  key: "starter" | "growth" | "professional" | "enterprise"; // add "growth"
  // ...rest unchanged
};

export const EVIDENTIS_PLANS: EvidentisPlan[] = [
  {
    key: "starter",
    price: "₹4,999",
    // ...
  },
  {
    key: "growth",           // NEW — was missing
    name: "Growth",
    price: "₹14,999",
    billingSuffix: "/month + GST",
    description: "Growing litigation or advisory team",
    notes: "18% GST extra · up to 15 users",
    seatCap: 15,
    documentCap: 500,
    researchCap: 1000,
    seatLimit: "15 advocates included",
    documentLimit: "500 documents/month",
    researchLimit: "1,000 research queries/month",
    highlights: [
      "Advanced research and Nyay Assist",
      "Billing and admin controls",
      "SSO / SCIM readiness",
      "Priority onboarding support",
    ],
  },
  {
    key: "professional",
    price: "₹24,999",        // was ₹14,999 — fix to match backend
    // ...
  },
  {
    key: "enterprise",
    price: "₹39,999",
    // ...
  },
];

Problem 3 — Starter caps don't match backend quota enforcement
Your backend enforces maxDocumentsPerMonth: 100 and maxResearchQueriesPerMonth: 200 for Starter. Your pricing.ts shows documentCap: 250 and researchCap: 300. Users on Starter will hit a 402 quota error at 101 documents even though the pricing page promised them 250. Fix the Starter entry:
typescript{
  key: "starter",
  documentCap: 100,    // was 250 — match backend enforcement
  researchCap: 200,    // was 300 — match backend enforcement
  documentLimit: "100 documents/month",
  researchLimit: "200 research queries/month",
}

Final cleaned-up file:
typescriptexport type EvidentisPlan = {
  key: "starter" | "growth" | "professional" | "enterprise";
  name: string;
  price: string;
  billingSuffix: string;
  description: string;
  notes: string;
  seatCap: number | null;
  documentCap: number | null;
  researchCap: number | null;
  seatLimit: string;
  documentLimit: string;
  researchLimit: string;
  highlights: string[];
};

export const EVIDENTIS_PLANS: EvidentisPlan[] = [
  {
    key: "starter",
    name: "Starter",
    price: "₹4,999",
    billingSuffix: "/month + GST",
    description: "Solo advocate or early-stage chamber",
    notes: "18% GST extra · up to 3 users",
    seatCap: 3,
    documentCap: 100,
    researchCap: 200,
    seatLimit: "Up to 3 advocates",
    documentLimit: "100 documents/month",
    researchLimit: "200 research queries/month",
    highlights: [
      "Matter and document workspace",
      "Core AI review workflows",
      "Basic stakeholder sharing",
      "Email support",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: "₹14,999",
    billingSuffix: "/month + GST",
    description: "Growing litigation or advisory team",
    notes: "18% GST extra · up to 15 users",
    seatCap: 15,
    documentCap: 500,
    researchCap: 1000,
    seatLimit: "15 advocates included",
    documentLimit: "500 documents/month",
    researchLimit: "1,000 research queries/month",
    highlights: [
      "Advanced research and Nyay Assist",
      "Billing and admin controls",
      "SSO / SCIM readiness",
      "Priority onboarding support",
    ],
  },
  {
    key: "professional",
    name: "Professional",
    price: "₹24,999",
    billingSuffix: "/month + GST",
    description: "Established firm with full AI workflows",
    notes: "18% GST extra · up to 30 users",
    seatCap: 30,
    documentCap: 2000,
    researchCap: 5000,
    seatLimit: "30 advocates included",
    documentLimit: "2,000 documents/month",
    researchLimit: "5,000 research queries/month",
    highlights: [
      "All Growth features",
      "Premium AI tier",
      "All Indian languages",
      "Dedicated onboarding support",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "₹39,999",
    billingSuffix: "/month + GST",
    description: "Large firm or corporate legal function",
    notes: "18% GST extra · up to 50 users",
    seatCap: 50,
    documentCap: null,
    researchCap: null,
    seatLimit: "Up to 50 advocates",
    documentLimit: "Custom document throughput",
    researchLimit: "Custom research limits",
    highlights: [
      "Enterprise rollout support",
      "Security and SSO alignment",
      "Custom AI workflow tuning",
      "Dedicated success reviews",
    ],
  },
];

// Do NOT use this as a static constant — fetch from /api/billing/status instead.
// This helper is only for lookups by key, e.g. in billing confirmation emails.
export function getPlanByKey(key: string): EvidentisPlan | undefined {
  return EVIDENTIS_PLANS.find((p) => p.key === key);
}
Remove CURRENT_PLAN and CURRENT_PLAN_KEY entirely — replace the three import sites in dashboard/page.tsx, billing/page.tsx, and admin/page.tsx with a useBilling() hook that reads from the API.

extract.py still has max_tokens=4096 — unchanged. Every extraction call on Azure GPT-4o-mini is burning 3–4× more token budget than needed.

assess and obligations still at 3072 — minor, but worth dropping to around 1800-2000.