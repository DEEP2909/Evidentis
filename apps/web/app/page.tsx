"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Globe2, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGE_CODES } from "@evidentis/shared";

import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";

const languageCount = SUPPORTED_LANGUAGE_CODES.length;
const features = [
  {
    icon: Globe2,
    title: `${languageCount}-language UX`,
    description: "All scheduled Indian languages plus English with legal-context translations.",
  },
  {
    icon: Landmark,
    title: "India legal corpus",
    description: "Bare acts, BNS/BNSS/BSA mappings, case-law pipelines, and eCourts-ready matters.",
  },
  {
    icon: CalendarDays,
    title: "Court operations",
    description: "Hearing calendars, cause-list alerts, limitation tracking, and tribunal-aware workflows.",
  },
  {
    icon: ShieldCheck,
    title: "DPDP and GST ready",
    description: "India data-localisation defaults, consent workflows, GST invoices, and audit visibility.",
  },
];

const marqueeItems = [
  "Supreme Court of India",
  "Delhi High Court",
  "Bombay High Court",
  "NCLT",
  "NCDRC",
  "MahaRERA",
  "eCourts",
];

function AshokaChakra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-label="Ashoka Chakra">
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="60" cy="60" r="6" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index * 360) / 24;
        return (
          <line
            key={angle}
            x1="60"
            y1="60"
            x2="60"
            y2="12"
            stroke="currentColor"
            strokeWidth="2"
            transform={`rotate(${angle} 60 60)`}
          />
        );
      })}
    </svg>
  );
}

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#24478d_0%,#0f2557_40%,#071226_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <header className="glass flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
              <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" priority />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-saffron-300">India Legal SaaS</p>
              <h1 className="mt-1 text-2xl font-semibold">EvidentIS</h1>
              <p className="text-sm text-white/70">{t("tagline")}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </header>

        <section className="relative grid gap-10 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <motion.span className="float-particle absolute left-10 top-16 h-2 w-2 rounded-full bg-white/40" />
          <motion.span className="float-particle absolute left-28 top-40 h-1.5 w-1.5 rounded-full bg-saffron-300/70" style={{ animationDelay: "1.4s" }} />
          <motion.span className="float-particle absolute right-20 top-14 h-2 w-2 rounded-full bg-saffron-300/60" style={{ animationDelay: "2s" }} />

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#ffcf8c]">
              EvidentIS: Evidence-Based Intelligent Decision System
            </p>
            <h2 className="max-w-3xl text-5xl font-semibold leading-tight">{t("launchIndia")}</h2>
            <p className="mt-6 max-w-2xl text-lg text-white/75">{t("launchDetail")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="btn-ripple inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff9933] to-[#ffd18b] px-6 py-3 text-sm font-semibold text-slate-950 shadow-2xl shadow-orange-500/20"
              >
                {t("openPlatform")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/bare-acts"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("exploreWorkspace")}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/90 p-8 text-slate-900"
          >
            <div className="absolute right-7 top-7 flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle,#f8fafc,#e2e8f0)] text-[#0f2557]">
              <AshokaChakra className="h-16 w-16 ashoka-spin-fast" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#0f2557]/70">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              Nyay Operations Preview
            </p>
            <h3 className="mt-4 max-w-md text-3xl font-semibold text-[#0f2557]">
              From bare acts to hearings, one India-first legal operating system.
            </h3>
            <motion.div
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } },
              }}
              initial="hidden"
              animate="visible"
              className="mt-8 grid gap-4"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                  }}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-5"
                >
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2557] text-[#ffd18b]">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-lg font-semibold text-[#0f2557]">{feature.title}</h4>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 py-3">
          <div className="scroll-marquee flex items-center gap-8 px-6">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span key={`${item}-${index}`} className="text-sm text-white/70">
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
