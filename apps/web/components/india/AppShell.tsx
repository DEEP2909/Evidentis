"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
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
import { type ComponentType, type ReactNode, useMemo, useState } from "react";

import { useAuthStore } from "@/lib/auth";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: string[];
};

const ALL_NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "paralegal", "partner"] },
  { href: "/matters", label: "Matters", icon: FolderOpen, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "paralegal", "partner"] },
  { href: "/documents", label: "Documents", icon: FileText, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "paralegal", "partner"] },
  { href: "/research", label: "Research", icon: Search, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"] },
  { href: "/nyay-assist", label: "Nyay Assist", icon: Sparkles, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"] },
  { href: "/bare-acts", label: "Bare Acts", icon: ScrollText, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"] },
  { href: "/templates", label: "Templates", icon: FileStack, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "paralegal", "partner"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "senior_advocate", "partner"] },
  { href: "/billing", label: "Billing", icon: ReceiptText, roles: ["admin"] },
  { href: "/settings/privacy", label: "Privacy", icon: ShieldCheck, roles: ["admin", "senior_advocate", "partner"] },
  { href: "/admin", label: "Admin Panel", icon: Settings, roles: ["admin"] },
];

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
    [role]
  );

  return (
    <aside className="flex h-full flex-col border-r border-white/10 bg-slate-950/75 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
            <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" priority />
          </div>
          <div>
            <div className="text-base font-semibold">EvidentIS</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
              Legal Intelligence
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
            >
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                {isActive ? (
                  <motion.div layoutId="nav-pill" className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-saffron-500" />
                ) : null}
                <item.icon
                  className={`h-4 w-4 ${
                    isActive ? "text-saffron-500" : "text-white/45 group-hover:text-white/70"
                  }`}
                />
                <span>{item.label}</span>
                {isActive ? <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/35" /> : null}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron-500/20 text-xs font-semibold text-saffron-400">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs capitalize text-white/45">{role.replaceAll("_", " ")}</div>
          </div>
          <button
            onClick={() => void onLogout()}
            className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
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

  const role = user?.role ?? "junior_advocate";
  const name = user?.displayName ?? user?.email ?? "Advocate";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,153,51,0.08)_0%,transparent_60%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <div className="hidden w-72 lg:block">
          <ShellSidebar pathname={pathname} role={role} name={name} onLogout={logout} />
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm lg:hidden"
            >
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "tween", duration: 0.2 }}
                className="h-full w-72"
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
          ) : null}
        </AnimatePresence>

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-5 py-3 backdrop-blur-xl lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileOpen((open) => !open)}
                  aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <h1 className="text-xl font-semibold">{title}</h1>
              </div>
              <div className="lg:hidden">
                <LanguageSwitcher />
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 p-5 lg:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {["admin", "senior_advocate", "junior_advocate", "advocate", "partner"].includes(role) ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 220 }}
          className="fixed bottom-6 right-6"
        >
          <Link
            href="/nyay-assist"
            className="btn-ripple flex items-center gap-2.5 rounded-full bg-gradient-to-r from-saffron-500 to-saffron-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-2xl shadow-orange-500/30 transition-all hover:scale-105 hover:shadow-orange-500/45"
            aria-label="Open Nyay Assist"
          >
            <Sparkles className="h-4 w-4" />
            Nyay Assist
          </Link>
        </motion.div>
      ) : null}
    </div>
  );
}
