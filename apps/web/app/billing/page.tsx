"use client";

import { motion } from "framer-motion";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

const plans = [
  { name: "Starter", price: "₹4,999", description: "Solo advocate or early-stage chamber", notes: "18% GST extra · up to 3 users" },
  { name: "Professional", price: "₹14,999", description: "Growing litigation or advisory team", notes: "18% GST extra · up to 15 users" },
  { name: "Enterprise", price: "₹39,999", description: "Large firm or corporate legal function", notes: "18% GST extra · up to 50 users" },
];

const invoices = [
  { id: "INV-2026-0012", date: "15 Apr 2026", amount: "₹17,698", status: "Paid" },
  { id: "INV-2026-0011", date: "15 Mar 2026", amount: "₹17,698", status: "Paid" },
  { id: "INV-2026-0010", date: "15 Feb 2026", amount: "₹17,698", status: "Paid" },
];

export default function BillingPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("billing")}>
      <div className="space-y-6 page-enter">
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass p-6 transition ${
                plan.name === "Professional" ? "border-saffron-500/40 shadow-lg shadow-orange-500/15" : "hover:border-saffron-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-saffron-300">{plan.name}</p>
                {plan.name === "Professional" ? (
                  <Badge className="animate-pulse bg-saffron-500 text-slate-900">Current Plan</Badge>
                ) : null}
              </div>
              <div className="mt-4 text-4xl font-semibold">{plan.price}</div>
              <p className="mt-2 text-sm text-white/75">{plan.description}</p>
              <p className="mt-5 text-xs text-white/55">{plan.notes}</p>
            </motion.article>
          ))}
        </div>

        <section className="glass p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Usage & Collections</h2>
            <Button className="animate-pulse shadow-lg shadow-orange-500/30">Pay with Razorpay</Button>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-sm text-white/60">Document usage</p>
              <p className="mt-1 text-sm text-white/80">2,847 / 5,000</p>
              <Progress value={57} className="mt-2 h-2 bg-white/15 [&>div]:bg-saffron-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Research usage</p>
              <p className="mt-1 text-sm text-white/80">642 / 1,000</p>
              <Progress value={64} className="mt-2 h-2 bg-white/15 [&>div]:bg-blue-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Team seats</p>
              <p className="mt-1 text-sm text-white/80">12 / 15</p>
              <Progress value={80} className="mt-2 h-2 bg-white/15 [&>div]:bg-green-400" />
            </div>
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="text-2xl font-semibold">Invoice History</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-white/6 text-left text-xs uppercase tracking-[0.14em] text-white/50">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3">{invoice.id}</td>
                    <td className="px-4 py-3 text-white/70">{invoice.date}</td>
                    <td className="px-4 py-3">{invoice.amount}</td>
                    <td className="px-4 py-3">
                      <Badge className="border-green-500/35 bg-green-500/15 text-green-300">{invoice.status}</Badge>
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
