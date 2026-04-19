"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Globe2,
  Landmark,
  Layers3,
  LockKeyhole,
  Menu,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { SpotlightCard } from "@/components/marketing/SpotlightCard";
import { BrandLogo } from "@/components/india/BrandLogo";
import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { EVIDENTIS_PLANS } from "@/lib/pricing";
import { useTranslation } from "react-i18next";

const heroMetrics = [
  { value: "36", label: "Indian jurisdictions supported" },
  { value: "< 60s", label: "Target AI turnaround" },
  { value: "DPDP", label: "Privacy-first workflows" },
  { value: "Role-based", label: "Views for every legal seat" },
];

const modules = [
  {
    icon: FileText,
    eyebrow: "Matter command",
    title: "Run intake, documents, obligations, and stakeholders from one legal workspace.",
    body:
      "Every matter becomes a structured operating system for your team: files, responsibilities, deadlines, flags, and discussions stay aligned without jumping between tools.",
    stats: [
      { label: "Structured matter rooms", value: "01" },
      { label: "Deadline intelligence", value: "02" },
      { label: "Document version control", value: "03" },
      { label: "Share-ready client views", value: "04" },
    ],
    checklist: ["Centralized documents and clause outputs", "Hearing and due-date tracking", "Share links for external stakeholders"],
  },
  {
    icon: BrainCircuit,
    eyebrow: "Nyay Assist",
    title: "Move from retrieval to action with legal research, act context, and drafting prompts in one place.",
    body:
      "Research answers pull from tenant documents and statutory context, while drafting copilots help your team move faster on review, obligations, and first-pass drafting.",
    stats: [
      { label: "Research with citations", value: "A" },
      { label: "Bare Act grounding", value: "B" },
      { label: "Drafting prompts by matter", value: "C" },
      { label: "Role-based access controls", value: "D" },
    ],
    checklist: ["Streaming answers for lawyers", "Private embeddings stay local", "Fallback model routing when APIs fail"],
  },
  {
    icon: ShieldCheck,
    eyebrow: "Compliance layer",
    title: "Treat privacy, retention, and auditability as first-class product flows, not afterthoughts.",
    body:
      "EvidentIS keeps privacy and operational accountability visible inside the product, so compliance work does not disappear into policies or spreadsheets.",
    stats: [
      { label: "DPDP request tracking", value: "P1" },
      { label: "Erasure workflow hooks", value: "P2" },
      { label: "Audit-friendly actions", value: "P3" },
      { label: "Tenant separation", value: "P4" },
    ],
    checklist: ["Consent status and request history", "Role-aware analytics access", "Evidence of action for operational audits"],
  },
] as const;

const platformCards = [
  {
    icon: Layers3,
    title: "Role-specific workspaces",
    text: "Admins, senior advocates, associates, paralegals, and clients each get focused surfaces instead of one overloaded dashboard.",
  },
  {
    icon: Search,
    title: "Research grounded in your corpus",
    text: "Research flows combine matter evidence, statutory context, and saved queries so answers stay useful inside real practice.",
  },
  {
    icon: Workflow,
    title: "From intake to closeout",
    text: "Documents, obligations, flags, and external stakeholder access follow the matter throughout the entire lifecycle.",
  },
];

