export type EvidentisPlan = {
  key: "starter" | "professional" | "enterprise";
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
    documentCap: 250,
    researchCap: 300,
    seatLimit: "Up to 3 advocates",
    documentLimit: "250 documents/month",
    researchLimit: "300 research queries/month",
    highlights: [
      "Matter and document workspace",
      "Core AI review workflows",
      "Basic stakeholder sharing",
      "Email support",
    ],
  },
  {
    key: "professional",
    name: "Professional",
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

export const CURRENT_PLAN_KEY: EvidentisPlan["key"] = "professional";

export const CURRENT_PLAN =
  EVIDENTIS_PLANS.find((plan) => plan.key === CURRENT_PLAN_KEY) ?? EVIDENTIS_PLANS[1];
