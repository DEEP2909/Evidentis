"use client";

import { type ReactNode, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle, FileText, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

type TimeRange = "7d" | "30d" | "90d" | "1y";
type DrillDownFocus = "documents" | "flags" | "health";

const trendData: Record<TimeRange, { name: string; documents: number; flags: number; health: number }[]> = {
  "7d": [
    { name: "Mon", documents: 68, flags: 14, health: 76 },
    { name: "Tue", documents: 72, flags: 12, health: 78 },
    { name: "Wed", documents: 74, flags: 11, health: 79 },
    { name: "Thu", documents: 70, flags: 13, health: 77 },
    { name: "Fri", documents: 80, flags: 10, health: 81 },
  ],
  "30d": [
    { name: "W1", documents: 410, flags: 62, health: 72 },
    { name: "W2", documents: 460, flags: 55, health: 75 },
    { name: "W3", documents: 510, flags: 49, health: 78 },
    { name: "W4", documents: 540, flags: 43, health: 80 },
  ],
  "90d": [
    { name: "Jan", documents: 1480, flags: 205, health: 69 },
    { name: "Feb", documents: 1710, flags: 188, health: 73 },
    { name: "Mar", documents: 1960, flags: 162, health: 79 },
  ],
  "1y": [
    { name: "Q1", documents: 4860, flags: 598, health: 70 },
    { name: "Q2", documents: 5320, flags: 571, health: 74 },
    { name: "Q3", documents: 5870, flags: 516, health: 78 },
    { name: "Q4", documents: 6340, flags: 482, health: 81 },
  ],
};

function MetricCard({
  title,
  value,
  delta,
  icon,
}: {
  title: string;
  value: string;
  delta: number;
  icon: ReactNode;
}) {
  return (
    <Card className="glass">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/60">{title}</p>
            <p className="mt-1 text-3xl font-semibold">{value}</p>
            <div className={`mt-2 flex items-center gap-1 text-sm ${delta >= 0 ? "text-green-300" : "text-red-300"}`}>
              {delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(delta)}%</span>
              <span className="text-white/40">vs last period</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsContent() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [drillDownFocus, setDrillDownFocus] = useState<DrillDownFocus>("documents");
  const chartData = trendData[timeRange];

  const comparisonCards = [
    { label: "Doc Throughput", current: "2,847", prior: "2,532", change: "+12.5%" },
    { label: "Critical Flags", current: "47", prior: "61", change: "-22.9%" },
    { label: "Avg. Health", current: "78%", prior: "73%", change: "+5.0 pts" },
  ] as const;

  const drillDownRows = useMemo(() => {
    if (drillDownFocus === "documents") {
      return [
        { area: "Corporate", value: 812, baseline: 730, unit: "docs" },
        { area: "Litigation", value: 690, baseline: 655, unit: "docs" },
        { area: "Employment", value: 521, baseline: 470, unit: "docs" },
        { area: "IP", value: 434, baseline: 390, unit: "docs" },
      ];
    }

    if (drillDownFocus === "flags") {
      return [
        { area: "Corporate", value: 14, baseline: 19, unit: "flags" },
        { area: "Litigation", value: 11, baseline: 16, unit: "flags" },
        { area: "Employment", value: 12, baseline: 15, unit: "flags" },
        { area: "IP", value: 10, baseline: 11, unit: "flags" },
      ];
    }

    return [
      { area: "Corporate", value: 86, baseline: 81, unit: "%" },
      { area: "Litigation", value: 79, baseline: 74, unit: "%" },
      { area: "Employment", value: 73, baseline: 70, unit: "%" },
      { area: "IP", value: 76, baseline: 72, unit: "%" },
    ];
  }, [drillDownFocus]);

  const drillDownMax = useMemo(
    () => Math.max(...drillDownRows.map((row) => row.value), 1),
    [drillDownRows]
  );

  const metrics = useMemo(
    () => [
      {
        title: "Total Documents",
        value: "2,847",
        delta: 12.5,
        icon: <FileText className="h-5 w-5 text-saffron-400" />,
      },
      {
        title: "Active Matters",
        value: "156",
        delta: 8.2,
        icon: <BarChart3 className="h-5 w-5 text-blue-300" />,
      },
      {
        title: "Open Flags",
        value: "47",
        delta: -15.3,
        icon: <ShieldAlert className="h-5 w-5 text-amber-300" />,
      },
      {
        title: "Avg. Health Score",
        value: "78%",
        delta: 5.1,
        icon: <CheckCircle className="h-5 w-5 text-green-300" />,
      },
    ],
    []
  );

  return (
    <AppShell title={t("analytics_title")}>
      <div className="section-wrap page-enter">
        <div className="section-header">
          <p className="section-subtitle">
            Monitor firm-level legal operations with role-restricted analytics and trend intelligence.
          </p>
          <div className="flex rounded-xl border border-white/15 bg-white/5 p-1">
            {(["7d", "30d", "90d", "1y"] as const).map((range) => (
              <button type="button"
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  timeRange === range
                    ? "bg-saffron-500 text-slate-900"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                aria-label={`Set analytics range to ${range}`}
              >
                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "1 Year"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <MetricCard title={metric.title} value={metric.value} delta={metric.delta} icon={metric.icon} />
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">Document and Risk Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} aria-label="Document and risk trend bar chart">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.65)" />
                  <YAxis stroke="rgba(255,255,255,0.65)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(2, 6, 23, 0.95)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "0.75rem",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="documents" fill="#5e6ad2" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="flags" fill="#60a5fa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">Matter Health Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Acme Corp Acquisition", health: 92, docs: 47, flags: 2 },
                { name: "TechStart Series B", health: 85, docs: 23, flags: 5 },
                { name: "Global Services RFP", health: 71, docs: 15, flags: 8 },
                { name: "Employment Restructure", health: 45, docs: 34, flags: 18 },
              ].map((matter, index) => (
                <motion.div
                  key={matter.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + index * 0.05 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{matter.name}</span>
                    <Badge
                      className={`${
                        matter.health >= 80
                          ? "border-green-500/35 bg-green-500/15 text-green-300"
                          : matter.health >= 60
                          ? "border-yellow-500/35 bg-yellow-500/15 text-yellow-300"
                          : "border-red-500/35 bg-red-500/15 text-red-300"
                      }`}
                    >
                      {matter.health}%
                    </Badge>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${matter.health}%` }}
                      transition={{ delay: 0.24 + index * 0.05, duration: 0.6 }}
                      className={`h-full ${
                        matter.health >= 80 ? "bg-green-500" : matter.health >= 60 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-white/45">
                    {matter.docs} docs • {matter.flags} flags
                  </p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Comparative Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {comparisonCards.map((card, index) => (
              <motion.article
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="rounded-xl border border-white/15 bg-black/20 p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.current}</p>
                <p className="mt-1 text-xs text-white/55">Previous: {card.prior}</p>
                <p className="mt-2 text-sm text-saffron-300">{card.change}</p>
              </motion.article>
            ))}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="space-y-4">
            <div className="section-header">
              <CardTitle className="text-lg">Practice Area Drill-down</CardTitle>
              <div className="flex flex-wrap gap-2">
                {([
                  ["documents", "Documents"],
                  ["flags", "Flags"],
                  ["health", "Health"],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setDrillDownFocus(value)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      drillDownFocus === value
                        ? "border-saffron-500/40 bg-saffron-500/15 text-saffron-300"
                        : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                    aria-label={`Show ${label.toLowerCase()} drill down`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {drillDownRows.map((row, index) => {
              const percentage = (row.value / drillDownMax) * 100;
              const delta = row.value - row.baseline;
              const isPositive = delta >= 0;

              return (
                <motion.div
                  key={row.area}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="rounded-xl border border-white/10 bg-black/15 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{row.area}</span>
                    <span className="font-semibold">
                      {row.value}
                      {row.unit === "%" ? "%" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.28 + index * 0.05, duration: 0.45 }}
                      className="h-full bg-saffron-500"
                    />
                  </div>
                  <p className={`mt-2 text-xs ${isPositive ? "text-green-300" : "text-red-300"}`}>
                    {isPositive ? "+" : ""}
                    {delta}
                    {row.unit === "%" ? " pts" : ` ${row.unit}`} vs prior period
                  </p>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthGuard requiredRoles={["admin", "senior_advocate", "partner"]}>
      <AnalyticsContent />
    </AuthGuard>
  );
}
