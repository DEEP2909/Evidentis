"use client";

import Link from "next/link";

import { AppShell } from "@/components/india/AppShell";
import { featuredTemplates } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function TemplatesPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("templates")}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featuredTemplates.map((template) => (
          <Link
            key={template.id}
            href={`/templates/${template.id}/generate`}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-[#ffd18b]">{template.category}</p>
            <h2 className="mt-3 text-xl font-semibold">{template.name}</h2>
            <p className="mt-2 text-sm text-white/70">{template.minimumLanguages.join(", ")}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
