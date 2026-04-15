"use client";

import { useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Key,
  Plus,
  Settings,
  Shield,
  Users,
  Webhook,
  XCircle,
} from "lucide-react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const teamMembers = [
  { name: "Aarav Mehta", email: "aarav@firm.in", role: "admin", status: "active", mfa: true },
  { name: "Nandini Rao", email: "nandini@firm.in", role: "senior_advocate", status: "active", mfa: true },
  { name: "Vihaan Kapoor", email: "vihaan@firm.in", role: "junior_advocate", status: "active", mfa: false },
  { name: "Sana Iqbal", email: "sana@firm.in", role: "paralegal", status: "active", mfa: true },
];

function TeamTab() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Team Members</h2>
          <p className="text-sm text-white/65">Manage your firm&apos;s advocates, permissions, and MFA posture.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="btn-ripple">
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/20 bg-slate-950 text-white">
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription className="text-white/65">
                Add a new user and assign role-based access.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" placeholder="advocate@firm.in" className="focus-saffron" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Input id="invite-role" placeholder="senior_advocate" className="focus-saffron" />
              </div>
              <Button className="w-full">Send Invite</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member, index) => (
                <motion.tr
                  key={member.email}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="border-b border-white/10 text-sm last:border-0 hover:bg-white/5"
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-white/55">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        member.role === "admin"
                          ? "border-saffron-500/45 text-saffron-400"
                          : "border-white/25 text-white/75"
                      }`}
                    >
                      {member.role.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="border-green-500/35 bg-green-500/15 text-green-300">{member.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={member.mfa} aria-label={`${member.name} MFA status`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Security Settings</h2>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Multi-factor authentication</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">Enforce MFA for every advocate in your chamber.</p>
          <Switch aria-label="Enforce MFA toggle" defaultChecked />
        </CardContent>
      </Card>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Session policies</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session timeout (minutes)</Label>
            <Input id="session-timeout" defaultValue={60} className="focus-saffron" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-failed-logins">Max failed login attempts</Label>
            <Input id="max-failed-logins" defaultValue={5} className="focus-saffron" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Billing & Subscription</h2>
      <Card className="glass border-saffron-500/35">
        <CardContent className="p-6">
          <Badge className="mb-2 animate-pulse bg-saffron-500 text-slate-900">Current Plan</Badge>
          <h3 className="text-2xl font-semibold">Professional</h3>
          <p className="mt-1 text-white/65">₹14,999/month + GST billed annually</p>
          <div className="mt-4 space-y-2 text-sm text-white/75">
            <p>15 advocates included</p>
            <p>500 documents/month</p>
            <p>1,000 research queries/month</p>
            <p>SSO, SCIM, and billing controls</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SsoTab() {
  const [url, setUrl] = useState("https://idp.example.com/sso/saml");
  const validSamlUrl = useMemo(
    () => /^https?:\/\/.+\/sso\/saml/i.test(url.trim()),
    [url]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Single Sign-On & SCIM</h2>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">SAML 2.0 Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="saml-url">Identity Provider SSO URL</Label>
            <div className="relative">
              <Input
                id="saml-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="pr-10 focus-saffron"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {validSamlUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
              </span>
            </div>
            <p className={`text-xs ${validSamlUrl ? "text-green-300" : "text-red-300"}`}>
              {validSamlUrl ? "Valid SAML endpoint" : "Expected an https://.../sso/saml URL"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idp-certificate">IdP Certificate</Label>
            <textarea
              id="idp-certificate"
              className="min-h-24 w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-orange-400/35"
              placeholder="-----BEGIN CERTIFICATE-----"
            />
          </div>
          <Button>Save Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaybooksTab() {
  const playbooks = [
    { name: "Commercial Contracts", matters: 45, rules: 24 },
    { name: "Arbitration & Dispute Resolution", matters: 12, rules: 32 },
    { name: "Employment & Labour Code", matters: 28, rules: 18 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Playbooks</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Playbook
        </Button>
      </div>
      {playbooks.map((playbook, index) => (
        <motion.div
          key={playbook.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Card className="glass cursor-pointer transition hover:border-saffron-500/40">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-medium">{playbook.name}</h3>
                <p className="text-sm text-white/60">
                  {playbook.matters} matters - {playbook.rules} rules
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/45" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function WebhooksTab() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Webhooks</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead>Endpoint</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <code className="text-xs">https://api.slack.com/hooks/xxx</code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-white/25 text-white/75">
                    flag.created
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="border-green-500/35 bg-green-500/15 text-green-300">active</Badge>
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-white/5">
                <TableCell>
                  <code className="text-xs">https://hooks.zapier.com/xxx</code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-white/25 text-white/75">
                    document.processed
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="border-green-500/35 bg-green-500/15 text-green-300">active</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>("team");

  return (
    <AppShell title="Admin Panel">
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="glass h-fit">
          <CardContent className="p-3">
            <div className="mb-4 flex items-center gap-2 px-2">
              <Settings className="h-5 w-5 text-saffron-400" />
              <h2 className="text-lg font-semibold">Admin</h2>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button type="button"
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
                  <span className="relative">{tab.label}</span>
                </button>
              ))}
            </nav>
            <Card className="mt-4 border-white/15 bg-black/20">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2 text-saffron-300">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Professional Plan</span>
                </div>
                <p className="text-xs text-white/60">15 advocates • 500 docs/month</p>
                <Button size="sm" variant="outline" className="mt-3 w-full border-white/25 text-xs">
                  Manage Plan
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
                  {tab.label}
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
