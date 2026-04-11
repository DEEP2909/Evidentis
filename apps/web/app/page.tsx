"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Globe2, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGE_CODES } from "@evidentis/shared";

import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";

const languageCount = SUPPORTED_LANGUAGE_CODES.length;
const features = [
  { icon: Globe2, title: `${languageCount}-language UX`, description: "All constitutional Indian languages plus English, with RTL support for Urdu, Kashmiri, and Sindhi." },
  { icon: Landmark, title: "India legal corpus", description: "Bare acts, BNS/BNSS/BSA mappings, case-law pipelines, and eCourts-ready matters." },
  { icon: CalendarDays, title: "Court operations", description: "Hearing calendars, cause-list alerts, limitation tracking, and tribunal-aware workflows." },
  { icon: ShieldCheck, title: "DPDP and GST ready", description: "India data-localisation defaults, consent workflows, GST invoices, and audit visibility." },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#24478d_0%,#0f2557_40%,#071226_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[#ffd18b]">India Legal SaaS</p>
            <h1 className="mt-2 text-2xl font-semibold">EvidentIS</h1>
            <p className="text-sm text-white/70">{t("tagline")}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <section className="grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#ffcf8c]">Evidentis: Evidence-Based Intelligent Decision System</p>
            <h2 className="max-w-3xl text-5xl font-semibold leading-tight">
              {t("launchIndia")}
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-white/75">
              {t("launchDetail")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff9933,#ffd18b)] px-6 py-3 text-sm font-semibold text-slate-950 shadow-2xl shadow-orange-500/20"
              >
                {t("openPlatform")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/bare-acts"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white"
              >
                {t("exploreWorkspace")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="legal-paper relative overflow-hidden rounded-[2.5rem] border border-white/10 p-8 text-slate-900"
          >
            <div className="ashoka-ring absolute right-8 top-8 flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle,#f8fafc,#e2e8f0)] text-[#0f2557]">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#0f2557]/60">Nyay Operations Preview</p>
            <h3 className="mt-4 max-w-md text-3xl font-semibold text-[#0f2557]">
              From bare acts to hearings, one India-first legal operating system.
            </h3>
            <div className="mt-8 grid gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white/80 p-5">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2557] text-[#ffd18b]">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-[#0f2557]">{feature.title}</h4>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
