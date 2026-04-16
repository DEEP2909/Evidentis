# EvidentIS — Complete Frontend Redesign Master Prompt
> Version 19 → Version 20 | Role-Differentiated, Animated, Production-Grade

---

## 1. CODEBASE AUDIT FINDINGS

### 1.1 Total Pages Inventory (22 routes)

| # | Route | File | Current Design System | Issues |
|---|-------|------|-----------------------|--------|
| 1 | `/` | `app/page.tsx` | AppShell-free, navy gradient + framer-motion | Good foundation; hero needs animation lift |
| 2 | `/login` | `app/login/page.tsx` | Split-panel, light right + dark left | Solid; needs interactive input focus states |
| 3 | `/forgot-password` | `app/forgot-password/page.tsx` | Unknown (not read) | Likely matches login |
| 4 | `/reset-password/[token]` | `app/reset-password/[token]/page.tsx` | Unknown | Needs to match login |
| 5 | `/invitation/[token]` | `app/invitation/[token]/page.tsx` | Unknown | Needs to match login |
| 6 | `/dashboard` | `app/dashboard/page.tsx` | AppShell — glassmorphism navy | **CRITICAL: same for ALL roles** |
| 7 | `/matters` | `app/matters/page.tsx` | Light `bg-background`, framer-motion cards | Mismatch with AppShell dark pages |
| 8 | `/matters/[id]` | `app/matters/[id]/page.tsx` | Unknown | Needs audit |
| 9 | `/matters/[id]/documents/[docId]` | `app/matters/[id]/documents/[docId]/page.tsx` | PDF viewer page | Needs audit |
| 10 | `/documents` | `app/documents/page.tsx` | Flat dark `#0A1628` | **Different system from AppShell** |
| 11 | `/research` | `app/research/page.tsx` | AppShell — glassmorphism navy | Static, no live query input |
| 12 | `/nyay-assist` | `app/nyay-assist/page.tsx` | AppShell — glassmorphism navy | Static prompts, no chat interface |
| 13 | `/bare-acts` | `app/bare-acts/page.tsx` | AppShell — glassmorphism navy | OK |
| 14 | `/bare-acts/[actSlug]` | `app/bare-acts/[actSlug]/page.tsx` | Unknown | Needs audit |
| 15 | `/analytics` | `app/analytics/page.tsx` | Flat dark `#0A1628` | **Different system; no role guard** |
| 16 | `/admin` | `app/admin/page.tsx` | Flat dark `#0A1628`, sidebar layout | **No AuthGuard; accessible to all roles** |
| 17 | `/billing` | `app/billing/page.tsx` | AppShell | Read-only plan display only |
| 18 | `/calendar` | `app/calendar/page.tsx` | AppShell | Static hearing cards |
| 19 | `/settings/privacy` | `app/settings/privacy/page.tsx` | AppShell | Static checklist |
| 20 | `/templates` | `app/templates/page.tsx` | AppShell | OK |
| 21 | `/templates/[id]/generate` | `app/templates/[id]/generate/page.tsx` | Unknown | Needs audit |
| 22 | `/portal/[shareToken]` | `app/portal/[shareToken]/page.tsx` | Light `bg-background`, no auth required | Client-facing; correct design |

---

### 1.2 Stakeholder Types

The app has **7 roles** defined in `ADVOCATE_ROLES`: `admin`, `senior_advocate`, `junior_advocate`, `paralegal`, `client`, `partner`, `advocate`.

These collapse into **5 meaningful stakeholder groups**:

| Group | Roles | What They Need |
|-------|-------|----------------|
| **Firm Admin** | `admin` | Team mgmt, billing, SSO/SCIM, webhooks, playbooks, firm-wide analytics, all matters |
| **Senior Lawyer** | `senior_advocate`, `partner` | All matters (owned + team), research, analytics, bare acts, templates, calendar, nyay-assist, per-matter document viewer |
| **Junior Lawyer** | `junior_advocate`, `advocate` | Assigned matters only, documents, research, bare acts, templates, calendar, nyay-assist. No billing, no admin, no firm analytics |
| **Paralegal** | `paralegal` | Assigned matters, documents (upload/view), calendar. No research tools, limited templates |
| **Client** | `client` | **ONLY** `/portal/[shareToken]` — zero access to main app |

---

### 1.3 Critical Issues To Fix

#### 🔴 Issue 1 — Single Dashboard for All Roles
**Problem:** `/dashboard/page.tsx` renders identical content for every logged-in user. An admin sees hearing calendars; a client (if somehow logged into the main app) sees internal matter data.

