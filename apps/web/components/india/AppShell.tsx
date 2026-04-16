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
  Scale,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { useAuthStore } from "@/lib/auth";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandLogo } from "./BrandLogo";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: string[];
};

const ALL_NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard",       label: "Dashboard",   icon: LayoutDashboard, roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/matters",         label: "Matters",     icon: FolderOpen,      roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/documents",       label: "Documents",   icon: FileText,        roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/research",        label: "Research",    icon: Search,          roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/nyay-assist",     label: "Nyay Assist", icon: Sparkles,        roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/bare-acts",       label: "Bare Acts",   icon: ScrollText,      roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/templates",       label: "Templates",   icon: FileStack,       roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/calendar",        label: "Calendar",    icon: CalendarDays,    roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/analytics",       label: "Analytics",   icon: BarChart3,       roles: ["admin","senior_advocate","partner"] },
  { href: "/billing",         label: "Billing",     icon: ReceiptText,     roles: ["admin"] },
  { href: "/settings/privacy",label: "Privacy",     icon: ShieldCheck,     roles: ["admin","senior_advocate","partner"] },
  { href: "/admin",           label: "Admin Panel", icon: Settings,        roles: ["admin"] },
];

/** Role colour palette for avatar badge */
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:            { bg: "bg-red-500/20",    text: "text-red-300" },
  senior_advocate:  { bg: "bg-saffron-500/20", text: "text-saffron-300" },
  partner:          { bg: "bg-amber-500/20",  text: "text-amber-300" },
  junior_advocate:  { bg: "bg-blue-500/20",   text: "text-blue-300" },
  advocate:         { bg: "bg-blue-400/20",   text: "text-blue-200" },
  paralegal:        { bg: "bg-purple-500/20", text: "text-purple-300" },
};

/* ── Sidebar ────────────────────────────────────────────────── */
function ShellSidebar({
  pathname,
  role,
  name,
  onLogout,
  onNavigate,
}: {
  pathname: string;
  role: string;
  name: string;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const navItems = useMemo(
    () => ALL_NAV_ITEMS.filter((item) => item.roles.includes(role)),
    [role],
  );

  const roleColor = ROLE_COLORS[role] ?? { bg: "bg-white/10", text: "text-white/60" };

  return (
    <aside className="flex h-full flex-col border-r border-white/[0.07] bg-[#030b1a]/90 backdrop-blur-2xl">

      {/* Logo lockup — wider container for horizontal logo */}
      <div className="border-b border-white/[0.07] px-5 py-4">
        <Link href="/dashboard" className="group flex items-center gap-0" onClick={onNavigate}>
          <BrandLogo size="lg" priority />
        </Link>
        <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.3em] text-white/30 transition-colors group-hover:text-saffron-500/60 pl-0.5">
          Legal Intelligence
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/25">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {navItems.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.025, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/[0.09] text-white"
                      : "text-white/50 hover:bg-white/[0.06] hover:text-white/90"
                  }`}
                >
                  {/* Left accent bar for active */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute left-0 top-[15%] h-[70%] w-[2.5px] rounded-r-full"
                      style={{
                        background: "linear-gradient(180deg, #ff9933, #ffd18b)",
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  <item.icon
                    className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                      isActive
                        ? "text-saffron-400"
                        : "text-white/35 group-hover:text-white/65 group-hover:scale-110"
                    }`}
                  />
                  <span>{item.label}</span>

                  {/* Hover glow dot */}
                  {!isActive && (
                    <span className="ml-auto h-1 w-1 rounded-full bg-saffron-500 opacity-0 transition-opacity duration-200 group-hover:opacity-60" />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* User / actions footer */}
      <div className="border-t border-white/[0.07] px-3 py-4 space-y-3">
        {/* User card */}
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.045] px-3 py-2.5 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.065] hover:ring-saffron-500/15">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${roleColor.bg} ${roleColor.text} glow-pulse`}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-white/90">{name}</div>
            <div className="truncate text-[10px] capitalize text-white/35">
              {role.replaceAll("_", " ")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-lg p-1.5 text-white/35 transition-all duration-200 hover:bg-red-500/15 hover:text-red-300 hover:scale-110"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        <LanguageSwitcher />
      </div>
    </aside>
  );
}

/* ── Shell wrapper ───────────────────────────────────────────── */
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

  const role = user?.role ?? "junior_advocate";
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
      const last  = focusable[focusable.length - 1];

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
    <div className="min-h-screen text-slate-100" style={{
      background: "radial-gradient(ellipse 85% 50% at 50% -5%, rgba(255,153,51,0.06) 0%, transparent 60%), hsl(var(--background))",
    }}>
      <div className="mx-auto flex min-h-screen max-w-[1520px]">

        {/* Desktop sidebar */}
        <div className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <ShellSidebar pathname={pathname} role={role} name={name} onLogout={logout} />
          </div>
        </div>

        {/* Mobile overlay */}
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
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full w-[260px]"
                onClick={(e) => e.stopPropagation()}
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

        {/* Main content */}
        <main className="flex min-h-screen flex-1 flex-col overflow-hidden">

          {/* Sticky header */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-[#030b1a]/80 px-5 py-3 backdrop-blur-2xl lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                ref={menuButtonRef}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/60 hover:bg-white/8 hover:text-white lg:hidden"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-white/25 lg:inline">/</span>
                <h1 className="font-serif text-xl font-semibold tracking-tight">{title}</h1>
              </div>
            </div>
            <div className="lg:hidden">
              <LanguageSwitcher />
            </div>
          </header>

          {/* Page content with polished transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 p-5 lg:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Nyay Assist floating FAB */}
      {["admin","senior_advocate","junior_advocate","advocate","partner"].includes(role) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 240, damping: 20 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Link
            href="/nyay-assist"
            className="btn-ripple group flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold text-slate-950 shadow-2xl shadow-orange-500/30 transition-all hover:shadow-orange-500/45 glow-pulse"
            style={{
              background: "linear-gradient(135deg, #ff9933 0%, #ffd18b 55%, #ffb347 100%)",
            }}
            aria-label="Open Nyay Assist"
          >
            <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
            <span>Nyay Assist</span>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
