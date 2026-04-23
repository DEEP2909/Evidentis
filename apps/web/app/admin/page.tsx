"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ADVOCATE_ROLES,
  ATTORNEY_STATUSES,
  type Playbook,
  type PracticeArea,
} from "@evidentis/shared";
import {
  Building2,
  CreditCard,
  ExternalLink,
  FileText,
  Key,
  Loader2,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Users,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  admin as adminApi,
  playbooks,
  type AdminSecuritySettings,
  type AdminWebhook,
  type AdminSsoConfiguration,
  type TeamMember,
  billing,
} from "@/lib/api";
import { EVIDENTIS_PLANS } from "@/lib/pricing";
import { useTranslation } from "react-i18next";

type AdminTab = "team" | "security" | "billing" | "sso" | "playbooks" | "webhooks";

const tabs: readonly {
  id: AdminTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "team", label: "Team Members", icon: Users },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "sso", label: "SSO / SCIM", icon: Key },
  { id: "playbooks", label: "Playbooks", icon: FileText },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
];

const MEMBER_ROLE_OPTIONS = ADVOCATE_ROLES.map((role) => ({
  value: role,
  label: role.replaceAll("_", " "),
}));

const MEMBER_STATUS_OPTIONS = ATTORNEY_STATUSES.map((status) => ({
  value: status,
  label: status.replaceAll("_", " "),
}));

function formatRoleLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function planLimitLabel(value: number | null, suffix: string) {
  if (value === null) return `Custom ${suffix}`;
  return `${value.toLocaleString("en-IN")} ${suffix}`;
}

