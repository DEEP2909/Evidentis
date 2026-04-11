"use client";

import { AppShell } from "@/components/india/AppShell";
import { nyayAssistPrompts } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function ResearchPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("research")}>
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">IndiaKanoon + Bare Acts + Internal Matter Memory</p>
            <h2 className="mt-3 text-3xl font-semibold">Research with Indian sections, judgments, and multilingual answers.</h2>
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-black/15 p-5">
              <p className="text-sm text-white/60">Query</p>
              <p className="mt-2 text-lg">What is the limitation period for cheque bounce complaints and what documents should be attached?</p>
              <div className="mt-5 space-y-4 text-sm text-white/80">
                <p>Relevant statutes: Negotiable Instruments Act, Section 138; Limitation Act; procedural timelines for notice and complaint filing.</p>
                <p>Suggested sources: Bare acts, saved judgments, Supreme Court and High Court precedent, matter-specific templates.</p>
                <p>{t("disclaimer")}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {nyayAssistPrompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/80">
                {prompt}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
