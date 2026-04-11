"use client";

import { AppShell } from "@/components/india/AppShell";
import { hearingCalendar } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function CalendarPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("calendar")}>
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {hearingCalendar.map((hearing) => (
            <div key={hearing.title} className="rounded-[2rem] border border-white/10 bg-black/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-[#ffd18b]">{hearing.date}</p>
              <h2 className="mt-3 text-lg font-semibold">{hearing.title}</h2>
              <p className="mt-2 text-sm text-white/70">{hearing.court}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