**Fix:** Implement role-based dashboard routing inside `dashboard/page.tsx`:
```tsx
// dashboard/page.tsx
const { user } = useAuthStore();

if (user?.role === 'admin') return <AdminDashboard />;
if (user?.role === 'senior_advocate' || user?.role === 'partner') return <SeniorAdvocateDashboard />;
if (user?.role === 'junior_advocate' || user?.role === 'advocate') return <JuniorAdvocateDashboard />;
if (user?.role === 'paralegal') return <ParalegalDashboard />;
// client should never reach here — redirect
router.replace('/portal');
return null;
```

#### 🔴 Issue 2 — Admin Page Has No Role Guard
**Problem:** `/admin/page.tsx` has no `<AuthGuard requiredRoles={['admin']}>` wrapper. Any logged-in user can navigate to `/admin`.

**Fix:**
```tsx
// admin/page.tsx — wrap entire return
export default function AdminPage() {
  return (
    <AuthGuard requiredRoles={['admin']}>
      {/* existing content */}
    </AuthGuard>
  );
}
```

#### 🔴 Issue 3 — Analytics Page Has No Role Guard
**Problem:** `/analytics/page.tsx` exposes firm-wide metrics to junior roles and paralegals.

**Fix:** Guard with `['admin', 'senior_advocate', 'partner']`.

#### 🟠 Issue 4 — Two Incompatible Design Systems Running Simultaneously
**Problem:**
- Pages using `AppShell`: deep navy radial gradient + glassmorphism (`bg-white/5`, `border-white/10`, `backdrop-blur`)
- Pages NOT using AppShell (`/admin`, `/analytics`, `/documents`, `/matters`): flat `bg-[#0A1628]` with `bg-[#112240]` cards, different component patterns

**Fix:** Unify all authenticated internal pages under AppShell, or create a unified `<AuthShell>` that replaces both patterns.

#### 🟡 Issue 5 — AppShell Navigation Is Not Role-Aware
**Problem:** The sidebar in `AppShell.tsx` shows the same 8 nav items (including `/billing` and `/settings/privacy`) to all users including junior advocates.

**Fix:** Pass `role` to AppShell and filter nav items:
```tsx
// Billing visible to: admin only
// Analytics visible to: admin, senior_advocate, partner
// Admin visible to: admin only
// Research, Bare Acts visible to: all lawyers
// Templates visible to: all except paralegal (or limited)
```

---

## 2. UNIFIED DESIGN SYSTEM SPECIFICATION

### 2.1 Design Direction
**"Judicial Intelligence"** — The aesthetic of a premium Indian legal intelligence platform.
- Refined luxury dark mode as default with a clean light mode toggle
- Inspired by the Indian tricolor accent system: saffron (#FF9933) for CTAs/highlights, white/off-white for text, deep India green (#138808) for success/compliance states, and navy (#0F2557) as the foundation
- Motion: purposeful, legal-document-like precision — nothing bounces, everything reveals or slides with ease curves
- Typography: `Playfair Display` for display headings (gravitas, serif authority), `DM Sans` for body (modern, readable)

### 2.2 Global CSS Variables (replace `globals.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Core palette */
    --navy-950: 221 71% 7%;
    --navy-900: 221 71% 10%;
    --navy-800: 221 65% 14%;
    --navy-700: 221 55% 20%;
    --navy-600: 221 50% 28%;

    --saffron-500: 33 100% 60%;
    --saffron-400: 33 100% 68%;
    --saffron-300: 33 100% 78%;

    --india-green: 130 83% 36%;

    /* Semantic tokens */
    --background: 221 71% 7%;
    --foreground: 40 20% 94%;
    --card: 221 60% 11%;
    --card-foreground: 40 20% 94%;
    --primary: 33 100% 60%;
    --primary-foreground: 221 71% 7%;
    --secondary: 221 50% 17%;
    --secondary-foreground: 40 20% 80%;
    --muted: 221 45% 15%;
    --muted-foreground: 220 15% 55%;
    --border: 221 40% 20%;
    --input: 221 40% 16%;
    --ring: 33 100% 60%;
    --radius: 1.25rem;
    --gold: 33 100% 60%;
    --navy: 221 71% 12%;

    /* Status colors */
    --success: 130 83% 36%;
    --warning: 38 92% 50%;
    --danger: 4 90% 58%;
    --info: 210 80% 55%;
  }

  html { font-family: 'DM Sans', sans-serif; }

  h1, h2, h3 { font-family: 'Playfair Display', serif; }

  * { @apply border-border; }

  body {
    @apply bg-background text-foreground;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,153,51,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 80% 100%, rgba(15,37,87,0.5) 0%, transparent 50%);
  }
}

