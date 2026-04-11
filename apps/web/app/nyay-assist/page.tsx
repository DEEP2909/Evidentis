"use client";

import { AppShell } from "@/components/india/AppShell";
import { nyayAssistPrompts } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function NyayAssistPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("assistant")}>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">Suggested prompts</p>
          <div className="mt-5 space-y-3">
            {nyayAssistPrompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/80">
                {prompt}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="rounded-[2rem] bg-black/15 p-6">
            <p className="text-sm text-[#ffd18b]">Query</p>
            <h2 className="mt-2 text-2xl font-semibold">Explain Section 420 IPC in simple Tamil</h2>
            <div className="mt-6 space-y-4 text-sm text-white/80">
              <p>Assistant responses will match the question language, cite the section, and attach case references when available.</p>
              <p>{t("disclaimer")}</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
