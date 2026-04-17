"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Search, FileCode2 } from "lucide-react";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { featuredTemplates } from "@/lib/india";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      <div className="space-y-6 page-enter relative">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-all duration-300 ${
                  activeCategory === category
                    ? "border-saffron-500/40 bg-saffron-500/15 text-saffron-300 shadow-[0_0_15px_rgba(255,153,51,0.2)]"
                    : "border-white/20 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {category === "all" ? t("tpl_categoryAll") : category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-white px-5 font-medium text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold">
              <Plus className="h-3.5 w-3.5" />
              {t("tpl_addTemplate")}
            </span>
            <div className="absolute inset-0 bg-[#ff9933] translate-y-[100%] transition-transform duration-300 group-hover:translate-y-[0%] z-0" />
          </button>
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
                className="group block rounded-[2rem] border border-white/10 bg-[#0c0c0f] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#ff9933]/40 hover:shadow-[0_10px_30px_-15px_rgba(255,153,51,0.2)] hover:bg-[#111114]"
                aria-label={`Open ${template.name} template`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff9933]">{template.category}</p>
                  <Badge variant="outline" className="border-white/15 bg-white/5 text-[10px] text-white/60 font-mono">
                    {t("tpl_langsCount", { count: template.minimumLanguages.length })}
                  </Badge>
                </div>
                <h2 className="mt-4 font-serif text-2xl font-light text-white/90">{template.name}</h2>
                <p className="mt-2 text-xs font-mono text-white/40 tracking-wider uppercase">
                  {template.minimumLanguages.join(" • ")}
                </p>

                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  whileHover={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-xl border border-[#ff9933]/20 bg-[#ff9933]/[0.03] p-3 text-xs text-white/60 leading-relaxed italic border-l-2 border-l-[#ff9933]">
                    {t("tpl_features")}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {isAddModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
                onClick={() => setIsAddModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0c0c0f] p-6 shadow-2xl glow-ring"
              >
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute right-6 top-6 text-white/40 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ff9933]/20 bg-[#ff9933]/10 text-[#ffcf8c]">
                  <FileCode2 className="h-6 w-6" />
                </div>
                <h2 className="font-serif text-2xl mb-2">{t("tpl_addTemplate")}</h2>
                <p className="text-sm text-white/50 mb-6">{t("tpl_addTemplateDesc")}</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">{t("tpl_nameLabel", { defaultValue: "Template Name" })}</label>
                    <Input placeholder={t("tpl_namePlaceholder", { defaultValue: "e.g. Master Services Agreement" })} className="bg-white/5 border-white/10 focus-saffron text-sm rounded-xl h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">{t("tpl_categoryLabel", { defaultValue: "Category" })}</label>
                    <Input placeholder={t("tpl_categoryPlaceholder", { defaultValue: "e.g. Corporate" })} className="bg-white/5 border-white/10 focus-saffron text-sm rounded-xl h-11" />
                  </div>
                  
                  <button type="button" className="w-full mt-4 group relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-white font-medium text-black transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-wider font-bold">
                      {t("save", { defaultValue: "Save Template" })}
                    </span>
                    <div className="absolute inset-0 bg-[#ff9933] translate-y-[100%] transition-transform duration-300 group-hover:translate-y-[0%] z-0" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
