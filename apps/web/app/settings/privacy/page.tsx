"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dpdp } from "@/lib/api";
import { privacyChecklist } from "@/lib/india";
import { useTranslation } from "react-i18next";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function prettyRequestType(value: string): string {
  if (value === "consent") return "Consent granted";
  if (value === "consent_withdrawal") return "Consent withdrawal";
  if (value === "erasure") return "Erasure request";
  return value.replaceAll("_", " ");
}

function prettyStatus(value: string): string {
  if (value === "resolved") return "Resolved";
  if (value === "processing") return "In progress";
  if (value === "open") return "Open";
  return value.replaceAll("_", " ");
}

export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: consentStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["dpdp", "consent-status"],
    queryFn: () => dpdp.consentStatus(),
    staleTime: 30_000,
  });

  const { data: consentRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["dpdp", "requests"],
    queryFn: () => dpdp.requests(),
    staleTime: 30_000,
  });

  const withdrawMutation = useMutation({
    mutationFn: (reason: string) => dpdp.withdrawConsent(reason),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dpdp", "consent-status"] }),
        queryClient.invalidateQueries({ queryKey: ["dpdp", "requests"] }),
      ]);
      toast.success(`Erasure request submitted. Processing deadline: ${formatDate(result.erasureDeadline)}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to submit erasure request. Please try again.");
    },
  });

  const latestWithdrawalRequest = useMemo(
    () =>
      [...consentRecords]
        .filter((record) => record.requestType === "consent_withdrawal" || record.requestType === "erasure")
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null,
    [consentRecords]
  );

  const openPrivacyActions = useMemo(
    () => consentRecords.filter((record) => record.status === "open" || record.status === "processing").length,
    [consentRecords]
  );

  const statusCards = useMemo(
    () => [
      {
        title: "Consent",
        value: consentStatus?.active ? "Active" : "Withdrawn / pending",
        ok: Boolean(consentStatus?.active),
        detail: consentStatus?.active
          ? `Granted on ${formatDate(consentStatus.consentedAt)}`
          : `Latest withdrawal: ${formatDate(consentStatus?.withdrawnAt)}`,
      },
      {
        title: "Open Actions",
        value: String(openPrivacyActions),
        ok: openPrivacyActions === 0,
        detail: openPrivacyActions === 0 ? "No pending DPDP actions" : "Privacy workflow review needed",
      },
      {
        title: "Audit Records",
        value: String(consentRecords.length),
        ok: consentRecords.length > 0,
        detail: consentRecords.length > 0 ? "Tenant activity is logged" : "No consent events logged yet",
      },
      {
        title: "Erasure Workflow",
        value: latestWithdrawalRequest ? prettyStatus(latestWithdrawalRequest.status) : "Ready",
        ok: !latestWithdrawalRequest || latestWithdrawalRequest.status === "resolved",
        detail: latestWithdrawalRequest
          ? `Latest request on ${formatDate(latestWithdrawalRequest.createdAt)}`
          : "No erasure request in progress",
      },
    ],
    [consentRecords.length, consentStatus, latestWithdrawalRequest, openPrivacyActions]
  );

  const compliantCount = statusCards.filter((card) => card.ok).length;
  const actionNeededCount = statusCards.length - compliantCount;

  const withdrawalPending =
    withdrawMutation.isPending ||
    consentStatus?.active === false ||
    latestWithdrawalRequest?.status === "open" ||
    latestWithdrawalRequest?.status === "processing";

  const handleErasureRequest = () => {
    if (!window.confirm("This will withdraw your consent and request erasure of your personal data. This cannot be undone. Continue?")) {
      return;
    }

    withdrawMutation.mutate("User-initiated withdrawal from privacy settings");
  };

  return (
    <AppShell title={t("privacy")}>
      <div className="space-y-6 page-enter">
        <section className="glass p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-saffron-300">DPDP Control Centre</p>
          <h2 className="mt-2 text-3xl font-semibold">Privacy governance for Indian legal data</h2>
          <p className="mt-3 max-w-3xl text-sm text-white/65">
            Live consent posture, request history, and erasure workflows for your workspace. This view now reflects tenant records instead of demo data.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {privacyChecklist.map((item) => (
              <div key={item} className="rounded-2xl border border-white/12 bg-black/20 px-4 py-4 text-sm text-white/80">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((card) => (
            <Card key={card.title} className="glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-semibold ${card.ok ? "text-green-300" : "text-yellow-300"}`}>
                  {statusLoading ? "..." : card.value}
                </div>
                <p className="mt-2 text-sm text-white/60">{statusLoading ? "Loading privacy status..." : card.detail}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-xl">Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                {statusLoading ? "Loading..." : `${compliantCount} controls aligned with current tenant state`}
              </div>
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                {statusLoading ? "Loading..." : `${actionNeededCount} control${actionNeededCount === 1 ? "" : "s"} need attention`}
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/70">
                Latest consent update: {formatDate(consentStatus?.consentedAt ?? consentStatus?.withdrawnAt)}
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-xl">Privacy Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/70">
                {openPrivacyActions > 0
                  ? `${openPrivacyActions} privacy request(s) are currently open or processing.`
                  : "No open privacy requests. Your workspace is clear to submit a new request if needed."}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  className="border-white/25 text-white/80"
                  onClick={() => toast.info("Data export can be delivered through your secure matter workspace on request.")}
                >
                  Download Data
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/35 text-red-200"
                  onClick={handleErasureRequest}
                  disabled={withdrawalPending}
                >
                  {withdrawMutation.isPending
                    ? "Submitting..."
                    : consentStatus?.active === false
                    ? "Consent Withdrawn"
                    : withdrawalPending
                    ? "Request In Progress"
                    : "Raise Erasure Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="glass p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Consent Records</h2>
              <p className="mt-1 text-sm text-white/55">Live DPDP requests and consent events for this tenant.</p>
            </div>
            <Badge className="border-white/20 bg-white/10 text-white/75">
              {recordsLoading ? "Loading..." : `${consentRecords.length} records`}
            </Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-white/6 text-left text-xs uppercase tracking-[0.14em] text-white/50">
                <tr>
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {consentRecords.map((record) => {
                  const statusTone =
                    record.status === "resolved"
                      ? "border-green-500/35 bg-green-500/15 text-green-300"
                      : record.status === "processing"
                      ? "border-blue-500/35 bg-blue-500/15 text-blue-300"
                      : "border-yellow-500/35 bg-yellow-500/15 text-yellow-300";

                  return (
                    <tr key={record.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white/90">{prettyRequestType(record.requestType)}</div>
                        <div className="text-xs text-white/45">{record.id}</div>
                      </td>
                      <td className="px-4 py-3 text-white/75">
                        {String(record.details?.reason ?? record.details?.details ?? "System logged event")}
                      </td>
                      <td className="px-4 py-3 text-white/70">{formatDate(record.createdAt)}</td>
                      <td className="px-4 py-3 text-white/70">{formatDate(record.resolvedAt)}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusTone}>{prettyStatus(record.status)}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {!recordsLoading && consentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-white/50">
                      No DPDP requests recorded yet for this tenant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
