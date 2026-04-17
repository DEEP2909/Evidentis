"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Globe2,
  Landmark,
  ShieldCheck,
  Scale,
  ChevronRight,
  Users,
  Sparkles,
  X,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { SUPPORTED_LANGUAGE_CODES } from "@evidentis/shared";

import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";
import { BrandLogo } from "@/components/india/BrandLogo";

const languageCount = SUPPORTED_LANGUAGE_CODES.length;

const marqueeItems = [
  { label: "Supreme Court of India" },
  { label: "Delhi High Court" },
  { label: "Bombay High Court" },
  { label: "NCLT" },
  { label: "NCDRC" },
  { label: "MahaRERA" },
  { label: "eCourts" },
  { label: "ITAT" },
  { label: "SEBI Tribunal" },
  { label: "Armed Forces Tribunal" },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
};

const fadeUpAnim = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.9 },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 40, filter: "blur(4px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.8 },
  },
};

export default function HomePage() {
  const { t } = useTranslation();
  const [activeFeature, setActiveFeature] = useState<{
    icon: any;
    title: string;
    description: string;
    details: string;
  } | null>(null);

  const features = [
    {
      icon: Globe2,
      title: t("landing_feature1Title", { count: languageCount }),
      description: t("landing_feature1Desc"),
      details: t("landing_feature1Details", { defaultValue: "Our proprietary NLU engine translates dense legal boilerplate seamlessly into 23 Indian languages, preserving legal nuance across regions such as Hindi, Bengali, Tamil, and Telugu without losing contextual meaning." }),
    },
    {
      icon: Landmark,
      title: t("landing_feature2Title"),
      description: t("landing_feature2Desc"),
      details: t("landing_feature2Details", { defaultValue: "Direct webhook pipelines connecting directly with High Courts and eCourts. EvidentIS dynamically caches all recent tribunal judgements preventing an outdated corpus." }),
    },
    {
      icon: CalendarDays,
      title: t("landing_feature3Title"),
      description: t("landing_feature3Desc"),
      details: t("landing_feature3Details", { defaultValue: "Mitigate limitation act expirations automatically. Our algorithmic calendar understands specific tribunal filing lengths (NCLT, NCDRC, etc.) and notifies your legal command center instantly." }),
    },
    {
      icon: ShieldCheck,
      title: t("landing_feature4Title"),
      description: t("landing_feature4Desc"),
      details: t("landing_feature4Details", { defaultValue: "Fully aligned with India's new data security framework. Your matter documents rest strictly entirely on domestic servers with immutable SOC-2 audit logging and encryption." }),
    },
  ];

  return (
    <div className="grain-overlay relative min-h-screen bg-[#060709] text-[#f4f4f5] selection:bg-[#ff9933] selection:text-black overflow-hidden font-sans">
      {/* ── Ambient geometry ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Large outer circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute -top-[30%] -right-[15%] w-[1400px] h-[1400px] rounded-full border border-[#ff9933]/10 hidden lg:block"
        />
        {/* Inner ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
          className="absolute -top-[25%] -right-[10%] w-[1000px] h-[1000px] rounded-full border border-[#ff9933]/5 hidden lg:block"
        />
        {/* Diagonal grid */}
        <div className="absolute inset-0 grid-pattern opacity-40" />
        {/* Top saffron glow */}
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-[#ff9933]/[0.04] rounded-full blur-[120px]" />
        {/* Bottom navy glow */}
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#0f2557]/40 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen mx-auto max-w-7xl px-6 lg:px-12">
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between border-b border-white/[0.06]"
        >
          <BrandLogo size="lg" priority />
          <div className="flex items-center gap-6">
            <span className="hidden text-[10px] uppercase font-semibold tracking-[0.25em] text-[#ff9933]/80 md:inline">
              EvidentIS Software
            </span>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <LanguageSwitcher />
          </div>
        </motion.header>

        {/* ── Hero Main Content ── */}
        <main className="flex-1 flex flex-col justify-center py-16 lg:py-20">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Left: Typography Focus */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="max-w-2xl"
            >
              <motion.div variants={fadeUpAnim} className="mb-8">
                <span className="inline-flex items-center rounded-sm bg-[#ff9933]/[0.08] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffcf8c] border border-[#ff9933]/15">
                  <span className="w-1.5 h-1.5 bg-[#ff9933] rounded-full mr-2.5 animate-pulse" />
                  {t("landing_heroEyebrow")}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUpAnim}
                className="font-serif text-[3.5rem] leading-[1.02] tracking-tight lg:text-[5rem] antialiased"
              >
                {t("landing_heroTitle1")}
                <span className="italic text-white/30">{t("landing_heroTitle2")}</span>
                <br />
                {t("landing_heroTitle3")}
              </motion.h1>

              <motion.p
                variants={fadeUpAnim}
                className="mt-8 text-lg md:text-xl font-light text-white/50 leading-relaxed max-w-xl"
              >
                {t("landing_heroSubtitle")}
              </motion.p>

              <motion.div
                variants={fadeUpAnim}
                className="mt-12 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                {/* Primary CTA: Start Free Trial */}
                <Link
                  href="/register"
                  className="group relative inline-flex h-13 items-center justify-center overflow-hidden bg-white px-8 font-medium text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
                    <Sparkles className="h-4 w-4" />
                    {t("landing_ctaTrial")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-[#ff9933] translate-y-[100%] transition-transform duration-300 group-hover:translate-y-[0%] z-0" />
                </Link>

                {/* Secondary CTA: Login */}
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm tracking-wide text-white/60 border border-white/10 transition-all hover:text-white hover:border-white/20 hover:bg-white/[0.03]"
                >
                  {t("landing_ctaOpen")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>

              {/* Stakeholder link */}
              <motion.div variants={fadeUpAnim} className="mt-6">
                <Link
                  href="/portal/register"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/30 hover:text-[#ff9933] transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  {t("landing_ctaStakeholder")}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Right: Abstract UI Representation */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="relative lg:h-[520px] w-full border border-white/[0.06] bg-[#0c0c0f] p-8 flex flex-col overflow-hidden glow-ring"
            >
              {/* Background icon */}
              <div className="absolute top-0 right-0 p-6 opacity-20 text-[#ffcf8c]">
                <Scale className="w-28 h-28 stroke-[0.5]" />
              </div>

              {/* Decorative corner lines */}
              <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-[#ff9933]/15" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-[#ff9933]/15" />

              <motion.div
                variants={fadeUpAnim}
                className="mb-10 flex items-center justify-between"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#ffcf8c] font-semibold">
                  {t("landing_opFramework")}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-white/20 font-mono">
                  v3.2
                </span>
              </motion.div>

              <div className="grid gap-3 h-full">
                {features.map((feature, i) => (
                  <motion.div key={feature.title} variants={slideInRight}>
                    <button
                      type="button"
                      onClick={() => setActiveFeature(feature)}
                      className="flex items-center border border-white/[0.04] bg-[#111114] p-4 transition-all duration-300 hover:bg-[#1a1a20] hover:border-[#ff9933]/30 cursor-pointer group rounded-sm shadow-[0_0_0_0_rgba(255,153,51,0)] hover:shadow-[0_0_20px_-5px_rgba(255,153,51,0.15)] block w-full relative overflow-hidden text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-black/60 border border-white/[0.08] text-white/40 group-hover:text-[#ff9933] group-hover:border-[#ff9933]/40 transition-all duration-300 z-10 relative">
                        <feature.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="ml-4 flex flex-col z-10 relative">
                        <span className="font-serif text-lg tracking-wide text-white/90 group-hover:text-white transition-colors duration-300">
                          {feature.title}
                        </span>
                        <span className="mt-0.5 text-xs text-white/35 max-w-[280px] truncate group-hover:text-white/60 transition-colors duration-300">
                          {feature.description}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center justify-center p-2 z-10 relative bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110">
                        <Plus className="h-4 w-4 text-[#ff9933]" />
                      </div>
                      <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#ff9933]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </main>

        {/* ── Trial banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center py-4"
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 rounded-full border border-[#ff9933]/15 bg-[#ff9933]/[0.04] px-6 py-2.5 transition-all hover:bg-[#ff9933]/[0.08] hover:border-[#ff9933]/25"
          >
            <span className="w-2 h-2 bg-[#ff9933] rounded-full animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-[#ffcf8c]">
              {t("landing_trialBadge")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-[#ff9933]/60 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* ── Minimal Marquee ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1.2 }}
          className="border-t border-white/[0.04] py-6 mt-4 mb-6"
        >
          <div className="flex items-center overflow-hidden">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.25em] text-white/25 mr-8">
              {t("landing_trustedAcross")}
            </span>
            <div className="flex items-center gap-10 whitespace-nowrap opacity-50">
              <motion.div
                animate={{ x: [0, -1000] }}
                transition={{
                  repeat: Infinity,
                  ease: "linear",
                  duration: 40,
                }}
                className="flex gap-16"
              >
                {[...marqueeItems, ...marqueeItems].map((item, idx) => (
                  <span
                    key={idx}
                    className="font-serif italic tracking-wide text-sm text-white/50"
                  >
                    {item.label}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeFeature && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
              onClick={() => setActiveFeature(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0c0c0f] p-8 shadow-2xl glow-ring"
            >
              <button
                type="button"
                onClick={() => setActiveFeature(null)}
                className="absolute right-6 top-6 text-white/40 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff9933]/20 bg-[#ff9933]/10 text-[#ffcf8c]">
                <activeFeature.icon className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-3xl mb-4 font-light tracking-wide text-white/95">{activeFeature.title}</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#ff9933]/5 to-transparent z-0" />
                <p className="text-sm text-white/70 relative z-10 leading-relaxed indent-1 italic border-l-2 border-l-[#ff9933] pl-3">
                  {activeFeature.description}
                </p>
              </div>
              <p className="text-[#a1a1aa] mb-8 leading-relaxed">
                {activeFeature.details}
              </p>
              <button
                type="button"
                onClick={() => setActiveFeature(null)}
                className="w-full relative flex h-14 items-center justify-center overflow-hidden rounded-xl bg-white font-medium text-black transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-wider font-bold">
                  {t("got_it", { defaultValue: "Got it" })}
                </span>
                <div className="absolute inset-0 bg-[#ff9933] translate-y-[100%] transition-transform duration-300 group-hover:translate-y-[0%] z-0" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
