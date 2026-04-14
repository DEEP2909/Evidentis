"use client";

import { useMemo, useState } from "react";
import { CORE_INDIAN_ACTS } from "@evidentis/shared";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/india/AppShell";

export default function BareActDetailPage() {
  const params = useParams();
  const actSlug = params.actSlug as string;
  const [activeSection, setActiveSection] = useState("Section 1");
  const act = useMemo(() => CORE_INDIAN_ACTS.find((item) => item.slug === actSlug) ?? CORE_INDIAN_ACTS[0], [actSlug]);

  return (
    <AppShell title={act.shortTitle}>
      <div className="glass p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">{act.category}</p>
        <h2 className="mt-3 text-3xl font-semibold">{act.title}</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/75">
          Section-level navigation, multilingual explanations, bookmarks, and cross-links to successor statutes are configured around this act.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Section 1", "Section 2", "Section 3"].map((section) => (
            <motion.button
              whileTap={{ scale: 0.97 }}
              key={section}
              onClick={() => setActiveSection(section)}
              className={`rounded-2xl border p-4 text-left transition ${
                activeSection === section
                  ? "border-saffron-500/40 bg-saffron-500/15"
                  : "border-white/10 bg-black/10 hover:bg-black/20"
              }`}
            >
              <p className="text-sm text-[#ffd18b]">{section}</p>
              <p className="mt-2 text-sm text-white/75">Plain-language explanation, cross references, and matter save actions appear here.</p>
            </motion.button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
