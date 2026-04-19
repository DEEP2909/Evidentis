"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileStack,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { getCaps, type AdvocateRole } from "@/lib/role-capabilities";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavItem = {
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  isVisible: (role: AdvocateRole) => boolean;
};

type NavSection = {
  id: string;
  label: string;
  items: readonly NavItem[];
};

const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "firm",
    label: "Firm Management",
    items: [
      { href: "/admin", labelKey: "nav_admin", icon: Settings, isVisible: (role) => role === "admin" },
      { href: "/billing", labelKey: "nav_billing", icon: ReceiptText, isVisible: (role) => ["admin", "partner"].includes(role) },
      { href: "/settings/privacy", labelKey: "nav_privacy", icon: ShieldCheck, isVisible: (role) => ["admin", "senior_advocate", "partner"].includes(role) },
      { href: "/admin#security", labelKey: "nav_security", icon: ShieldCheck, isVisible: (role) => role === "admin" },
    ],
  },
  {
    id: "legal",
    label: "Legal Work",
    items: [
      { href: "/dashboard", labelKey: "nav_dashboard", icon: LayoutDashboard, isVisible: (role) => role !== "client" },
      { href: "/matters", labelKey: "nav_matters", icon: FolderOpen, isVisible: (role) => role !== "client" },
      { href: "/documents", labelKey: "nav_documents", icon: FileText, isVisible: (role) => role !== "client" },
      { href: "/calendar", labelKey: "nav_calendar", icon: CalendarDays, isVisible: (role) => role !== "client" },
    ],
  },
  {
    id: "knowledge",
    label: "Research & Knowledge",
    items: [
      { href: "/nyay-assist", labelKey: "nav_nyayAssist", icon: Sparkles, isVisible: (role) => ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"].includes(role) },
      { href: "/research", labelKey: "nav_research", icon: Search, isVisible: (role) => ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"].includes(role) },
      { href: "/bare-acts", labelKey: "nav_bareActs", icon: ScrollText, isVisible: (role) => ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"].includes(role) },
      { href: "/templates", labelKey: "nav_templates", icon: FileStack, isVisible: (role) => ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"].includes(role) },
    ],
  },
  {
    id: "analytics",
    label: "Insights",
    items: [
      { href: "/analytics", labelKey: "nav_analytics", icon: BarChart3, isVisible: (role) => ["admin", "senior_advocate", "partner"].includes(role) },
    ],
  },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: "bg-red-500/12", text: "text-red-200", border: "border-red-400/20" },
  senior_advocate: { bg: "bg-saffron-500/14", text: "text-saffron-300", border: "border-saffron-400/24" },
  partner: { bg: "bg-blue-500/12", text: "text-blue-200", border: "border-blue-400/20" },
  junior_advocate: { bg: "bg-cyan-500/12", text: "text-cyan-200", border: "border-cyan-400/20" },
  advocate: { bg: "bg-indigo-500/12", text: "text-indigo-200", border: "border-indigo-400/20" },
  paralegal: { bg: "bg-emerald-500/12", text: "text-emerald-200", border: "border-emerald-400/20" },
};

function ShellSidebar({
  pathname,
  role,
  name,
  onLogout,
  onNavigate,
}: {
  pathname: string;
  role: AdvocateRole;
  name: string;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const navSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.isVisible(role)),
      })).filter((section) => section.items.length > 0),
    [role],
  );

  const roleColor = ROLE_COLORS[role] ?? { bg: "bg-white/10", text: "text-white/70", border: "border-white/10" };

  const { data: obligationsCount } = useQuery({
    queryKey: ["obligations-due-count"],
    queryFn: async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/obligations?due_within_days=7&count=true`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("evidentis_access_token") || ""}` },
          },
        );
        if (!res.ok) return 0;
        const data = await res.json();
        return typeof data === "number" ? data : (data?.count ?? data?.data?.length ?? 0);
      } catch {
        return 0;
      }
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  return (
    <aside className="flex h-full flex-col border-r border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,9,14,0.96),rgba(5,5,8,0.94))] backdrop-blur-2xl">
      <div className="border-b border-white/[0.08] px-5 py-5">
        <Link href="/dashboard" className="inline-flex" onClick={onNavigate}>
          <BrandLogo size="md" priority />
        </Link>
        <div className="mt-4 rounded-[1.4rem] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/42">India legal workspace</div>
          <p className="mt-2 text-sm leading-6 text-white/64">
            One control layer for matters, AI research, compliance, templates, and deadline tracking.
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navSections.map((section, sectionIndex) => (
          <div key={section.id} className={sectionIndex === 0 ? "" : "mt-6"}>
            <div className="mb-3 px-2 text-[10px] font-mono uppercase tracking-[0.28em] text-white/28">
              {section.label}
            </div>
            <ul className="space-y-1">
              {section.items.map((item, index) => {
                const baseHref = item.href.split("#")[0];
                const isActive = pathname === baseHref || (baseHref !== "/dashboard" && pathname.startsWith(baseHref));

                return (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sectionIndex * 0.05 + index * 0.025, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link href={item.href} onClick={onNavigate} className={isActive ? "nav-item active" : "nav-item group"}>
                      {isActive && (
                        <motion.span
                          layoutId="nav-accent"
                          className="absolute left-0 top-[18%] h-[64%] w-[3px] rounded-r-full bg-[linear-gradient(180deg,#aab4ff,#5e6ad2)]"
                          transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        />
                      )}
                      <item.icon
                        className={
                          isActive
                            ? "h-4 w-4 shrink-0 text-saffron-300"
                            : "h-4 w-4 shrink-0 text-white/34 transition-colors duration-200 group-hover:text-white/70"
                        }
                      />
                      <span suppressHydrationWarning className="text-[13px] font-medium">
                        {item.labelKey === "nav_security" ? "SSO & Security" : t(item.labelKey)}
                      </span>

                      {baseHref === "/calendar" && typeof obligationsCount === "number" && obligationsCount > 0 ? (
                        <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-red-500/25">
                          {obligationsCount > 9 ? "9+" : obligationsCount}
                        </span>
                      ) : (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/10 transition-colors duration-200 group-hover:bg-saffron-400/60" />
                      )}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] px-4 py-4">
        <div className="rounded-[1.45rem] border border-white/[0.08] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white/92">{name}</div>
              <div className="truncate text-[11px] uppercase tracking-[0.22em] text-white/34">
                {role.replaceAll("_", " ")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-white/45 transition-all duration-200 hover:border-red-400/18 hover:bg-red-500/10 hover:text-red-200"
              suppressHydrationWarning
              title={t("logout")}
              aria-label={t("logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const role = (user?.role ?? "junior_advocate") as AdvocateRole;
  const name = user?.displayName ?? user?.email ?? "Advocate";

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = mobilePanelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (focusable?.length) focusable[0].focus();

    const menuButton = menuButtonRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[18%] h-[28rem] w-[28rem] rounded-full bg-saffron-500/10 blur-[140px]" />
        <div className="absolute top-[18%] right-[8%] h-[24rem] w-[24rem] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_52%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px]">
        <div className="hidden w-[272px] shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <ShellSidebar pathname={pathname} role={role} name={name} onLogout={logout} />
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              aria-label="Mobile navigation"
              onClick={() => setMobileOpen(false)}
            >
              <motion.div
                ref={mobilePanelRef}
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="h-full w-[272px]"
                onClick={(event) => event.stopPropagation()}
              >
                <ShellSidebar
                  pathname={pathname}
                  role={role}
                  name={name}
                  onLogout={logout}
                  onNavigate={() => setMobileOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,8,12,0.88),rgba(7,8,12,0.76))] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 lg:px-6">
              <div className="flex items-center gap-3">
                <Button
                  ref={menuButtonRef}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 border border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white lg:hidden"
                  onClick={() => setMobileOpen((open) => !open)}
                  aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                >
                  {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/34">Workspace control layer</div>
                  <h1 suppressHydrationWarning className="mt-1 text-2xl font-semibold tracking-tight text-white">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 md:inline-flex">
                  {role.replaceAll("_", " ")}
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex-1 px-4 py-5 lg:px-6 lg:py-6"
            >
              <TrialBanner />
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {!pathname.includes("/nyay-assist") && <AppShellFab role={role} />}
    </div>
  );
}

function AppShellFab({ role }: { role: AdvocateRole }) {
  const { t } = useTranslation();

  if (!getCaps(role).canAccessNyayAssist) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Link
        href="/nyay-assist"
        className="btn-ripple group flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold"
        aria-label="Open Nyay Assist"
      >
        <Sparkles className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
        <span suppressHydrationWarning>{t("shell_nyayAssistFab")}</span>
      </Link>
    </motion.div>
  );
}

function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem("trial_banner_dismissed")) {
      setDismissed(true);
      return;
    }

    const trialEnd = localStorage.getItem("evidentis_trial_ends_at");
    if (!trialEnd) return;

    try {
      const endDate = new Date(trialEnd);
      const now = new Date();
      const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff <= 7) {
        setDaysLeft(diff);
      }
    } catch {
      // ignore invalid date
    }
  }, []);

  if (dismissed || daysLeft === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-6 flex flex-col gap-3 rounded-[1.6rem] border border-saffron-400/18 bg-[linear-gradient(135deg,rgba(94,106,210,0.18),rgba(255,255,255,0.04))] px-5 py-4 shadow-[0_0_0_1px_rgba(94,106,210,0.08),0_18px_40px_rgba(0,0,0,0.24)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-saffron-400/20 bg-saffron-500/16">
          <Sparkles className="h-4 w-4 text-saffron-300" />
        </div>
        <span className="text-sm text-white/72">
          <span className="font-semibold text-white">{t("trial_endsIn", { days: daysLeft })}</span>
          <span className="text-white/55"> - {t("trial_upgradeNow")}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/admin/billing" className="btn-ripple rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
          {t("trial_upgradeCta")}
        </Link>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem("trial_banner_dismissed", "1");
          }}
          className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/45 transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
          aria-label="Dismiss trial banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
