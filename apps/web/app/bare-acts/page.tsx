"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { featuredActs } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function BareActsPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(featuredActs.map((act) => act.category)))],
    []
  );

  const visibleActs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return featuredActs.filter((act) => {
      const matchesCategory = activeCategory === "all" || act.category === activeCategory;
      const matchesQuery =
        normalized.length === 0 ||
        `${act.title} ${act.shortTitle} ${act.category}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <AppShell title={t("bareActs")}>
      <div className="space-y-6 page-enter">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bare acts..."
            className="focus-saffron"
            aria-label="Search bare acts"
          />
          <div className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/65">
            {visibleActs.length} results
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                activeCategory === category
                  ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-300"
                  : "border-white/20 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleActs.map((act, index) => (
            <motion.div
              key={act.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={`/bare-acts/${act.slug}`}
                className="group block rounded-[2rem] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-saffron-500/45 hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-saffron-300">{act.shortTitle}</p>
                  <Badge variant="outline" className="border-white/25 text-white/70">
                    {act.year}
                  </Badge>
                </div>
                <h2 className="mt-3 line-clamp-2 text-lg font-semibold">{act.title}</h2>
                <p className="mt-2 text-sm capitalize text-white/65">{act.category}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
