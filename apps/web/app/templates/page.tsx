"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { featuredTemplates } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(featuredTemplates.map((template) => template.category.toLowerCase())))],
    []
  );

  const visibleTemplates = useMemo(
    () =>
      activeCategory === "all"
        ? featuredTemplates
        : featuredTemplates.filter((template) => template.category.toLowerCase() === activeCategory),
    [activeCategory]
  );

  return (
    <AppShell title={t("templates")}>
      <div className="space-y-6 page-enter">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                activeCategory === category
                  ? "border-saffron-500/40 bg-saffron-500/15 text-saffron-300"
                  : "border-white/20 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={`/templates/${template.id}/generate`}
                className="group block rounded-[2rem] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-saffron-500/35 hover:bg-white/10"
                aria-label={`Open ${template.name} template`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-saffron-300">{template.category}</p>
                  <Badge variant="outline" className="border-white/25 text-[10px] text-white/75">
                    {template.minimumLanguages.length} langs
                  </Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{template.name}</h2>
                <p className="mt-2 text-sm text-white/70">{template.minimumLanguages.join(", ")}</p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-white/65"
                >
                  Jurisdiction-aware clauses, multilingual drafts, and filing guidance available.
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