const audienceCards = [
  {
    title: "For firm leadership",
    copy: "Understand workload, privacy requests, matter health, and document throughput without waiting for weekly reports.",
    points: ["Firm analytics", "Billing and quotas", "Security and user controls"],
    icon: Building2,
    span: "lg:col-span-4 lg:row-span-2",
  },
  {
    title: "For senior advocates",
    copy: "Review high-risk issues, hearings, and AI-supported research from a surface that feels like a command center, not a document dump.",
    points: ["Matter oversight", "Research and bare acts", "Hearing and obligation visibility"],
    icon: Scale,
    span: "lg:col-span-2",
  },
  {
    title: "For associates",
    copy: "Keep assigned matters moving with document workflows, uploads, clause reviews, and AI-assisted first passes.",
    points: ["Assigned matter queues", "Document review actions", "Research history"],
    icon: Bot,
    span: "lg:col-span-2",
  },
  {
    title: "For paralegals and clients",
    copy: "Give operations and stakeholders just enough access to complete their work without exposing the entire internal system.",
    points: ["Upload and calendar support", "Portal access", "Share-based collaboration"],
    icon: Users,
    span: "lg:col-span-4",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Create and scope the matter",
    text: "Set the matter structure, attach the right team, and establish the source of truth for documents and obligations.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Ingest and analyze documents",
    text: "Upload evidence, contracts, or case files and route them through extraction, review, and risk workflows.",
    icon: FileCheck2,
  },
  {
    step: "03",
    title: "Research and draft with context",
    text: "Use Nyay Assist, bare acts, and matter-specific context to answer questions or kick off drafting work.",
    icon: ScrollText,
  },
  {
    step: "04",
    title: "Track deadlines and external collaboration",
    text: "Manage obligations, hearings, and stakeholder access without losing the audit trail behind each action.",
    icon: CalendarClock,
  },
];