@layer components {
  /* Glass card — primary surface for AppShell pages */
  .glass {
    @apply rounded-[var(--radius)] border border-white/10 bg-white/5 backdrop-blur-xl;
  }

  /* Gold gradient button */
  .btn-gold {
    @apply bg-gradient-to-r from-[#FF9933] to-[#FFD18B] text-slate-900 font-semibold rounded-full px-6 py-2.5
           shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-200;
  }

  /* Navy sidebar item */
  .nav-item {
    @apply flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-white/60
           hover:bg-white/8 hover:text-white transition-all duration-150 cursor-pointer;
  }

  .nav-item.active {
    @apply bg-white/10 text-white;
  }

  /* Metric card */
  .metric-card {
    @apply glass p-6 flex flex-col gap-2;
  }

  /* Status badge variants */
  .badge-saffron { @apply bg-orange-500/15 text-orange-400 border border-orange-500/25 text-xs px-2.5 py-0.5 rounded-full; }
  .badge-green   { @apply bg-green-500/15 text-green-400 border border-green-500/25 text-xs px-2.5 py-0.5 rounded-full; }
  .badge-red     { @apply bg-red-500/15 text-red-400 border border-red-500/25 text-xs px-2.5 py-0.5 rounded-full; }
  .badge-blue    { @apply bg-blue-500/15 text-blue-400 border border-blue-500/25 text-xs px-2.5 py-0.5 rounded-full; }
  .badge-muted   { @apply bg-white/8 text-white/60 border border-white/10 text-xs px-2.5 py-0.5 rounded-full; }

  /* Page fade-in base */
  .page-enter {
    animation: pageEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes pageEnter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position: 200% center; }
}

.shimmer-text {
  background: linear-gradient(90deg, #FF9933 0%, #FFD18B 40%, #FF9933 60%, #FFD18B 100%);
  background-size: 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 4s ease-in-out infinite;
}
```

### 2.3 Tailwind Config Additions (merge into `tailwind.config.ts`)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          950: "hsl(221,71%,7%)",
          900: "hsl(221,71%,10%)",
          800: "hsl(221,65%,14%)",
          700: "hsl(221,55%,20%)",
        },
        saffron: {
          400: "#FFD18B",
          500: "#FF9933",
        },
        "india-green": "#138808",
      },
      backgroundOpacity: { 8: "0.08" },
      backdropBlur: { xl: "20px" },
      animation: {
        "page-enter": "pageEnter 0.4s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 4s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s ease both",
        "slide-in": "slideIn 0.35s ease both",
      },
      keyframes: {
        pageEnter: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 3. REDESIGNED APPSHELL (role-aware navigation)

Replace `components/india/AppShell.tsx` entirely:

```tsx
// components/india/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale, Search, ScrollText, FileStack, CalendarDays,
  ReceiptText, ShieldCheck, Sparkles, LayoutDashboard,
  FolderOpen, BarChart3, Settings, ChevronRight, LogOut,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/auth";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",     icon: LayoutDashboard, roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/matters",        label: "Matters",       icon: FolderOpen,      roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/documents",      label: "Documents",     icon: FileText,        roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/research",       label: "Research",      icon: Search,          roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/nyay-assist",    label: "Nyay Assist",   icon: Sparkles,        roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/bare-acts",      label: "Bare Acts",     icon: ScrollText,      roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/templates",      label: "Templates",     icon: FileStack,       roles: ["admin","senior_advocate","junior_advocate","advocate","partner"] },
  { href: "/calendar",       label: "Calendar",      icon: CalendarDays,    roles: ["admin","senior_advocate","junior_advocate","advocate","paralegal","partner"] },
  { href: "/analytics",      label: "Analytics",     icon: BarChart3,       roles: ["admin","senior_advocate","partner"] },
  { href: "/billing",        label: "Billing",       icon: ReceiptText,     roles: ["admin"] },
  { href: "/settings/privacy", label: "Privacy",     icon: ShieldCheck,     roles: ["admin","senior_advocate","partner"] },
  { href: "/admin",          label: "Admin Panel",   icon: Settings,        roles: ["admin"] },
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const role = user?.role ?? "junior_advocate";

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100" style={{
      backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,153,51,0.08) 0%, transparent 60%)"
    }}>
      <div className="mx-auto flex min-h-screen max-w-[1440px] gap-0">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/8 bg-navy-900/60 backdrop-blur-xl">
          {/* Logo */}
          <div className="p-6 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-saffron-500 to-saffron-400 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Scale className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                <div className="text-base font-serif font-semibold tracking-tight">EvidentIS</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Legal Intelligence</div>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, i) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative
                      ${isActive
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:bg-white/6 hover:text-white/90"
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-saffron-500"
                      />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-saffron-500" : "text-white/40 group-hover:text-white/70"}`} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="ml-auto h-3 w-3 text-white/30" />}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-white/8">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-saffron-500/20 flex items-center justify-center text-saffron-400 text-xs font-semibold">
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.name ?? "User"}</div>
                <div className="text-xs text-white/40 capitalize">{role.replace("_", " ")}</div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3">
              <LanguageSwitcher />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Page header */}
          <header className="sticky top-0 z-20 h-16 border-b border-white/8 bg-navy-950/80 backdrop-blur-xl flex items-center justify-between px-8">
            <div>
              <h1 className="text-xl font-serif font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile LanguageSwitcher */}
              <div className="lg:hidden">
                <LanguageSwitcher />
              </div>
            </div>
          </header>

          {/* Page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Nyay Assist FAB — shown only for non-paralegal roles */}
      {["admin","senior_advocate","junior_advocate","advocate","partner"].includes(role) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="fixed bottom-6 right-6"
        >
          <Link
            href="/nyay-assist"
            className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-saffron-500 to-saffron-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-200"
          >
            <Sparkles className="h-4 w-4" />
            Nyay Assist
          </Link>
        </motion.div>
      )}
    </div>
  );
}
```

---

## 4. ROLE-DIFFERENTIATED DASHBOARDS

Replace `app/dashboard/page.tsx` with this full implementation:

```tsx
// app/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/auth";
import { AppShell } from "@/components/india/AppShell";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-saffron-500" />
      </div>
    );
  }

  const role = user?.role;

  if (role === "admin") return <AdminDashboard />;
  if (role === "senior_advocate" || role === "partner") return <SeniorAdvocateDashboard />;
  if (role === "junior_advocate" || role === "advocate") return <JuniorAdvocateDashboard />;
  if (role === "paralegal") return <ParalegalDashboard />;

  // Client should never reach dashboard — bounce to portal listing
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white">
      <p>Redirecting...</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   4a. ADMIN DASHBOARD
   Focus: firm health, team activity, billing, system alerts
