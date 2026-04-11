"use client";

import { AppShell } from "@/components/india/AppShell";
import { privacyChecklist } from "@/lib/india";
import { useTranslation } from "react-i18next";

export default function PrivacySettingsPage() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("privacy")}>
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">DPDP Control Centre</p>
        <h2 className="mt-3 text-3xl font-semibold">Privacy governance for Indian legal data</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {privacyChecklist.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/80">
              {item}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
