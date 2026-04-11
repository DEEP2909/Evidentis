"use client";

import Link from "next/link";
import { Scale, Search, ScrollText, FileStack, CalendarDays, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "./LanguageSwitcher";

const navItems = [
  { href: "/dashboard", key: "dashboard", icon: Scale },
  { href: "/research", key: "research", icon: Search },
  { href: "/bare-acts", key: "bareActs", icon: ScrollText },
  { href: "/templates", key: "templates", icon: FileStack },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/billing", key: "billing", icon: ReceiptText },
  { href: "/settings/privacy", key: "privacy", icon: ShieldCheck },
  { href: "/nyay-assist", key: "assistant", icon: Sparkles },
] as const;

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#203b7a_0%,#0f2557_42%,#071226_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff9933,#ffd18b)] text-slate-900">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">EvidentIS</div>
              <div className="text-xs text-white/60">{t("tagline")}</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                <span>{t(item.key)}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">India Legal Cloud</p>
              <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
            </div>
            <LanguageSwitcher />
          </header>

          {children}
        </main>
      </div>

      <Link
        href="/nyay-assist"
        className="fixed bottom-6 right-6 flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#ff9933,#ffc56c)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-2xl shadow-orange-500/20"
      >
        <Sparkles className="h-4 w-4" />
        Nyay Assist
      </Link>
    </div>
  );
}