───────────────────────────────────────────────────────────── */
function AdminDashboard() {
  return (
    <AppShell title="Firm Command Centre">
      <div className="space-y-6 animate-page-enter">
        {/* KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Active Advocates", value: "12", delta: "+2 this month", color: "saffron" },
            { label: "Open Matters", value: "128", delta: "23 hearings this week", color: "blue" },
            { label: "Docs Processed (30d)", value: "2,847", delta: "↑12.5%", color: "green" },
            { label: "DPDP Alerts", value: "4", delta: "Action required", color: "red" },
          ].map((kpi, i) => (
            <motion.article
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="glass p-5"
            >
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">{kpi.label}</p>
              <div className="mt-2 text-4xl font-serif font-semibold">{kpi.value}</div>
              <p className="mt-1 text-xs text-white/50">{kpi.delta}</p>
            </motion.article>
          ))}
        </div>

        {/* Middle row: Team Activity + Billing */}
        <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4">
          {/* Team Activity */}
          <div className="glass p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Team Activity</h2>
            <div className="space-y-3">
              {[
                { name: "Aarav Mehta",  role: "Admin",          action: "Reviewed SSO config",   time: "5 min ago" },
                { name: "Nandini Rao",  role: "Sr. Advocate",   action: "Uploaded 3 documents",  time: "1 hr ago" },
                { name: "Vihaan Kapoor",role: "Jr. Advocate",   action: "Created new matter",    time: "2 hr ago" },
                { name: "Sana Iqbal",   role: "Paralegal",      action: "Filed hearing update",  time: "3 hr ago" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-4 py-2.5 border-b border-white/6 last:border-0"
                >
                  <div className="h-8 w-8 rounded-full bg-saffron-500/15 flex items-center justify-center text-saffron-400 text-xs font-semibold shrink-0">
                    {item.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="ml-2 text-xs text-white/40">{item.role}</span>
                    <p className="text-xs text-white/50 mt-0.5">{item.action}</p>
                  </div>
                  <span className="text-xs text-white/30 shrink-0">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Billing & Subscription */}
          <div className="glass p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Subscription</h2>
            <div className="rounded-2xl border border-saffron-500/30 bg-saffron-500/5 p-4 mb-4">
              <div className="text-xs uppercase tracking-widest text-saffron-400 mb-1">Professional Plan</div>
              <div className="text-2xl font-serif font-semibold">₹14,999<span className="text-sm font-sans font-normal text-white/50">/mo + GST</span></div>
              <div className="mt-2 text-sm text-white/60">12 / 15 advocates active</div>
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-saffron-500 rounded-full" style={{ width: "80%" }} />
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <div className="flex justify-between"><span>Next invoice</span><span>15 May 2026</span></div>
              <div className="flex justify-between"><span>Docs used</span><span>2,847 / 5,000</span></div>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="glass p-6">
          <h2 className="font-serif text-lg font-semibold mb-4">System Alerts</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { level: "warning",  msg: "3 advocates have MFA disabled — enforce in Security settings" },
              { level: "info",     msg: "SCIM provisioning synced 2 new members from Okta (2 min ago)" },
              { level: "danger",   msg: "4 DPDP consent workflows require review before 30 Apr deadline" },
              { level: "success",  msg: "CI/CD pipeline passed — v19 deployed to production at 09:12 IST" },
            ].map((alert, i) => {
              const colors: Record<string,string> = {
                warning: "border-yellow-500/30 bg-yellow-500/8 text-yellow-300",
                info:    "border-blue-500/30 bg-blue-500/8 text-blue-300",
                danger:  "border-red-500/30 bg-red-500/8 text-red-300",
                success: "border-green-500/30 bg-green-500/8 text-green-300",
              };
              return (
                <div key={i} className={`rounded-xl border px-4 py-3 text-sm ${colors[alert.level]}`}>
                  {alert.msg}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   4b. SENIOR ADVOCATE / PARTNER DASHBOARD
   Focus: portfolio of matters, hearing calendar, analytics summary
───────────────────────────────────────────────────────────── */
function SeniorAdvocateDashboard() {
  return (
    <AppShell title="My Practice Dashboard">
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "My Active Matters", value: "34", delta: "6 updated today" },
            { label: "Hearings This Week", value: "8", delta: "Next: Mon 14, 10:30am" },
            { label: "Docs Pending Review", value: "12", delta: "3 flagged critical" },
            { label: "Avg. Matter Health", value: "78%", delta: "↑5% vs last month" },
          ].map((kpi, i) => (
            <motion.article
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass p-5"
            >
              <p className="text-xs uppercase tracking-widest text-white/40">{kpi.label}</p>
              <div className="mt-2 text-4xl font-serif font-semibold">{kpi.value}</div>
              <p className="mt-1 text-xs text-white/50">{kpi.delta}</p>
            </motion.article>
          ))}
        </div>

        <div className="grid xl:grid-cols-[1.4fr_1fr] gap-4">
          {/* Upcoming Hearings */}
          <div className="glass p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Upcoming Hearings</h2>
            <div className="space-y-3">
              {[
                { date: "Mon 14", title: "Section 138 NI Act", court: "Delhi District Court", urgency: "high" },
                { date: "Tue 15", title: "RERA Appeal — Client X", court: "MahaRERA Tribunal", urgency: "medium" },
                { date: "Thu 17", title: "IBC Admission", court: "NCLT Mumbai Bench", urgency: "high" },
                { date: "Fri 18", title: "Consumer Complaint", court: "NCDRC", urgency: "low" },
              ].map((h, i) => {
                const urgencyColor: Record<string,string> = {
                  high:   "text-red-400 border-red-500/30 bg-red-500/8",
                  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/8",
                  low:    "text-green-400 border-green-500/30 bg-green-500/8",
                };
                return (
                  <div key={i} className="flex items-center gap-4 py-2.5 border-b border-white/6 last:border-0">
                    <div className="text-center w-14 shrink-0">
                      <div className="text-saffron-400 font-semibold text-sm">{h.date.split(" ")[0]}</div>
                      <div className="text-2xl font-serif font-semibold">{h.date.split(" ")[1]}</div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{h.title}</p>
                      <p className="text-xs text-white/50">{h.court}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${urgencyColor[h.urgency]}`}>
                      {h.urgency}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nyay Assist quick prompts */}
          <div className="glass p-6">
            <p className="text-xs uppercase tracking-widest text-saffron-400 mb-1">AI Research Assistant</p>
            <h2 className="font-serif text-lg font-semibold mb-4">Nyay Assist</h2>
            <div className="space-y-2">
              {[
                "Explain Section 138 NI Act limitation period",
                "Latest RERA compliance duties — Maharashtra",
                "Draft legal notice under Section 80 CPC",
                "Map IPC provisions to BNS 2023 replacements",
              ].map((prompt, i) => (
                <button
                  key={i}
                  className="w-full text-left rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors group"
                >
                  <span className="group-hover:text-saffron-400 transition-colors">→</span> {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Matter Health */}
        <div className="glass p-6">
          <h2 className="font-serif text-lg font-semibold mb-4">Portfolio Health</h2>
          <div className="space-y-3">
            {[
              { name: "Acme Corp Acquisition",    health: 92, flags: 2 },
              { name: "TechStart Series B",        health: 85, flags: 5 },
              { name: "Global Services RFP",       health: 71, flags: 8 },
              { name: "Patent Portfolio Review",   health: 68, flags: 12 },
              { name: "Employment Restructure",    health: 45, flags: 18 },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{m.name}</span>
                    <span className={m.health >= 80 ? "text-green-400" : m.health >= 60 ? "text-yellow-400" : "text-red-400"}>
                      {m.health}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.health}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${m.health >= 80 ? "bg-green-500" : m.health >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    />
                  </div>
                </div>
                {m.flags > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/8 text-red-400 shrink-0">
                    {m.flags} flags
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   4c. JUNIOR ADVOCATE DASHBOARD
   Focus: assigned matters, today's tasks, quick research
───────────────────────────────────────────────────────────── */
function JuniorAdvocateDashboard() {
  return (
    <AppShell title="My Workspace">
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { label: "Assigned Matters", value: "8", delta: "2 updated today" },
            { label: "Pending Documents", value: "5", delta: "Review requested" },
            { label: "Next Hearing",      value: "Mon", delta: "Section 138 — Delhi DC" },
          ].map((kpi, i) => (
            <motion.article
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass p-5"
            >
              <p className="text-xs uppercase tracking-widest text-white/40">{kpi.label}</p>
              <div className="mt-2 text-4xl font-serif font-semibold">{kpi.value}</div>
              <p className="mt-1 text-xs text-white/50">{kpi.delta}</p>
            </motion.article>
          ))}
        </div>

        <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
          <div className="glass p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">My Assigned Matters</h2>
            {/* Matter list stub — connect to API */}
            <p className="text-sm text-white/50">Matters assigned to you will appear here.</p>
          </div>
          <div className="glass p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Quick Research</h2>
            <div className="space-y-2">
              {["Section 138 NI Act", "RERA compliance", "BNS mappings from IPC"].map((p, i) => (
                <button key={i} className="w-full text-left rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors">
                  → {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   4d. PARALEGAL DASHBOARD
   Focus: tasks, document uploads, calendar only
───────────────────────────────────────────────────────────── */
function ParalegalDashboard() {
  return (
    <AppShell title="Paralegal Workspace">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Documents to Upload", value: "3", delta: "Assigned by Nandini Rao" },
            { label: "Upcoming Tasks",       value: "7", delta: "2 due today" },
          ].map((kpi, i) => (
            <motion.article
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass p-5"
            >
              <p className="text-xs uppercase tracking-widest text-white/40">{kpi.label}</p>
              <div className="mt-2 text-4xl font-serif font-semibold">{kpi.value}</div>
              <p className="mt-1 text-xs text-white/50">{kpi.delta}</p>
            </motion.article>
          ))}
        </div>
        <div className="glass p-6">
          <h2 className="font-serif text-lg font-semibold mb-4">Today's Tasks</h2>
          <p className="text-sm text-white/50">Tasks delegated to you appear here.</p>
        </div>
      </div>
    </AppShell>
  );
}
```

---

## 5. PAGE-BY-PAGE REDESIGN SPECIFICATIONS

### 5.1 `/` Landing Page
**Current:** Good foundation. Needs motion amplification, better hero, and animated features.
**Enhancements:**
- Add `staggerChildren` framer-motion to feature cards (each card slides in with 80ms delay)
- Add subtle floating particle effect (SVG dots) in the hero background via CSS `@keyframes float`
- Add a scrolling marquee of client logos / court names below the hero
- Make the Ashoka Chakra SVG spin slowly (24-spoke animation)
- CTA button: add a ripple animation on hover
- Add a `<Sparkles />` animated icon next to "Nyay Operations Preview"

### 5.2 `/login` Login Page
**Current:** Clean split layout, good foundation.
**Enhancements:**
- Left panel: add an Ashoka Chakra SVG with a slow 120s rotation animation
- Input fields: add a glow border animation on focus (`box-shadow: 0 0 0 3px rgba(255,153,51,0.25)`)
- "Sign in" button: shimmer animation on loading state
- Social buttons: hover scale `1.03`
- Add animated step indicators for MFA flow

### 5.3 `/forgot-password` & `/reset-password/[token]`
**Redesign to match login split layout** — left panel with branding, right panel with form.
Add success state animation: checkmark SVG that draws itself on success.

### 5.4 `/invitation/[token]`
**Redesign:** Full-page invitation acceptance card.
- Shows firm name prominently with EvidentIS branding
- Role badge with saffron background
- Animated entrance for the invitation card
- Password strength meter with animated fill bar
- Welcome animation on acceptance

### 5.5 `/dashboard` — Role-Differentiated (see Section 4 above)

### 5.6 `/matters` Matters List
**Current:** Light `bg-background`, cards with framer-motion. Mismatched with rest of app.
**Enhancements:**
- Wrap in `<AppShell title="Matters">` for design consistency
- Animated counter on filter chips showing count per status
- Matter cards: add a `health score` mini donut chart (inline SVG, CSS-animated)
- Empty state: animated gavel SVG illustration
- Search input: debounced with animated spinner

### 5.7 `/matters/[id]` Matter Detail
**Needs full read** but likely needs:
- Tab navigation (Documents / Clauses / Flags / Research) with animated underline indicator
- Animated health score ring
- Timeline sidebar for matter history

### 5.8 `/matters/[id]/documents/[docId]` Document Viewer
**Needs full read** but likely needs:
- Full-screen PDF viewer with dark sidebar for clauses
- Highlighted clause navigation
- Red-line toggle

### 5.9 `/documents` Documents Page
**Current:** Flat dark `#0A1628` — design system mismatch.
**Fix:** Wrap in `<AppShell>`, replace flat bg with glass cards.
**Enhancements:**
- Drag-and-drop zone: animated dashed border with a pulsing upload icon
- Processing state: per-row progress bar with animated shimmer
- Status badges: animated status transitions

### 5.10 `/research` Research Page
**Current:** Static — no actual query input.
**Redesign:**
- Add a live search bar with keyboard shortcut hint (`⌘K`)
- Animated "thinking" state when query is submitted (streaming dots)
- Source citations rendered as expandable chips
- Related acts auto-linked

### 5.11 `/nyay-assist` Nyay Assist
**Current:** Static sample output — no interactivity.
**Redesign:**
- Full chat interface with scrollable message list
- Animated typing indicator (three bouncing dots)
- Message entrance animations (slide up)
- Language selector in the chat header
- File attachment support indicator
- Prompt suggestion chips that animate away after click

### 5.12 `/bare-acts` Bare Acts
**Current:** Good grid layout.
**Enhancements:**
- Add search/filter bar
- Category filter chips (Constitutional, Criminal, Civil, etc.)
- Card hover: lift + saffron border glow
- Animated section count badge

### 5.13 `/analytics` Analytics
**Current:** Flat dark — no AppShell, no role guard.
**Fix:** Add `<AuthGuard requiredRoles={["admin","senior_advocate","partner"]}>` + wrap in `<AppShell>`.
**Enhancements:**
- Animated progress bars for matter health scores
- Metric cards: count-up animation on mount (react-countup or CSS)
- Add a real bar chart using Recharts (`BarChart` from recharts)
- Time range filter: animated pill transition
- Add `aria-label` to all charts for accessibility

### 5.14 `/admin` Admin Panel
**Current:** No AuthGuard, good tabbed layout.
**Critical Fix:** Add `<AuthGuard requiredRoles={["admin"]}>` wrapper.
**Enhancements:**
- Sidebar: add active indicator animation
- Team table: animated row entrance
- MFA toggle: real switch animation
- SSO form: add real-time SAML URL validation with animated ✓/✗
- Invite Member: slide-in modal with animated form fields

### 5.15 `/billing` Billing
**Current:** Read-only plan cards, AppShell wrapped.
**Enhancements:**
- Plan cards: animated hover with border glow
- Add a "Current Plan" badge animation
- Usage meters with animated fill
- Razorpay CTA button with pulsing saffron glow
- Add invoice history table (mocked with real date formatting)

### 5.16 `/calendar` Calendar
**Current:** Static hearing cards in grid.
**Redesign:**
- Real calendar grid (7-column week view)
- Hearing events as colored chips on day cells
- Animated day selection
- Upcoming hearings sidebar
- Urgency-color coding with animated dot indicators

### 5.17 `/settings/privacy` Privacy Settings
**Current:** Static checklist.
**Redesign:**
- Toggleable switches for each DPDP control
- Animated switch transitions
- Status indicators (compliant / action needed)
- Consent record table
- Download data / erasure request buttons

### 5.18 `/templates` Templates
**Current:** Good grid.
**Enhancements:**
- Category filter chips
- Template preview on hover (slide-up tooltip)
- Animated card entrance with stagger

### 5.19 `/templates/[id]/generate` Template Generator
- Animated multi-step form wizard
- Progress indicator with animated segments
- Live preview panel

### 5.20 `/portal/[shareToken]` Client Portal
**Current:** Clean, light, good.
**Enhancements:**
- Expiry countdown timer (animated)
- Section tabs with animated underline
- Document list: animated row entrance
- Download button: ripple animation
- Add powered-by EvidentIS branding with subtle animation

---

## 6. ANIMATION SYSTEM (framer-motion patterns)

Use these consistent patterns across all pages:

```tsx
// Standard page container — wrap all page content in this
const PageContainer = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

// Staggered list of cards
const CardGrid = ({ items }: { items: React.ReactNode[] }) => (
  <motion.div
    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
    initial="hidden"
    animate="visible"
    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
  >
    {items}
  </motion.div>
);

// Individual animated card
const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    variants={{
      hidden:  { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay } },
    }}
  >
    {children}
  </motion.div>
);

// Animated metric count-up
// npm install react-countup
import CountUp from "react-countup";
const MetricValue = ({ value }: { value: number }) => (
  <CountUp end={value} duration={1.5} delay={0.3} enableScrollSpy />
);

// Health score bar
const HealthBar = ({ value, delay = 0 }: { value: number; delay?: number }) => (
  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      className={`h-full rounded-full ${value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
    />
  </div>
);

// Typing indicator for Nyay Assist
const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-4 py-3 w-fit">
    {[0, 0.15, 0.3].map((delay, i) => (
      <motion.div
        key={i}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, delay, duration: 0.6 }}
        className="h-2 w-2 rounded-full bg-saffron-400"
      />
    ))}
  </div>
);
```

---

## 7. MICRO-INTERACTION CATALOGUE

| Element | Interaction | Animation |
|---------|------------|-----------|
| Sidebar nav item | Click | `layoutId="nav-pill"` shared layout transition |
| CTA buttons | Hover | `scale: 1.02`, box-shadow lift |
| Form inputs | Focus | saffron `ring-2 ring-saffron-500/40` glow |
| Matter cards | Hover | `y: -2`, border: `border-saffron-500/30` |
| Status badges | Mount | Fade + scale from 0.8 |
| Health bars | Mount | Width from 0 to value |
| Page transitions | Route change | Fade + Y shift via `AnimatePresence` |
| Modal dialogs | Open/close | Scale 0.95→1 + opacity |
| Drag-and-drop zone | Dragging | Border pulse + background opacity shift |
| FAB (Nyay Assist) | Idle | Subtle pulse `scale: [1, 1.04, 1]` every 4s |
| Table rows | Hover | `bg-white/4` background |

---

## 8. IMPLEMENTATION PRIORITY ORDER

1. **`globals.css`** — new design tokens, fonts (Playfair Display + DM Sans)
2. **`AppShell.tsx`** — role-aware nav, consistent layout
3. **`dashboard/page.tsx`** — split into 4 role dashboards
4. **`admin/page.tsx`** — add AuthGuard
5. **`analytics/page.tsx`** — add AuthGuard + AppShell
6. **`documents/page.tsx`** — port to AppShell glass system
7. **`matters/page.tsx`** — port to AppShell
8. **`research/page.tsx`** — add live query input
9. **`nyay-assist/page.tsx`** — full chat interface
10. **`calendar/page.tsx`** — real calendar grid
11. All remaining pages — enhancements per Section 5

---

## 9. DEPENDENCY ADDITIONS

Add these to `apps/web/package.json`:

```json
{
  "dependencies": {
    "react-countup": "^6.5.3",
    "recharts": "^2.12.7",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

---

## 10. CHECKLIST BEFORE SHIPPING

- [ ] `<AuthGuard requiredRoles={['admin']}>` wraps `/admin`
- [ ] `<AuthGuard requiredRoles={['admin','senior_advocate','partner']}>` wraps `/analytics`
- [ ] Client role users redirected from `/dashboard` → `/portal`
- [ ] AppShell nav filters by role (no billing link for junior advocates)
- [ ] All pages use the same design system (glass cards on navy bg)
- [ ] `Playfair Display` loaded for h1/h2/h3 across all pages
- [ ] `DM Sans` loaded for body text
- [ ] Framer-motion `AnimatePresence` wraps route changes in `providers.tsx`
- [ ] Mobile sidebar implemented (hamburger menu)
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation (Tab order) correct on all forms