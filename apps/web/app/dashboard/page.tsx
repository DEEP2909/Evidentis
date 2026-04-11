"use client";

import { AppShell } from "@/components/india/AppShell";
import { dashboardHighlights, hearingCalendar, nyayAssistPrompts, privacyChecklist } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("dashboard")}>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="grid gap-4 md:grid-cols-2">
          {dashboardHighlights.map((highlight) => (
            <article key={highlight.label} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm text-white/60">{highlight.label}</p>
              <div className="mt-3 text-4xl font-semibold">{highlight.value}</div>
              <p className="mt-2 text-sm text-white/70">{highlight.note}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">{t("assistant")}</p>
          <h2 className="mt-3 text-2xl font-semibold">Nyay Assist</h2>
          <p className="mt-2 text-sm text-white/70">{t("disclaimer")}</p>
          <div className="mt-6 space-y-3">
            {nyayAssistPrompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm">
                {prompt}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold">{t("calendar")}</h2>
          <div className="mt-5 space-y-3">
            {hearingCalendar.map((hearing) => (
              <div key={hearing.title} className="flex items-start justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div>
                  <p className="text-sm text-[#ffd18b]">{hearing.date}</p>
                  <h3 className="mt-1 font-medium">{hearing.title}</h3>
                  <p className="text-sm text-white/65">{hearing.court}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-white/70">
                  {hearing.urgency}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold">{t("privacy")}</h2>
          <div className="mt-5 space-y-3">
            {privacyChecklist.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/80">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
