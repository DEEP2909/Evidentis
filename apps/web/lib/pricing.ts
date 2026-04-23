export type EvidentisPlan = {
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

export function getPlanByKey(key: string): EvidentisPlan | undefined {
  return EVIDENTIS_PLANS.find((p) => p.key === key);
}
