"use client";

import { AppShell } from "@/components/india/AppShell";
import { useTranslation } from "react-i18next";

const plans = [
  { name: "Starter", price: "₹4,999", description: "Solo advocate or early-stage chamber", notes: "18% GST extra · up to 3 users" },
  { name: "Professional", price: "₹14,999", description: "Growing litigation or advisory team", notes: "18% GST extra · up to 15 users" },
  { name: "Enterprise", price: "₹39,999", description: "Large firm or corporate legal function", notes: "18% GST extra · up to 50 users" },
];

export default function BillingPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("billing")}>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.25em] text-[#ffd18b]">{plan.name}</p>
            <div className="mt-4 text-4xl font-semibold">{plan.price}</div>
            <p className="mt-3 text-sm text-white/75">{plan.description}</p>
            <p className="mt-6 text-xs text-white/55">{plan.notes}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-2xl font-semibold">GST-aware invoicing and Razorpay collection</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/80">SAC Code 9982 for legal services</div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/80">Client GSTIN validation and tax invoice generation</div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/80">Amounts stored in paise for accounting precision</div>
        </div>
      </section>
    </AppShell>
  );
}
