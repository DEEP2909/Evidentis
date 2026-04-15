"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Globe2, Landmark, ShieldCheck, Scale, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGE_CODES } from "@evidentis/shared";

import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";
import { BrandLogo } from "@/components/india/BrandLogo";

const languageCount = SUPPORTED_LANGUAGE_CODES.length;

const features = [
  {
    icon: Globe2,
    title: `${languageCount}-Language UX`,
    description: "Deep integrations with BNS/BNSS translations in regional dialects.",
  },
  {
    icon: Landmark,
    title: "India Legal Corpus",
    description: "Real-time updates to Bare acts, case-law, and eCourts matters.",
  },
  {
    icon: CalendarDays,
    title: "Court Operations",
    description: "Algorithmic hearing alerts and Tribunal-aware limitation limits.",
  },
  {
    icon: ShieldCheck,
    title: "DPDP Ready",
    description: "India-localized data default, transparent audit and sovereign encryption.",
  },
];

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
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const fadeUpAnim = {
  hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.8 },
  },
};

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen bg-[#070708] text-[#f4f4f5] selection:bg-[#ff9933] selection:text-black overflow-hidden font-sans">
      
      {/* Absolute minimal geometric ambient */}
      <div className="pointer-events-none absolute inset-0 z-0 flex justify-end opacity-20 hidden lg:flex">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className="w-[1200px] h-[1200px] rounded-full border-[1px] border-[#ff9933]/20 translate-x-[20%] -translate-y-[20%]"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen mx-auto max-w-7xl px-6 lg:px-12">
        
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between border-b border-white/5"
        >
          <BrandLogo size="lg" priority />
          <div className="flex items-center gap-6">
            <span className="hidden text-[10px] uppercase font-semibold tracking-[0.2em] text-[#ff9933] md:inline">
              EvidentIS Software
            </span>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <LanguageSwitcher />
          </div>
        </motion.header>

        {/* ── Hero Main Content ── */}
        <main className="flex-1 flex flex-col justify-center py-16 lg:py-24">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            
            {/* Left: Typography Focus */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="max-w-2xl"
            >
              <motion.div variants={fadeUpAnim} className="mb-8">
                <span className="inline-flex items-center rounded-sm bg-[#ff9933]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#ffcf8c] border border-[#ff9933]/20">
                  <span className="w-1.5 h-1.5 bg-[#ff9933] rounded-full mr-2 animate-pulse" />
                  India-First Legal AI
                </span>
              </motion.div>

              <motion.h1 
                variants={fadeUpAnim}
                className="font-serif text-[3.5rem] leading-[1.05] tracking-tight lg:text-[4.5rem] antialiased"
              >
                Intelligent <br/>
                <span className="text-white/40 italic">Decision</span> System
              </motion.h1>

              <motion.p 
                variants={fadeUpAnim}
                className="mt-8 text-lg md:text-xl font-light text-white/60 leading-relaxed max-w-xl"
              >
                EvidentIS represents a paradigm shift for Indian legal tech. Built symmetrically with the latest DPDP standards and equipped with a 36-jurisdiction neural corpus. 
              </motion.p>

              <motion.div variants={fadeUpAnim} className="mt-12 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <Link
                  href="/login"
                  className="group relative inline-flex h-12 items-center justify-center overflow-hidden bg-white px-8 font-medium text-black transition-all hover:scale-[1.02]"
                >
                  <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
                    Open Platform <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-[#ff9933] translate-y-[100%] transition-transform group-hover:translate-y-[0%] z-0" />
                </Link>
                <Link
                  href="/bare-acts"
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm tracking-wide text-white/50 transition-colors hover:text-white"
                >
                  Explore Documentation
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Right: Abstract UI Representation */}
            <motion.div
               variants={staggerContainer}
               initial="hidden"
               animate="show"
               className="relative lg:h-[500px] w-full border border-white/10 bg-[#111113] p-8 flex flex-col overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-30 text-[#ffcf8c]">
                <Scale className="w-24 h-24 stroke-1" />
              </div>

              <motion.div variants={fadeUpAnim} className="mb-10 text-xs uppercase tracking-widest text-[#ffcf8c] font-semibold">
                Operational Framework
              </motion.div>

              <div className="grid gap-3 h-full">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="flex items-center border border-white/5 bg-[#1a1a1c] p-4 transition-colors hover:bg-white/5 cursor-crosshair group"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-black border border-white/10 text-white/50 group-hover:text-[#ff9933] group-hover:border-[#ff9933]/30 transition-all">
                      <feature.icon className="h-4 w-4" />
                    </div>
                    <div className="ml-4 flex flex-col">
                      <span className="font-serif text-lg tracking-wide text-white">{feature.title}</span>
                      <span className="mt-0.5 text-xs text-white/40 max-w-[250px] truncate">{feature.description}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

          </div>
        </main>

        {/* ── Minimal Marquee ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="border-t border-white/5 py-6 mt-12 mb-6"
        >
          <div className="flex items-center overflow-hidden">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mr-8">
              Trusted Across
            </span>
            <div className="flex items-center gap-10 whitespace-nowrap opacity-60">
               <motion.div 
                 animate={{ x: [0, -1000] }} 
                 transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
                 className="flex gap-16"
               >
                 {[...marqueeItems, ...marqueeItems].map((item, idx) => (
                    <span key={idx} className="font-serif italic tracking-wide text-sm">
                      {item.label}
                    </span>
                 ))}
               </motion.div>
            </div>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}

