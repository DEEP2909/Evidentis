"use client";

import Link from "next/link";

import { AppShell } from "@/components/india/AppShell";
import { featuredActs } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function BareActsPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("bareActs")}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featuredActs.map((act) => (
          <Link
            key={act.slug}
            href={`/bare-acts/${act.slug}`}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-[#ffd18b]">{act.shortTitle}</p>
            <h2 className="mt-3 text-xl font-semibold">{act.title}</h2>
            <p className="mt-2 text-sm text-white/70">{act.category} · {act.year}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
