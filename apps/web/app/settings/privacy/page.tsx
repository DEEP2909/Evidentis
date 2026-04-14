"use client";

import { useState } from "react";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { privacyChecklist } from "@/lib/india";
import { useTranslation } from "react-i18next";

const consentRecords = [
  { id: "CR-1092", subject: "Ananya S.", action: "Consent update", date: "12 Apr 2026", status: "compliant" },
  { id: "CR-1091", subject: "Vikram R.", action: "Data correction", date: "11 Apr 2026", status: "compliant" },
  { id: "CR-1089", subject: "Rhea P.", action: "Erasure request", date: "10 Apr 2026", status: "action_needed" },
];

export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const [controls, setControls] = useState({
    consentCapture: true,
    retentionAutomation: true,
    breachAlerts: true,
    dsrWorkflow: true,
  });

  return (
    <AppShell title={t("privacy")}>
      <div className="space-y-6 page-enter">
        <section className="glass p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-saffron-300">DPDP Control Centre</p>
          <h2 className="mt-2 text-3xl font-semibold">Privacy governance for Indian legal data</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {privacyChecklist.map((item) => (
              <div key={item} className="rounded-2xl border border-white/12 bg-black/20 px-4 py-4 text-sm text-white/80">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-xl">DPDP Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "consentCapture", label: "Consent capture with IP and policy version" },
                { key: "retentionAutomation", label: "Data retention automation" },
                { key: "breachAlerts", label: "72-hour breach alert routing" },
                { key: "dsrWorkflow", label: "Data subject request workflow" },
              ].map((control) => (
                <div key={control.key} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2">
                  <p className="text-sm text-white/80">{control.label}</p>
                  <Switch
                    checked={controls[control.key as keyof typeof controls]}
                    onCheckedChange={(checked) =>
                      setControls((prev) => ({
                        ...prev,
                        [control.key]: checked,
                      }))
                    }
                    aria-label={`Toggle ${control.label}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-xl">Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                3 controls compliant
              </div>
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                1 control needs action
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="border-white/25 text-white/80">
                  Download Data
                </Button>
                <Button variant="outline" className="border-red-500/35 text-red-200">
                  Raise Erasure Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="glass p-6">
          <h2 className="text-2xl font-semibold">Consent Records</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-white/6 text-left text-xs uppercase tracking-[0.14em] text-white/50">
                <tr>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {consentRecords.map((record) => (
                  <tr key={record.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3">{record.id}</td>
                    <td className="px-4 py-3 text-white/75">{record.subject}</td>
                    <td className="px-4 py-3 text-white/75">{record.action}</td>
                    <td className="px-4 py-3 text-white/70">{record.date}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          record.status === "compliant"
                            ? "border-green-500/35 bg-green-500/15 text-green-300"
                            : "border-yellow-500/35 bg-yellow-500/15 text-yellow-300"
                        }
                      >
                        {record.status === "compliant" ? "compliant" : "action needed"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
