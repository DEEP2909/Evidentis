"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gavel,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { matters, type CreateMatterInput } from "@/lib/api";
import { formatDate, INDIAN_STATES } from "@/lib/utils";

const createMatterSchema = z.object({
  name: z.string().min(1, "Matter name is required"),
  clientName: z.string().min(1, "Client name is required"),
  description: z.string().optional(),
  practiceArea: z.string().optional(),
  jurisdiction: z.string().optional(),
});

type CreateMatterFormData = z.infer<typeof createMatterSchema>;

const statuses = ["all", "open", "under_review", "closed", "archived"] as const;

function HealthMiniDonut({ value }: { value: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const tone = progress >= 80 ? "#22c55e" : progress >= 60 ? "#eab308" : "#ef4444";

  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-label={`Matter health ${progress}%`}>
      <title>{`Matter health ${progress}%`}</title>
      <circle cx="19" cy="19" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
      <motion.circle
        cx="19"
        cy="19"
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        transform="rotate(-90 19 19)"
      />
      <text x="19" y="22" textAnchor="middle" className="fill-white text-[9px] font-semibold">
        {progress}
      </text>
    </svg>
  );
}

export default function MattersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [matterPendingDeletion, setMatterPendingDeletion] = useState<{ id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMatterFormData>({
    resolver: zodResolver(createMatterSchema),
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery), 280);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const { data: mattersData, isLoading, isFetching } = useQuery({
    queryKey: ["matters", { search: debouncedSearch, status: statusFilter === "all" ? undefined : statusFilter }],
    queryFn: () =>
      matters.list({
        search: debouncedSearch || undefined,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as "open" | "under_review" | "closed" | "archived"),
      }),
  });

  const statusCounts = useMemo(() => {
    const base = { all: 0, open: 0, under_review: 0, closed: 0, archived: 0 };
    const rows = mattersData?.data ?? [];
    for (const row of rows) {
      base.all += 1;
      if (row.status in base) {
        base[row.status as keyof typeof base] += 1;
      }
    }
    return base;
  }, [mattersData]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMatterInput) => matters.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      setIsCreateDialogOpen(false);
      reset();
      toast.success("Matter created successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create matter");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => matters.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      toast.success("Matter deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete matter");
    },
  });

  const confirmDeleteMatter = () => {
    if (!matterPendingDeletion) {
      return;
    }

    deleteMutation.mutate(matterPendingDeletion.id);
    setMatterPendingDeletion(null);
  };

  const practiceAreas = [
    "Corporate",
    "Litigation",
    "Real Estate",
    "Employment",
    "Intellectual Property",
    "Tax",
    "Banking & Finance",
    "Environmental",
    "Insolvency",
    "Arbitration",
  ];

  return (
    <AppShell title="Matters">
      <div className="space-y-6 page-enter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-saffron-300">India Legal Operations</p>
            <h2 className="mt-1 text-2xl font-semibold">Manage matters across courts and tribunals</h2>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Matter
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/20 bg-slate-950 text-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Matter</DialogTitle>
                <DialogDescription className="text-white/65">
                  Enter details for the new legal matter.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Matter Name *</Label>
                  <Input id="name" placeholder="e.g., Acme Corp Acquisition" {...register("name")} className="focus-saffron" />
                  {errors.name ? <p className="text-sm text-red-300">{errors.name.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input id="clientName" placeholder="e.g., Acme Corporation" {...register("clientName")} className="focus-saffron" />
                  {errors.clientName ? <p className="text-sm text-red-300">{errors.clientName.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" placeholder="Brief description of the matter" {...register("description")} className="focus-saffron" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="practiceArea">Practice Area</Label>
                    <select
                      id="practiceArea"
                      className="focus-saffron h-10 w-full rounded-md border border-white/20 bg-slate-900/75 px-3 text-sm outline-none"
                      {...register("practiceArea")}
                    >
                      <option value="">Select...</option>
                      {practiceAreas.map((area) => (
                        <option key={area} value={area} className="bg-slate-900">
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <select
                      id="jurisdiction"
                      className="focus-saffron h-10 w-full rounded-md border border-white/20 bg-slate-900/75 px-3 text-sm outline-none"
                      {...register("jurisdiction")}
                    >
                      <option value="">Select...</option>
                      {INDIAN_STATES.map((state) => (
                        <option key={state.code} value={state.code} className="bg-slate-900">
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-white/25 text-white/75">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Matter"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(matterPendingDeletion)}
            onOpenChange={(open) => {
              if (!open) {
                setMatterPendingDeletion(null);
              }
            }}
          >
            <DialogContent className="glass border-white/20 bg-slate-950 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Matter</DialogTitle>
                <DialogDescription className="text-white/65">
                  This action cannot be undone. The selected matter and its references will be removed.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {matterPendingDeletion ? `Matter: ${matterPendingDeletion.name}` : "No matter selected"}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="border-white/25 text-white/75" onClick={() => setMatterPendingDeletion(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-500 text-white hover:bg-red-600"
                  disabled={deleteMutation.isPending}
                  onClick={confirmDeleteMatter}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Matter"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              placeholder="Search matters..."
              className="focus-saffron pl-9 pr-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {isFetching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-saffron-300" /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button type="button"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  statusFilter === status
                    ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-300"
                    : "border-white/20 text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="capitalize">{status === "all" ? "All" : status.replaceAll("_", " ")}</span>
                <span className="ml-1 inline-block min-w-4 text-center">
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        ) : mattersData?.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {mattersData.data.map((matter, index) => (
                <motion.div
                  key={matter.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass group cursor-pointer transition hover:border-saffron-500/35 hover:bg-white/7">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => router.push(`/matters/${matter.id}`)}
                        >
                          <CardTitle className="line-clamp-2 text-lg group-hover:text-saffron-300">
                            {matter.matterName}
                          </CardTitle>
                          <CardDescription className="text-white/65">{matter.clientName}</CardDescription>
                        </button>
                        <div className="shrink-0">
                          <HealthMiniDonut value={matter.healthScore ?? 0} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent onClick={() => router.push(`/matters/${matter.id}`)}>
                      <div className="mb-3 flex items-center gap-2">
                        <Badge
                          className={
                            matter.status === "open"
                              ? "border-green-500/35 bg-green-500/15 text-green-300"
                              : matter.status === "closed"
                              ? "border-white/25 bg-white/10 text-white/75"
                              : "border-yellow-500/35 bg-yellow-500/15 text-yellow-300"
                          }
                        >
                          {matter.status}
                        </Badge>
                        {matter.matterType ? (
                          <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/60">
                            {matter.matterType}
                          </span>
                        ) : null}
                      </div>
                      {matter.notes ? <p className="line-clamp-2 text-sm text-white/65">{matter.notes}</p> : null}
                      <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/50">
                        <div className="flex items-center justify-between">
                          <span>Created {formatDate(matter.createdAt)}</span>
                          <button type="button"
                            className="rounded-md p-1 text-red-300 transition hover:bg-red-500/10"
                            aria-label="Delete matter"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMatterPendingDeletion({ id: matter.id, name: matter.matterName });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="glass py-12">
            <CardContent className="text-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.5, ease: "easeInOut" }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
              >
                <Gavel className="h-7 w-7 text-saffron-300" />
              </motion.div>
              <h3 className="text-lg font-medium">No matters found</h3>
              <p className="mt-1 text-white/60">
                {searchQuery ? "No matters match your search criteria." : "Create your first matter to get started."}
              </p>
              {!searchQuery ? (
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Matter
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