const trustCards = [
  {
    icon: LockKeyhole,
    title: "Privacy by design",
    text: "DPDP-aware consent, erasure, and request history are part of the product surface, not a separate compliance spreadsheet.",
  },
  {
    icon: Globe2,
    title: "Indian legal context",
    text: "The platform is shaped around Indian jurisdictions, bare acts, local workflows, and the realities of legal practice in India.",
  },
  {
    icon: ShieldCheck,
    title: "Operational confidence",
    text: "Audit-friendly behavior, tenant controls, and role-aware access patterns keep the system credible under enterprise scrutiny.",
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<(typeof modules)[number]>(modules[0]);
  const reducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.5]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 110]);
  const heroScale = useTransform(scrollYProgress, [0, 0.7], [1, reducedMotion ? 1 : 0.97]);
  const navLinks = useMemo(
    () => [
      { label: t("landing_navPlatform", { defaultValue: "Platform" }), href: "#platform" },
      { label: t("landing_navWorkflows", { defaultValue: "Workflows" }), href: "#workflows" },
      { label: t("landing_navPricing", { defaultValue: "Pricing" }), href: "#pricing" },
      { label: t("landing_navSecurity", { defaultValue: "Security" }), href: "#security" },
    ],
    [t]
  );
  const pricing = useMemo(
    () =>
      EVIDENTIS_PLANS.map((plan) => ({
        name: plan.name,
        price: plan.price,
        subtext: plan.billingSuffix,
        description: plan.description,
        highlights: plan.highlights,
        accent: plan.key === "professional" ? "border-saffron-400/30" : "border-white/10",
        featured: plan.key === "professional",
      })),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-saffron-500/16 blur-[170px]" />
        <div className="absolute right-[8%] top-[18%] h-[26rem] w-[26rem] rounded-full bg-blue-500/10 blur-[150px]" />
        <div className="absolute bottom-[-8rem] left-[45%] h-[28rem] w-[28rem] rounded-full bg-indigo-500/12 blur-[180px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(6,7,11,0.9),rgba(6,7,11,0.72))] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
          <BrandLogo size="md" priority />

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-white/62 transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            <Button asChild variant="outline">
              <Link href="/login">{t("login")}</Link>
            </Button>
            <Button asChild>
              <Link href="/register">
                {t("landing_ctaTrial")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/68 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/[0.08] bg-[#08090d]/95 px-6 py-5 backdrop-blur-2xl md:hidden"
            >
              <div className="space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-white/72"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <LanguageSwitcher />
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/login">{t("login")}</Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/register">{t("landing_ctaTrial")}</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10">
        <section ref={heroRef} className="mx-auto max-w-[1180px] px-5 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-20">
          <motion.div
            style={reducedMotion ? undefined : { opacity: heroOpacity, y: heroY, scale: heroScale }}
            className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
          >
            <div className="max-w-3xl">
              <div className="section-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                {t("launchIndia")}
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-[4.75rem]">
                {t("landing_heroTitleMake", { defaultValue: "Make your legal product feel like an" })}
                <span className="block hero-gradient-text">operating system, not a dashboard.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/64 lg:text-lg">
                {t("launchDetail")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    {t("landing_ctaTrial")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/portal/register">
                    {t("landing_ctaStakeholder")}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroMetrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-[1.45rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <div className="text-2xl font-semibold tracking-tight text-white">{metric.value}</div>
                    <div className="mt-1 text-sm leading-6 text-white/52">{metric.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <SpotlightCard className="p-5 lg:p-7">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/38">Platform preview</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Matter command center</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Live modules
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-3">
                  {modules.map((module) => (
                    <button
                      key={module.title}
                      type="button"
                      onClick={() => setActiveModule(module)}
                      className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-200 ${
                        activeModule.title === module.title
                          ? "border-saffron-400/28 bg-saffron-500/12 shadow-[0_0_0_1px_rgba(94,106,210,0.12)]"
                          : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                          <module.icon className="h-4.5 w-4.5 text-saffron-300" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">{module.eyebrow}</div>
                          <div className="mt-1 text-sm font-medium leading-6 text-white/86">{module.title}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-saffron-300">{activeModule.eyebrow}</div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{activeModule.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/62">{activeModule.body}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {activeModule.stats.map((stat) => (
                      <div key={stat.label} className="rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-4">
                        <div className="text-sm font-semibold text-white">{stat.value}</div>
                        <div className="mt-1 text-sm leading-6 text-white/52">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3">
                    {activeModule.checklist.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm text-white/72">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        </section>

        <section id="platform" className="border-t border-white/[0.08] py-16 lg:py-[4.5rem]">
          <div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <div className="section-kicker">
                <Layers3 className="h-3.5 w-3.5" />
                Product overview
              </div>
              <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white lg:text-[2.85rem]">
                Built to feel credible in front of partners, associates, clients, and IT.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-white/62">
                The product is structured around real legal operations: matter execution, document review, statutory context, privacy obligations, and stakeholder collaboration.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {platformCards.map((card, index) => (
                <SpotlightCard key={card.title} className="p-5">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <card.icon className="h-5 w-5 text-saffron-300" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/58">{card.text}</p>
                  </motion.div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] py-16 lg:py-[4.5rem]">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="max-w-3xl">
              <div className="section-kicker">
                <Users className="h-3.5 w-3.5" />
                Role-aware experience
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white lg:text-[2.85rem]">
                One platform, different command surfaces for every legal role.
              </h2>
            </div>

            <div className="mt-10 grid auto-rows-[1fr] gap-4 lg:grid-cols-6">
              {audienceCards.map((card) => (
                <SpotlightCard key={card.title} className={`p-6 ${card.span}`}>
                  <div className="flex h-full flex-col">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <card.icon className="h-5 w-5 text-saffron-300" />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-tight text-white">{card.title}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-white/58">{card.copy}</p>
                    <div className="mt-6 space-y-3">
                      {card.points.map((point) => (
                        <div key={point} className="flex items-center gap-3 text-sm text-white/72">
                          <span className="h-1.5 w-1.5 rounded-full bg-saffron-300" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        <section id="workflows" className="border-t border-white/[0.08] py-16 lg:py-[4.5rem]">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <div className="section-kicker">
                  <Workflow className="h-3.5 w-3.5" />
                  End-to-end legal workflows
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white lg:text-[2.85rem]">
                  Give your team a workflow spine from matter creation to client-ready output.
                </h2>
                <p className="mt-5 text-lg leading-8 text-white/62">
                  The platform is not just a place to upload documents. It is the operational thread that keeps legal work coordinated, reviewable, and fast.
                </p>
              </div>

              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <SpotlightCard key={step.step} className="p-5 lg:p-6">
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.42, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col gap-5 md:flex-row md:items-start"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-saffron-300">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[11px] font-mono uppercase tracking-[0.26em] text-white/36">{step.step}</div>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{step.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-white/58">{step.text}</p>
                      </div>
                    </motion.div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-white/[0.08] py-16 lg:py-[4.5rem]">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="section-kicker">
                  <CircleDollarSign className="h-3.5 w-3.5" />
                  {t("landing_pricingOverview", { defaultValue: "Pricing overview" })}
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white lg:text-[2.85rem]">
                  {t("landing_pricingTitle", {
                    defaultValue:
                      "Choose a legal operating tier that matches your current team size and workflow depth.",
                  })}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-white/58">
                {t("landing_pricingDesc", {
                  defaultValue:
                    "These cards now mirror the actual product pricing used in billing and admin. GST is extra as shown in each plan.",
                })}
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {pricing.map((tier) => (
                <SpotlightCard
                  key={tier.name}
                  className={`flex h-full flex-col p-6 ${tier.featured ? "bg-[linear-gradient(180deg,rgba(94,106,210,0.18),rgba(255,255,255,0.04))]" : ""} ${tier.accent}`}
                >
                  {tier.featured ? (
                    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-saffron-400/28 bg-saffron-500/14 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-saffron-300">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Recommended for growing firms
                    </div>
                  ) : null}
                  <div className="text-sm font-medium text-white/56">{tier.name}</div>
                  <div className="mt-3 text-4xl font-semibold tracking-tight text-white">{tier.price}</div>
                  <div className="mt-1 text-sm text-white/48">{tier.subtext}</div>
                  <p className="mt-5 text-sm leading-7 text-white/58">{tier.description}</p>
                  <div className="mt-6 space-y-3">
                    {tier.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-3 text-sm text-white/72">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Button asChild variant={tier.featured ? "default" : "outline"} className="w-full">
                      <Link href="/register">
                        {tier.name === "Enterprise"
                          ? t("landing_talkToSales", { defaultValue: "Talk to sales" })
                          : t("landing_startConversation", { defaultValue: "Start conversation" })}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="border-t border-white/[0.08] py-16 lg:py-[4.5rem]">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="section-kicker">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Trust and security
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white lg:text-[2.85rem]">
                  Enterprise-grade credibility needs more than dark mode and a chatbot.
                </h2>
                <p className="mt-5 text-lg leading-8 text-white/62">
                  Legal teams need products that feel safe to operate, easy to explain, and ready for procurement and partner-level scrutiny.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {trustCards.map((card) => (
                  <SpotlightCard key={card.title} className="p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <card.icon className="h-5 w-5 text-saffron-300" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/58">{card.text}</p>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] py-16 lg:py-[4.5rem]">
          <div className="mx-auto max-w-[1180px] px-5 lg:px-8">
            <SpotlightCard className="overflow-hidden p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <div className="section-kicker">
                    <Landmark className="h-3.5 w-3.5" />
                    {t("landing_readyTitle", { defaultValue: "Ready to see the product in motion?" })}
                  </div>
                  <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-white lg:text-[2.85rem]">
                    {t("landing_readyHeading", {
                      defaultValue:
                        "Launch a trial workspace, explore the product story, or open the stakeholder portal immediately.",
                    })}
                  </h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-white/62">
                    {t("landing_readyDesc", {
                      defaultValue:
                        "The workspace is designed to feel polished and operational from the first screen. The next step is getting your matter structure and team roles inside it.",
                    })}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild size="lg" className="w-full">
                    <Link href="/register">
                      {t("landing_ctaTrial")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full">
                    <Link href="/login">
                      {t("openPlatform")}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="w-full sm:col-span-2">
                    <Link href="/portal/register">
                      {t("landing_ctaStakeholder")}
                      <Users className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </SpotlightCard>

            <footer className="mt-10 flex flex-col gap-6 border-t border-white/[0.08] pt-8 md:flex-row md:items-center md:justify-between">
              <BrandLogo size="md" />
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/46">
                <span>{t("launchDetail")}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-white/16" />
                <span>{t("launchIndia")}</span>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
