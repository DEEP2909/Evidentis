"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, AlertTriangle, CheckCircle2, Info, Shield,
  ChevronRight, X, Upload, Sparkles, Users, FileText,
  BarChart3, Rocket,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/india/AppShell";
import { useAuthStore } from "@/lib/auth";
import { analytics } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type Kpi = {
  label: string;
  value: string;
  delta: string;
  trend?: "up" | "down" | "neutral";
};

/* ── KPI Skeleton ── */
function KpiSkeleton() {
  return (
    <div className="glass kpi-card p-5 animate-pulse">
      <div className="h-3 w-24 rounded bg-white/10 mb-3" />
      <div className="h-9 w-16 rounded bg-white/8 mb-2" />
      <div className="h-3 w-20 rounded bg-white/6" />
    </div>
  );
}

function DashboardKpiGrid({ kpis, isLoading }: { kpis: readonly Kpi[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={`skel-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => (
        <motion.article
          key={kpi.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.35 }}
          className="glass kpi-card card-lift p-5"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">{kpi.label}</p>
          <div className="mt-2 kpi-value counter-up text-4xl font-semibold" style={{ animationDelay: `${index * 0.06 + 0.15}s` }}>
            {kpi.value}
          </div>
          <p className={`mt-1 text-xs ${
            kpi.trend === "up"
              ? "text-green-400"
              : kpi.trend === "down"
              ? "text-red-400"
              : "text-white/55"
          }`}>
            {kpi.trend === "up" && "↑ "}
            {kpi.trend === "down" && "↓ "}
            {kpi.delta}
          </p>
        </motion.article>
      ))}
    </div>
  );
}

function HealthBar({ value, delay = 0 }: { value: number; delay?: number }) {
  const tone =
    value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ delay, duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${tone}`}
        style={{
          boxShadow: value >= 80
            ? "0 0 8px rgba(34,197,94,0.4)"
            : value >= 60
            ? "0 0 8px rgba(234,179,8,0.4)"
            : "0 0 8px rgba(239,68,68,0.4)",
        }}
      />
    </div>
  );
}

/** Role to badge color map */
const ROLE_BADGE: Record<string, string> = {
  Admin:           "border-red-500/35 bg-red-500/10 text-red-300",
  "Sr. Advocate":  "border-saffron-500/35 bg-saffron-500/10 text-saffron-300",
  "Jr. Advocate":  "border-blue-500/35 bg-blue-500/10 text-blue-300",
  Paralegal:       "border-purple-500/35 bg-purple-500/10 text-purple-300",
  Partner:         "border-amber-500/35 bg-amber-500/10 text-amber-300",
};

/* ── Alert severity config ── */
type AlertSeverity = "critical" | "warning" | "success" | "info";
type AlertConfig = {
  text: string;
  severity: AlertSeverity;
};

const alertClassMap: Record<AlertSeverity, { cls: string; icon: React.ElementType; iconCls: string }> = {
  critical: { cls: "alert-critical",  icon: Shield,         iconCls: "text-red-400" },
  warning:  { cls: "alert-warning",   icon: AlertTriangle,  iconCls: "text-yellow-400" },
  success:  { cls: "alert-success",   icon: CheckCircle2,   iconCls: "text-green-400" },
  info:     { cls: "alert-info",      icon: Info,           iconCls: "text-blue-400" },
};

/* ── Onboarding Checklist ── */
function OnboardingChecklist({ userRole }: { userRole: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("evidentis_onboarding");
      if (stored === "dismissed") {
        setDismissed(true);
        return;
      }
      try {
        const parsed = JSON.parse(stored || "{}");
        setCompleted(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  if (dismissed || userRole !== "admin") return null;

  const allDone = completed.invite && completed.upload && completed.analyze;
  if (allDone) return null;

  const steps = [
    { key: "invite", label: "Invite your first advocate", icon: Users, href: "/admin" },
    { key: "upload", label: "Upload a contract", icon: Upload, href: "/documents" },
    { key: "analyze", label: "Run your first AI analysis", icon: Sparkles, href: "/nyay-assist" },
  ];

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("evidentis_onboarding", "dismissed");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="glass p-6 relative overflow-hidden"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-saffron-500/[0.04] rounded-full blur-[60px] pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-500/15 text-saffron-400">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Get Started with EvidentIS</h3>
            <p className="text-sm text-white/50">Complete these steps to activate your workspace</p>
          </div>
        </div>
        <button type="button" onClick={handleDismiss} className="text-white/30 hover:text-white/60 transition-colors p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <Link
            key={step.key}
            href={step.href}
            className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
              completed[step.key]
                ? "border-green-500/30 bg-green-500/5 text-green-300"
                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:border-saffron-500/25"
            }`}
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              completed[step.key] ? "bg-green-500/20 text-green-400" : "bg-saffron-500/15 text-saffron-400"
            }`}>
              {completed[step.key] ? <CheckCircle2 className="h-4 w-4" /> : <span>{index + 1}</span>}
            </div>
            <span className="text-sm font-medium">{step.label}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto text-white/0 transition-all group-hover:text-saffron-500/70 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </motion.section>
  );
}

/* ── Quick Research Button (shared) ── */
function QuickResearchButton({ prompt }: { prompt: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/nyay-assist?q=${encodeURIComponent(prompt)}`)}
      className="group w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/75 transition-all hover:bg-white/10 hover:text-white hover:border-saffron-500/20"
    >
      <span className="flex items-center justify-between">
        {prompt}
        <ChevronRight className="h-3.5 w-3.5 text-saffron-500/0 transition-all group-hover:text-saffron-500/70 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/* ── Admin Dashboard ── */
function AdminDashboard() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analytics.firmOverview(),
    staleTime: 60_000,
  });

  const kpis: readonly Kpi[] = overview
    ? [
        { label: "Active Advocates",  value: String(overview.totalMatters > 0 ? Math.min(overview.activeMatters, 99) : 0), delta: "Live from API",       trend: "neutral" },
        { label: "Open Matters",      value: String(overview.activeMatters),  delta: `${overview.totalMatters} total`,     trend: "neutral" },
        { label: "Docs Processed",    value: String(overview.totalDocuments).replace(/\B(?=(\d{3})+(?!\d))/g, ","), delta: `${overview.documentsThisMonth} this month`, trend: "up" },
        { label: "Flags Resolved",    value: String(overview.flagsResolved),  delta: "Action required",                    trend: "down" },
      ]
    : [];

  const teamActivity = [
    { name: "Aarav Mehta",    role: "Admin",        action: "Reviewed SSO config",    time: "5 min ago" },
    { name: "Nandini Rao",    role: "Sr. Advocate", action: "Uploaded 3 documents",   time: "1 hr ago" },
    { name: "Vihaan Kapoor",  role: "Jr. Advocate", action: "Created new matter",     time: "2 hr ago" },
    { name: "Sana Iqbal",     role: "Paralegal",    action: "Filed hearing update",   time: "3 hr ago" },
  ];

  const alerts: AlertConfig[] = [
    { text: "3 advocates have MFA disabled — enforce in Security settings", severity: "critical" },
    { text: "SCIM provisioning synced 2 new members from Okta",             severity: "info" },
    { text: "4 DPDP consent workflows require review before deadline",       severity: "warning" },
    { text: "CI/CD pipeline passed — v19 deployed to production",           severity: "success" },
  ];

  return (
    <AppShell title={t("dash_firmCommand")}>
      <div className="space-y-6 page-enter">
        <OnboardingChecklist userRole="admin" />

        <DashboardKpiGrid kpis={kpis} isLoading={isLoading} />

        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          {/* Team Activity */}
          <section className="glass p-6">
            <h2 className="mb-5 text-lg font-semibold">{t("dash_teamActivity")}</h2>
            <div className="space-y-1">
              {teamActivity.map((item, index) => (
                <motion.div
                  key={`${item.name}-${item.time}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.24 + index * 0.06, duration: 0.28 }}
                  className="flex items-center gap-3 border-b border-white/10 py-3 last:border-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-500/20 text-xs font-semibold text-saffron-400">
                    {item.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.name}</div>
                    <p className="text-xs text-white/55">{item.action}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE[item.role] ?? "border-white/20 text-white/55"}`}>
                    {item.role}
                  </span>
                  <span className="shrink-0 text-xs text-white/35">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Subscription */}
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-semibold">{t("dash_subscription")}</h2>
            <div className="rounded-2xl border border-saffron-500/30 bg-saffron-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-saffron-400">Professional Plan</div>
              <div className="mt-2 kpi-value text-2xl font-semibold">
                ₹14,999
                <span className="ml-1 text-sm font-normal text-white/55">/mo + GST</span>
              </div>
              <div className="mt-2 text-sm text-white/70">12 / 15 advocates active</div>
              <div className="mt-3">
                <HealthBar value={80} delay={0.2} />
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <div className="flex justify-between">
                <span>Next invoice</span>
                <span className="text-white/90">15 May 2026</span>
              </div>
              <div className="flex justify-between">
                <span>Docs used</span>
                <span className="text-white/90">{overview ? `${String(overview.totalDocuments).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} / 5,000` : "— / 5,000"}</span>
              </div>
            </div>
          </section>
        </div>

        {/* System Alerts */}
        <section className="glass p-6">
          <h2 className="mb-5 text-lg font-semibold">{t("dash_systemAlerts")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((alert, index) => {
              const cfg = alertClassMap[alert.severity];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={alert.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + index * 0.05 }}
                  className={`flex items-start gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm ${cfg.cls}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.iconCls}`} />
                  <span className="text-white/80">{alert.text}</span>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ── Senior Advocate Dashboard ── */
function SeniorAdvocateDashboard() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analytics.firmOverview(),
    staleTime: 60_000,
  });

  const kpis: readonly Kpi[] = overview
    ? [
        { label: "My Active Matters",    value: String(overview.activeMatters),                            delta: "Live from API",         trend: "neutral" },
        { label: "Hearings This Week",   value: "—",                                                     delta: "Check calendar",        trend: "neutral" },
        { label: "Docs Pending Review",  value: String(overview.totalDocuments - overview.flagsResolved), delta: "Pending review",         trend: "down" },
        { label: "Avg. Matter Health",   value: overview.avgProcessingTime ? `${Math.round(100 - overview.avgProcessingTime)}%` : "—", delta: "Computed",   trend: "up" },
      ]
    : [];

  const portfolio = [
    { name: "Acme Corp Acquisition",    health: 92, flags: 2 },
    { name: "TechStart Series B",       health: 85, flags: 5 },
    { name: "Global Services RFP",      health: 71, flags: 8 },
    { name: "Patent Portfolio Review",  health: 68, flags: 12 },
    { name: "Employment Restructure",   health: 45, flags: 18 },
  ];

  const hearings = [
    { date: "Mon 14", title: "Section 138 NI Act",   court: "Delhi District Court", urgency: "high" },
    { date: "Tue 15", title: "RERA Appeal — Client X", court: "MahaRERA Tribunal",  urgency: "medium" },
    { date: "Thu 17", title: "IBC Admission",          court: "NCLT Mumbai Bench",  urgency: "high" },
    { date: "Fri 18", title: "Consumer Complaint",     court: "NCDRC",              urgency: "low" },
  ];

  const urgencyMap: Record<string, string> = {
    high:   "border-red-500/35 bg-red-500/10 text-red-300",
    medium: "border-yellow-500/35 bg-yellow-500/10 text-yellow-300",
    low:    "border-green-500/35 bg-green-500/10 text-green-300",
  };

  return (
    <AppShell title={t("dash_myPractice")}>
      <div className="space-y-6">
        <DashboardKpiGrid kpis={kpis} isLoading={isLoading} />

        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          {/* Upcoming Hearings */}
          <section className="glass p-6">
            <h2 className="mb-5 text-lg font-semibold">{t("dash_upcomingHearings")}</h2>
            <div className="space-y-1">
              {hearings.map((hearing, index) => (
                <motion.div
                  key={`${hearing.title}-${hearing.date}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex items-center gap-4 border-b border-white/10 py-3 last:border-0"
                >
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-xs font-semibold text-saffron-400">{hearing.date.split(" ")[0]}</div>
                    <div className="kpi-value text-2xl font-semibold">{hearing.date.split(" ")[1]}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{hearing.title}</p>
                    <p className="truncate text-xs text-white/55">{hearing.court}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${urgencyMap[hearing.urgency]}`}>
                    {hearing.urgency}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Nyay Assist quick prompts */}
          <section className="glass p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-saffron-400">{t("dash_aiResearch")}</p>
            <h2 className="mb-5 mt-1 text-lg font-semibold">{t("assistant")}</h2>
            <div className="space-y-2">
              {[
                "Explain Section 138 NI Act limitation period",
                "Latest RERA compliance duties — Maharashtra",
                "Draft legal notice under Section 80 CPC",
                "Map IPC provisions to BNS replacements",
              ].map((prompt) => (
                <QuickResearchButton key={prompt} prompt={prompt} />
              ))}
            </div>
          </section>
        </div>

        {/* Portfolio Health */}
        <section className="glass p-6">
          <h2 className="mb-5 text-lg font-semibold">{t("dash_portfolioHealth")}</h2>
          <div className="space-y-4">
            {portfolio.map((matter, index) => (
              <div key={matter.name} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{matter.name}</span>
                    <span
                      className={
                        matter.health >= 80
                          ? "text-green-400"
                          : matter.health >= 60
                          ? "text-yellow-400"
                          : "text-red-400"
                      }
                    >
                      {matter.health}%
                    </span>
                  </div>
                  <HealthBar value={matter.health} delay={0.2 + index * 0.08} />
                </div>
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                  {matter.flags} flags
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ── Junior Advocate Dashboard ── */
function JuniorAdvocateDashboard() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analytics.firmOverview(),
    staleTime: 60_000,
  });

  const kpis: readonly Kpi[] = overview
    ? [
        { label: "Assigned Matters",  value: String(overview.activeMatters),  delta: "Live from API",       trend: "neutral" },
        { label: "Pending Documents", value: String(overview.documentsThisMonth), delta: "Review requested",  trend: "down" },
        { label: "Next Hearing",      value: "—",                            delta: "Check calendar",      trend: "neutral" },
      ]
    : [];

  return (
    <AppShell title={t("dash_myWorkspace")}>
      <div className="space-y-6">
        <DashboardKpiGrid kpis={kpis} isLoading={isLoading} />
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-semibold">{t("dash_assignedMatters")}</h2>
            <p className="text-sm text-white/65">
              {t("dash_assignedDesc")}
            </p>
            <Button asChild className="mt-4 btn-ripple">
              <Link href="/matters" className="inline-flex items-center gap-2">
                {t("dash_openMatters")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-semibold">{t("dash_quickResearch")}</h2>
            <div className="space-y-2">
              {["Section 138 NI Act", "RERA compliance", "BNS mappings from IPC"].map((prompt) => (
                <QuickResearchButton key={prompt} prompt={prompt} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Paralegal Dashboard ── */
function ParalegalDashboard() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analytics.firmOverview(),
    staleTime: 60_000,
  });

  const kpis: readonly Kpi[] = overview
    ? [
        { label: "Documents to Upload", value: String(overview.documentsThisMonth), delta: "This month", trend: "neutral" },
        { label: "Upcoming Tasks",      value: String(overview.flagsResolved),      delta: "Action items", trend: "down" },
      ]
    : [];

  return (
    <AppShell title={t("dash_paralegalWorkspace")}>
      <div className="space-y-6">
        <DashboardKpiGrid kpis={kpis} isLoading={isLoading} />
        <section className="glass p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("dash_todayTasks")}</h2>
          <p className="text-sm text-white/65">
            {t("dash_todayTasksDesc")}
          </p>
        </section>
      </div>
    </AppShell>
  );
}

/* ── Page Entry ── */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const role = user?.role;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?returnUrl=%2Fdashboard");
      return;
    }
    if (!isLoading && role === "client") {
      router.replace("/portal/demo");
    }
  }, [isLoading, isAuthenticated, role, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-saffron-500" />
          <p className="text-sm text-white/40">{t("dash_loadingWorkspace")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white/40 text-sm">
        {t("redirecting")}
      </div>
    );
  }

  if (role === "admin") return <AdminDashboard />;
  if (role === "senior_advocate" || role === "partner") return <SeniorAdvocateDashboard />;
  if (role === "junior_advocate" || role === "advocate") return <JuniorAdvocateDashboard />;
  if (role === "paralegal") return <ParalegalDashboard />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white/40 text-sm">
      Redirecting…
    </div>
  );
}