function MemberRow({ member }: { member: TeamMember }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [mfaEnabled, setMfaEnabled] = useState(member.mfaEnabled);

  useEffect(() => {
    setRole(member.role);
    setStatus(member.status);
    setMfaEnabled(member.mfaEnabled);
  }, [member]);

  const updateMutation = useMutation({
    mutationFn: (input: { role?: string; status?: string; mfaEnabled?: boolean }) =>
      adminApi.updateMember(member.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      toast.success(
        t("admin_memberUpdated", { defaultValue: "Team member updated successfully." })
      );
    },
    onError: (error) => {
      setRole(member.role);
      setStatus(member.status);
      setMfaEnabled(member.mfaEnabled);
      toast.error(error instanceof Error ? error.message : "Unable to update team member.");
    },
  });

  const isDirty =
    role !== member.role || status !== member.status || mfaEnabled !== member.mfaEnabled;

  const saveChanges = () => {
    const payload: { role?: string; status?: string; mfaEnabled?: boolean } = {};
    if (role !== member.role) payload.role = role;
    if (status !== member.status) payload.status = status;
    if (mfaEnabled !== member.mfaEnabled) payload.mfaEnabled = mfaEnabled;
    if (Object.keys(payload).length === 0) return;
    updateMutation.mutate(payload);
  };

  const toggleMfa = (checked: boolean) => {
    setMfaEnabled(checked);
    updateMutation.mutate({ mfaEnabled: checked });
  };

  return (
    <TableRow className="border-white/10 hover:bg-white/5">
      <TableCell>
        <div>
          <p className="font-medium">{member.name}</p>
          <p className="text-xs text-white/55">{member.email}</p>
          <p className="mt-1 text-[11px] text-white/40">
            {t("admin_lastLogin", { defaultValue: "Last login" })}: {formatDateTime(member.lastLoginAt)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="border-white/15 bg-slate-950/70 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/15 bg-slate-950 text-white">
            {MEMBER_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="capitalize">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="border-white/15 bg-slate-950/70 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/15 bg-slate-950 text-white">
            {MEMBER_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="capitalize">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Switch
            checked={mfaEnabled}
            onCheckedChange={toggleMfa}
            disabled={updateMutation.isPending}
            aria-label={`${member.name} MFA status`}
          />
          <span className="text-xs text-white/60">
            {mfaEnabled
              ? t("admin_mfaEnabled", { defaultValue: "Enabled" })
              : t("admin_mfaDisabled", { defaultValue: "Disabled" })}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          onClick={saveChanges}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("save")}
            </>
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function TeamTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("advocate");

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => adminApi.listMembers(),
    staleTime: 60_000,
  });

  const { data: billingData } = useQuery({
    queryKey: ["billing"],
    queryFn: () => billing.status(),
  });

  const currentPlan = EVIDENTIS_PLANS.find(p => p.key === billingData?.plan) ?? EVIDENTIS_PLANS[0];

  const inviteMutation = useMutation({
    mutationFn: () => adminApi.inviteMember({ email: email.trim(), role }),
    onSuccess: () => {
      setEmail("");
      setRole("advocate");
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      toast.success(t("admin_inviteSent", { defaultValue: "Invitation sent successfully." }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to send invite.");
    },
  });

  const activeMembers = teamMembers.filter((member) => member.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {t("admin_teamMembers", { defaultValue: "Team Members" })}
          </h2>
          <p className="text-sm text-white/65">
            {t("admin_teamMembersDesc", {
              defaultValue:
                "Invite advocates, update access, and keep MFA posture aligned across your firm.",
            })}
          </p>
        </div>
        <Badge className="border-saffron-500/30 bg-saffron-500/10 text-saffron-300">
          {activeMembers} / {currentPlan.seatCap ?? "Custom"}{" "}
          {t("admin_activeSeats", { defaultValue: "active seats" })}
        </Badge>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin_inviteTeam", { defaultValue: "Invite Team Member" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t("auth_email")}</Label>
            <Input
              id="invite-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="advocate@firm.in"
              className="focus-saffron"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">
              {t("admin_role", { defaultValue: "Role" })}
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger
                id="invite-role"
                className="border-white/15 bg-slate-950/70 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-slate-950 text-white">
                {MEMBER_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="capitalize">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full lg:w-auto"
              onClick={() => inviteMutation.mutate()}
              disabled={!email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("admin_sendInvite", { defaultValue: "Send Invite" })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-white/55">
              {t("loading")}
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              <p className="text-sm">
                {t("admin_noMembers", {
                  defaultValue: "No team members found yet. Invite your first advocate above.",
                })}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead>
                    {t("admin_member", { defaultValue: "Member" })}
                  </TableHead>
                  <TableHead>
                    {t("admin_role", { defaultValue: "Role" })}
                  </TableHead>
                  <TableHead>
                    {t("doc_status")}
                  </TableHead>
                  <TableHead>
                    {t("trust_mfa", { defaultValue: "MFA" })}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("doc_actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "security-settings"],
    queryFn: () => adminApi.getSecuritySettings(),
    staleTime: 60_000,
  });

  const [settings, setSettings] = useState<AdminSecuritySettings>({
    enforceMfa: true,
    sessionTimeoutMinutes: 60,
    maxFailedLogins: 5,
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.saveSecuritySettings(settings),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "security-settings"] });
      toast.success(
        t("admin_securitySaved", { defaultValue: "Security settings saved." })
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to save security settings.");
    },
  });

  const isDirty =
    settings.enforceMfa !== (data?.enforceMfa ?? true) ||
    settings.sessionTimeoutMinutes !== (data?.sessionTimeoutMinutes ?? 60) ||
    settings.maxFailedLogins !== (data?.maxFailedLogins ?? 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">
          {t("admin_securityTitle", { defaultValue: "Security Settings" })}
        </h2>
        <p className="text-sm text-white/65">
          {t("admin_securityDesc", {
            defaultValue:
              "Control chamber-wide authentication posture, session policies, and lockout thresholds.",
          })}
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin_mfaPolicy", { defaultValue: "Multi-factor authentication" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">
              {t("admin_mfaPolicyDesc", {
                defaultValue: "Require MFA for every advocate in your chamber.",
              })}
            </p>
          </div>
          <Switch
            checked={settings.enforceMfa}
            onCheckedChange={(checked) =>
              setSettings((current) => ({ ...current, enforceMfa: checked }))
            }
            aria-label="Enforce MFA toggle"
          />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin_sessionPolicies", { defaultValue: "Session policies" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="session-timeout">
              {t("admin_sessionTimeout", { defaultValue: "Session timeout (minutes)" })}
            </Label>
            <Input
              id="session-timeout"
              type="number"
              min={5}
              max={1440}
              value={settings.sessionTimeoutMinutes}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sessionTimeoutMinutes: Number(event.target.value || 60),
                }))
              }
              className="focus-saffron"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-failed-logins">
              {t("admin_maxFailedLogins", { defaultValue: "Max failed login attempts" })}
            </Label>
            <Input
              id="max-failed-logins"
              type="number"
              min={3}
              max={20}
              value={settings.maxFailedLogins}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  maxFailedLogins: Number(event.target.value || 5),
                }))
              }
              className="focus-saffron"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={!isDirty || saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? t("loading") : t("save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function BillingTab() {
  const { t } = useTranslation();

  const { data: billingData } = useQuery({
    queryKey: ["billing"],
    queryFn: () => billing.status(),
  });

  const currentPlan = EVIDENTIS_PLANS.find(p => p.key === billingData?.plan) ?? EVIDENTIS_PLANS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t("bill_title")}</h2>
          <p className="text-sm text-white/65">
            {t("admin_billingDesc", {
              defaultValue:
                "Landing, admin, and billing pricing are now aligned to the same plan catalog.",
            })}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/billing">
            {t("bill_managePlan")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card className="glass border-saffron-500/35">
        <CardContent className="p-6">
          <Badge className="mb-3 bg-saffron-500 text-slate-900">{t("bill_currentPlan")}</Badge>
          <h3 className="text-2xl font-semibold">{currentPlan.name}</h3>
          <p className="mt-1 text-white/65">
            {currentPlan.price}
            {currentPlan.billingSuffix}
          </p>
          <div className="mt-4 grid gap-3 text-sm text-white/75 sm:grid-cols-3">
            <p>{currentPlan.seatLimit}</p>
            <p>{currentPlan.documentLimit}</p>
            <p>{currentPlan.researchLimit}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {EVIDENTIS_PLANS.map((plan, index) => (
          <motion.article
            key={plan.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass p-6 ${plan.key === currentPlan.key ? "border-saffron-500/35" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-saffron-300">{plan.name}</p>
              {plan.key === currentPlan.key ? (
                <Badge className="bg-saffron-500 text-slate-900">{t("bill_currentPlan")}</Badge>
              ) : null}
            </div>
            <div className="mt-4 text-4xl font-semibold">{plan.price}</div>
            <p className="mt-1 text-sm text-white/50">{plan.billingSuffix}</p>
            <p className="mt-3 text-sm text-white/70">{plan.description}</p>
            <div className="mt-5 space-y-2 text-sm text-white/65">
              <p>{plan.seatLimit}</p>
              <p>{plan.documentLimit}</p>
              <p>{plan.researchLimit}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

function SsoTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ["admin", "sso"],
    queryFn: () => adminApi.listSsoConfigurations(),
    staleTime: 60_000,
  });

  const samlConfig = useMemo<AdminSsoConfiguration | null>(
    () => configs.find((config) => config.providerType === "saml") ?? configs[0] ?? null,
    [configs]
  );

  const [url, setUrl] = useState("");
  const [certificate, setCertificate] = useState("");

  useEffect(() => {
    if (samlConfig) {
      setUrl(samlConfig.ssoUrl ?? "");
    }
  }, [samlConfig]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.saveSamlConfiguration({ ssoUrl: url.trim(), certificate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "sso"] });
      toast.success(t("admin_ssoSaved", { defaultValue: "SAML configuration saved." }));
      setCertificate("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to save SSO configuration.");
    },
  });

  const validSamlUrl = /^https?:\/\/.+/i.test(url.trim());

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">
          {t("admin_ssoTitle", { defaultValue: "Single Sign-On & SCIM" })}
        </h2>
        <p className="text-sm text-white/65">
          {t("admin_ssoDesc", {
            defaultValue:
              "Save your IdP endpoint and certificate so enterprise teams can provision secure SAML access.",
          })}
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin_samlConfig", { defaultValue: "SAML 2.0 Configuration" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="saml-url">
              {t("admin_idpSsoUrl", { defaultValue: "Identity Provider SSO URL" })}
            </Label>
            <Input
              id="saml-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="focus-saffron"
              placeholder="https://idp.example.com/saml/login"
            />
            <p className={`text-xs ${validSamlUrl ? "text-green-300" : "text-red-300"}`}>
              {validSamlUrl
                ? t("admin_validEndpoint", { defaultValue: "Valid SAML endpoint" })
                : t("admin_expectedHttps", { defaultValue: "Expected a valid https:// URL" })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idp-certificate">
              {t("admin_certificate", { defaultValue: "IdP Certificate" })}
            </Label>
            <textarea
              id="idp-certificate"
              value={certificate}
              onChange={(event) => setCertificate(event.target.value)}
              className="min-h-28 w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-orange-400/35"
              placeholder="-----BEGIN CERTIFICATE-----"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!validSamlUrl || certificate.trim().length < 20 || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("save")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {samlConfig ? (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin_currentSso", { defaultValue: "Current identity setup" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-white/70 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                {t("admin_issuer", { defaultValue: "Issuer" })}
              </p>
              <p className="mt-2 break-all">{samlConfig.issuerUrl ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                {t("admin_metadataUrl", { defaultValue: "Metadata URL" })}
              </p>
              <p className="mt-2 break-all">{samlConfig.metadataUrl ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                {t("admin_status", { defaultValue: "Status" })}
              </p>
              <p className="mt-2">
                {samlConfig.enabled
                  ? t("admin_enabled", { defaultValue: "Enabled" })
                  : t("admin_disabled", { defaultValue: "Disabled" })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                {t("admin_updated", { defaultValue: "Updated" })}
              </p>
              <p className="mt-2">{formatDateTime(samlConfig.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PlaybooksTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [description, setDescription] = useState("");

  const { data: playbookRows = [], isLoading } = useQuery({
    queryKey: ["admin", "playbooks"],
    queryFn: () => playbooks.list(),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      playbooks.create({
        name: name.trim(),
        practiceArea: (practiceArea.trim() || undefined) as PracticeArea | undefined,
        description: description.trim() || undefined,
        rules: [],
      }),
    onSuccess: () => {
      setName("");
      setPracticeArea("");
      setDescription("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "playbooks"] });
      toast.success(t("admin_playbookCreated", { defaultValue: "Playbook created." }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to create playbook.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      playbooks.update(id, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "playbooks"] });
      toast.success(t("admin_playbookUpdated", { defaultValue: "Playbook updated." }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update playbook.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => playbooks.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "playbooks"] });
      toast.success(t("admin_playbookDeleted", { defaultValue: "Playbook deleted." }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete playbook.");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">
          {t("admin_playbooksTitle", { defaultValue: "Playbooks" })}
        </h2>
        <p className="text-sm text-white/65">
          {t("admin_playbooksDesc", {
            defaultValue:
              "Create reusable review policies and enable or disable them without leaving the admin workspace.",
          })}
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin_createPlaybook", { defaultValue: "Create Playbook" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="playbook-name">
              {t("admin_name", { defaultValue: "Name" })}
            </Label>
            <Input
              id="playbook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Commercial Contracts"
              className="focus-saffron"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="playbook-area">
              {t("admin_practiceArea", { defaultValue: "Practice area" })}
            </Label>
            <Input
              id="playbook-area"
              value={practiceArea}
              onChange={(event) => setPracticeArea(event.target.value)}
              placeholder="commercial"
              className="focus-saffron"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="playbook-description">
              {t("admin_description", { defaultValue: "Description" })}
            </Label>
            <textarea
              id="playbook-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-orange-400/35"
              placeholder="Short review guidance for this practice area."
            />
          </div>
          <div className="flex justify-end lg:col-span-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("admin_createPlaybook", { defaultValue: "Create Playbook" })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="glass">
          <CardContent className="p-6 text-sm text-white/55">{t("loading")}</CardContent>
        </Card>
      ) : playbookRows.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-8 text-center text-sm text-white/55">
            {t("admin_noPlaybooks", {
              defaultValue: "No playbooks yet. Create your first review policy above.",
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {playbookRows.map((playbook) => (
            <Card key={playbook.id} className="glass">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{playbook.name}</h3>
                    <p className="mt-1 text-sm text-white/55">
                      {playbook.description || t("admin_noDescription", { defaultValue: "No description provided." })}
                    </p>
                  </div>
                  <Badge
                    className={
                      playbook.isActive
                        ? "border-green-500/35 bg-green-500/15 text-green-300"
                        : "border-white/20 bg-white/5 text-white/65"
                    }
                  >
                    {playbook.isActive
                      ? t("admin_active", { defaultValue: "Active" })
                      : t("admin_inactive", { defaultValue: "Inactive" })}
                  </Badge>
                </div>

                <div className="grid gap-3 text-sm text-white/65 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      {t("admin_practiceArea", { defaultValue: "Practice area" })}
                    </p>
                    <p className="mt-1 capitalize">{playbook.practiceArea ?? "General"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      {t("admin_ruleCount", { defaultValue: "Rules" })}
                    </p>
                    <p className="mt-1">{playbook.rules.length}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={playbook.isActive}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: playbook.id, isActive: checked })
                      }
                      disabled={toggleMutation.isPending}
                    />
                    <span className="text-sm text-white/70">
                      {t("admin_enablePlaybook", { defaultValue: "Enable playbook" })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(playbook.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WebhooksTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("flag.created, document.processed");
  const [latestSecret, setLatestSecret] = useState<string | null>(null);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["admin", "webhooks"],
    queryFn: () => adminApi.listWebhooks(),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createWebhook({
        url: url.trim(),
        events: events
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    onSuccess: (result) => {
      setUrl("");
      setEvents("flag.created, document.processed");
      setLatestSecret(result.secret);
      void queryClient.invalidateQueries({ queryKey: ["admin", "webhooks"] });
      toast.success(t("admin_webhookCreated", { defaultValue: "Webhook created." }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to create webhook.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "webhooks"] });
      toast.success(t("admin_webhookDeleted", { defaultValue: "Webhook deleted." }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete webhook.");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">
          {t("admin_webhooksTitle", { defaultValue: "Webhooks" })}
        </h2>
        <p className="text-sm text-white/65">
          {t("admin_webhooksDesc", {
            defaultValue:
              "Create outbound hooks for events like document processing and new risk flags.",
          })}
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin_addWebhook", { defaultValue: "Add Webhook" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">
              {t("admin_endpointUrl", { defaultValue: "Endpoint URL" })}
            </Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/hooks/evidentis"
              className="focus-saffron"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-events">
              {t("admin_events", { defaultValue: "Events" })}
            </Label>
            <Input
              id="webhook-events"
              value={events}
              onChange={(event) => setEvents(event.target.value)}
              placeholder="flag.created, document.processed"
              className="focus-saffron"
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full lg:w-auto"
              onClick={() => createMutation.mutate()}
              disabled={!url.trim() || !events.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("admin_addWebhook", { defaultValue: "Add Webhook" })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {latestSecret ? (
        <Card className="glass border-saffron-500/25">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-saffron-300">
              {t("admin_webhookSecret", { defaultValue: "Webhook secret" })}
            </p>
            <p className="text-sm text-white/65">
              {t("admin_webhookSecretDesc", {
                defaultValue: "Copy this now. It is only shown once after creation.",
              })}
            </p>
            <code className="block overflow-x-auto rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/80">
              {latestSecret}
            </code>
          </CardContent>
        </Card>
      ) : null}

      <Card className="glass">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-white/55">{t("loading")}</div>
          ) : webhooks.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/55">
              {t("admin_noWebhooks", {
                defaultValue: "No webhooks configured yet.",
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead>
                    {t("admin_endpoint", { defaultValue: "Endpoint" })}
                  </TableHead>
                  <TableHead>
                    {t("admin_events", { defaultValue: "Events" })}
                  </TableHead>
                  <TableHead>
                    {t("admin_status", { defaultValue: "Status" })}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("doc_actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div>
                        <code className="text-xs text-white/85">{webhook.url}</code>
                        <p className="mt-1 text-[11px] text-white/40">
                          {t("admin_lastTriggered", { defaultValue: "Last triggered" })}:{" "}
                          {formatDateTime(webhook.lastTriggeredAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.map((eventName) => (
                          <Badge
                            key={`${webhook.id}-${eventName}`}
                            variant="outline"
                            className="border-white/20 text-white/70"
                          >
                            {eventName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-green-500/35 bg-green-500/15 text-green-300">
                        {webhook.isActive
                          ? t("admin_active", { defaultValue: "Active" })
                          : t("admin_inactive", { defaultValue: "Inactive" })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(webhook.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>("team");

  const { data: billingData } = useQuery({
    queryKey: ["billing"],
    queryFn: () => billing.status(),
  });

  const currentPlan = EVIDENTIS_PLANS.find(p => p.key === billingData?.plan) ?? EVIDENTIS_PLANS[0];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "") as AdminTab;
      if (tabs.some((tab) => tab.id === hash)) {
        setActiveTab(hash);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash === activeTab) return;

    const nextUrl =
      activeTab === "team" ? window.location.pathname : `${window.location.pathname}#${activeTab}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeTab]);

  return (
    <AppShell title={t("nav_admin")}>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="glass h-fit">
          <CardContent className="p-3">
            <div className="mb-4 flex items-center gap-2 px-2">
              <Settings className="h-5 w-5 text-saffron-400" />
              <h2 className="text-lg font-semibold">{t("nav_admin")}</h2>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeTab === tab.id
                      ? "bg-white/12 text-saffron-300"
                      : "text-white/65 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {activeTab === tab.id ? (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute inset-0 rounded-lg border border-saffron-500/25"
                    />
                  ) : null}
                  <tab.icon className="h-4 w-4" />
                  <span className="relative">
                    {t(`admin_tab_${tab.id}`, { defaultValue: tab.label })}
                  </span>
                </button>
              ))}
            </nav>
            <Card className="mt-4 border-white/15 bg-black/20">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2 text-saffron-300">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {currentPlan.name} {t("bill_currentPlan")}
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  {planLimitLabel(currentPlan.seatCap, "users")} •{" "}
                  {planLimitLabel(currentPlan.documentCap, "documents/month")}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 w-full border-white/25 text-xs">
                  <Link href="/billing">{t("bill_managePlan")}</Link>
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)}>
            <TabsList className="hidden">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {t(`admin_tab_${tab.id}`, { defaultValue: tab.label })}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="team" className="mt-0">
              <TeamTab />
            </TabsContent>
            <TabsContent value="security" className="mt-0">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="billing" className="mt-0">
              <BillingTab />
            </TabsContent>
            <TabsContent value="sso" className="mt-0">
              <SsoTab />
            </TabsContent>
            <TabsContent value="playbooks" className="mt-0">
              <PlaybooksTab />
            </TabsContent>
            <TabsContent value="webhooks" className="mt-0">
              <WebhooksTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <AdminContent />
    </AuthGuard>
  );
}
