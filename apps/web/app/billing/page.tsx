"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EVIDENTIS_PLANS } from "@/lib/pricing";
import { billing } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

const invoices = [
  { id: "INV-2026-0012", date: "15 Apr 2026", amount: "₹17,698", status: "Paid" },
  { id: "INV-2026-0011", date: "15 Mar 2026", amount: "₹17,698", status: "Paid" },
  { id: "INV-2026-0010", date: "15 Feb 2026", amount: "₹17,698", status: "Paid" },
];

const CURRENT_USAGE = {
  documents: 284,
  research: 642,
  seats: 12,
};

function usagePercent(used: number, cap: number | null) {
  if (!cap || cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export default function BillingPage() {
  const { t } = useTranslation();

  const { data: billingData } = useQuery({
    queryKey: ["billing"],
    queryFn: () => billing.status(),
  });

  const currentPlan = EVIDENTIS_PLANS.find(p => p.key === billingData?.plan) ?? EVIDENTIS_PLANS[0];

  return (
    <AppShell title={t("billing")}>
      <div className="space-y-6 page-enter">
        <div className="grid gap-4 lg:grid-cols-3">
          {EVIDENTIS_PLANS.map((plan, index) => (
            <motion.article
              key={plan.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass p-6 transition ${
                plan.key === currentPlan.key
                  ? "border-saffron-500/40 shadow-lg shadow-orange-500/15"
                  : "hover:border-saffron-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-saffron-300">{plan.name}</p>
                {plan.key === currentPlan.key ? (
                  <Badge className="animate-pulse bg-saffron-500 text-slate-900">
                    {t("bill_currentPlan")}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-4 text-4xl font-semibold">{plan.price}</div>
              <p className="mt-1 text-sm text-white/50">{plan.billingSuffix}</p>
              <p className="mt-2 text-sm text-white/75">{plan.description}</p>
              <div className="mt-5 space-y-2 text-xs text-white/55">
                <p>{plan.notes}</p>
                <p>{plan.documentLimit}</p>
                <p>{plan.researchLimit}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <section className="glass p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {t("bill_usageTitle", { defaultValue: "Usage & Collections" })}
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {t("bill_usageDesc", {
                  defaultValue: "Usage counters now reflect the same plan limits shown on the landing page and admin panel.",
                })}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin#billing">{t("bill_managePlan")}</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-sm text-white/60">
                {t("bill_documentUsage", { defaultValue: "Document usage" })}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {CURRENT_USAGE.documents.toLocaleString("en-IN")} /{" "}
                {(currentPlan.documentCap ?? 0).toLocaleString("en-IN")}
              </p>
              <Progress
                value={usagePercent(CURRENT_USAGE.documents, currentPlan.documentCap)}
                className="mt-2 h-2 bg-white/15 [&>div]:bg-saffron-400"
              />
            </div>
            <div>
              <p className="text-sm text-white/60">
                {t("bill_researchUsage", { defaultValue: "Research usage" })}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {CURRENT_USAGE.research.toLocaleString("en-IN")} /{" "}
                {(currentPlan.researchCap ?? 0).toLocaleString("en-IN")}
              </p>
              <Progress
                value={usagePercent(CURRENT_USAGE.research, currentPlan.researchCap)}
                className="mt-2 h-2 bg-white/15 [&>div]:bg-blue-400"
              />
            </div>
            <div>
              <p className="text-sm text-white/60">
                {t("bill_teamSeats", { defaultValue: "Team seats" })}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {CURRENT_USAGE.seats} / {currentPlan.seatCap ?? "Custom"}
              </p>
              <Progress
                value={usagePercent(CURRENT_USAGE.seats, currentPlan.seatCap)}
                className="mt-2 h-2 bg-white/15 [&>div]:bg-green-400"
              />
            </div>
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="text-2xl font-semibold">
            {t("bill_invoicesTitle", { defaultValue: "Invoice History" })}
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-white/6 text-left text-xs uppercase tracking-[0.14em] text-white/50">
                <tr>
                  <th className="px-4 py-3">
                    {t("bill_invoice", { defaultValue: "Invoice" })}
                  </th>
                  <th className="px-4 py-3">
                    {t("bill_date", { defaultValue: "Date" })}
                  </th>
                  <th className="px-4 py-3">
                    {t("bill_amount", { defaultValue: "Amount" })}
                  </th>
                  <th className="px-4 py-3">
                    {t("doc_status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3">{invoice.id}</td>
                    <td className="px-4 py-3 text-white/70">{invoice.date}</td>
                    <td className="px-4 py-3">{invoice.amount}</td>
                    <td className="px-4 py-3">
                      <Badge className="border-green-500/35 bg-green-500/15 text-green-300">
                        {invoice.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
