"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Grid,
  List,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { QuotaError, documents as apiDocuments, matters } from "@/lib/api";
import { useCapabilities } from "@/lib/use-capabilities";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import { AiFeedbackButton } from "@/components/shared/AiFeedbackButton";
import { useTranslation } from "react-i18next";

type ViewMode = "grid" | "list";
type DisplayStatus = "processing" | "processed" | "failed";
type StatusFilter = "all" | DisplayStatus;

const STATUS_FILTERS: readonly StatusFilter[] = ["all", "processed", "processing", "failed"];

function normalizeDocumentStatus(status: string): DisplayStatus {
  if (status === "normalized") return "processed";
  if (status === "failed") return "failed";
  return "processing";
}

function formatDate(value: Date): string {
  return value.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadge(status: DisplayStatus) {
  if (status === "processed") {
    return (
      <Badge className="border-green-500/35 bg-green-500/15 text-green-300">
        <CheckCircle className="mr-1 h-3 w-3" />
        processed
      </Badge>
    );
  }
  if (status === "processing") {
    return (
      <Badge className="border-blue-500/35 bg-blue-500/15 text-blue-300">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        processing
      </Badge>
    );
  }
  return (
    <Badge className="border-red-500/35 bg-red-500/15 text-red-300">
      <AlertTriangle className="mr-1 h-3 w-3" />
      failed
    </Badge>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const caps = useCapabilities();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMatterId, setSelectedMatterId] = useState("");
  const isDebouncing = searchQuery !== debouncedQuery;
  const { t } = useTranslation();
  const [showUpgrade, setShowUpgrade] = useState<{ feature: string; detail?: string } | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 280);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const { data: mattersData } = useQuery({
    queryKey: ["matters", "document-upload-targets"],
    queryFn: () => matters.list({ page: 1, limit: 100 }),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!selectedMatterId && mattersData?.data?.length) {
      setSelectedMatterId(mattersData.data[0].id);
    }
  }, [mattersData, selectedMatterId]);

  const { data: documentsPage, isLoading, isFetching } = useQuery({
    queryKey: ["documents", "tenant", { search: debouncedQuery, status: statusFilter }],
    queryFn: () =>
      apiDocuments.listAll({
        search: debouncedQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: 1,
        limit: 100,
      }),
    staleTime: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedMatterId) {
        throw new Error("Create or select a matter before uploading documents.");
      }
      return apiDocuments.upload(selectedMatterId, file);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents", "tenant"] }),
        queryClient.invalidateQueries({ queryKey: ["matters", "document-upload-targets"] }),
      ]);
      toast.success("Document uploaded successfully. AI analysis started.");
    },
    onError: (error) => {
      if (error instanceof QuotaError) {
        setShowUpgrade({ feature: "Document Uploads", detail: error.detail });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ matterId, documentId }: { matterId: string; documentId: string }) =>
      apiDocuments.delete(matterId, documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents", "tenant"] });
      toast.success("Document deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete document");
    },
  });

  const uploadFiles = async (files: File[]) => {
    if (!caps.canUploadDocuments) return;
    if (!selectedMatterId) {
      toast.error("Select a matter before uploading documents.");
      return;
    }

    for (const file of files) {
      await uploadMutation.mutateAsync(file);
    }
  };

  const handleDownload = async (matterId: string, documentId: string) => {
    try {
      const downloadUrl = await apiDocuments.downloadUrl(matterId, documentId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export document");
    }
  };

  const documentRows = useMemo(
    () =>
      (documentsPage?.data ?? []).map((doc) => ({
        ...doc,
        displayStatus: normalizeDocumentStatus(doc.ingestionStatus),
      })),
    [documentsPage]
  );

  const hasMatterTargets = Boolean(mattersData?.data?.length);

  return (
    <AppShell title={t("nav_documents")}>
      {showUpgrade && (
        <UpgradePrompt
          feature={showUpgrade.feature}
          detail={showUpgrade.detail}
          onDismiss={() => setShowUpgrade(null)}
        />
      )}
      <div className="section-wrap page-enter">
        <div className="section-header">
          <div>
            <h2 className="section-title">{t("doc_title")}</h2>
            <p className="section-subtitle">{t("doc_subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {caps.canUploadDocuments ? (
              <>
                <select
                  value={selectedMatterId}
                  onChange={(event) => setSelectedMatterId(event.target.value)}
                  className="h-10 rounded-md border border-white/20 bg-slate-900/75 px-3 text-sm text-white/80 outline-none"
                >
                  <option value="">{hasMatterTargets ? "Select matter" : "No matters available"}</option>
                  {(mattersData?.data ?? []).map((matter) => (
                    <option key={matter.id} value={matter.id}>
                      {matter.matterName}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <input
                    id="documents-upload-input"
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && void uploadFiles(Array.from(e.target.files))}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    title=""
                    disabled={!selectedMatterId || uploadMutation.isPending}
                  />
                  <Button className="btn-ripple" disabled={!selectedMatterId || uploadMutation.isPending}>
                    {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploadMutation.isPending ? t("nyay_uploadingAttachments") : t("doc_uploadDocuments")}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {caps.canUploadDocuments ? (
          <Card
            className={`glass border-2 border-dashed transition-all duration-300 relative ${
              isDragging ? "border-saffron-400 bg-saffron-500/12 scale-[1.01]" : "border-white/20 hover:border-white/30 hover:bg-white/[0.02]"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files?.length) {
                void uploadFiles(Array.from(event.dataTransfer.files));
              }
            }}
          >
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && void uploadFiles(Array.from(e.target.files))}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
              title=""
              disabled={!selectedMatterId || uploadMutation.isPending}
            />
            <CardContent className="py-12 text-center pointer-events-none relative z-0">
              <div className={`mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${isDragging || uploadMutation.isPending ? "bg-saffron-500/18 text-saffron-300 shadow-[0_0_24px_rgba(94,106,210,0.2)]" : "bg-white/5 text-white/40"}`}>
                {uploadMutation.isPending ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className={`h-7 w-7 ${isDragging ? "animate-bounce" : ""}`} />}
              </div>
              <p className="font-serif text-2xl font-light text-white/90">{isDragging ? t("doc_dropHere") : t("doc_dragDrop")}</p>
              <p className="mt-2 text-sm text-white/40 tracking-wider uppercase">
                {selectedMatterId ? (t("doc_uploadLimit") || t("doc_fileTypes")) : "Select a matter first"}
              </p>
              {uploadMutation.isPending && (
                <div className="mt-6 mx-auto max-w-sm">
                  <Progress value={undefined} className="h-1 bg-white/10" />
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {!hasMatterTargets && caps.canUploadDocuments ? (
          <Card className="glass border-white/15 bg-black/20">
            <CardContent className="p-4 text-sm text-white/65">
              Uploads need an existing matter. {caps.canCreateMatter ? "Create a matter first, then upload directly into that workspace." : "Ask a senior team member to create a matter first."}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              placeholder={t("doc_searchDocs")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="focus-saffron pl-9"
            />
            {isDebouncing || isFetching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-saffron-400" /> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  statusFilter === filter
                    ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-300"
                    : "border-white/20 text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                {filter === "all" ? "All" : filter}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-white/15 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-2 ${viewMode === "list" ? "bg-saffron-500 text-slate-900" : "text-white/60"}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-2 ${viewMode === "grid" ? "bg-saffron-500 text-slate-900" : "text-white/60"}`}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass py-16 text-center"
            >
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-saffron-400" />
              <p className="text-sm text-white/55">Loading tenant documents...</p>
            </motion.div>
          ) : documentRows.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass py-16 text-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-saffron-500/20 bg-saffron-500/10"
              >
                <FileText className="h-8 w-8 text-saffron-400" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white/85">
                {debouncedQuery ? t("doc_emptyNoMatch") : t("doc_emptyTitle")}
              </h3>
              <p className="mt-2 mx-auto max-w-sm text-sm text-white/50">
                {debouncedQuery ? t("doc_emptyNoMatchDesc") : t("doc_emptyDesc")}
              </p>
              {!debouncedQuery && caps.canUploadDocuments && hasMatterTargets ? (
                <Button className="btn-ripple mt-5" onClick={() => document.getElementById("documents-upload-input")?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("doc_uploadDocuments")}
                </Button>
              ) : null}
            </motion.div>
          ) : viewMode === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card className="glass overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.14em] text-white/45">
                        <th className="px-4 py-3">{t("doc_document")}</th>
                        <th className="px-4 py-3">{t("doc_matter")}</th>
                        <th className="px-4 py-3">{t("doc_status")}</th>
                        <th className="px-4 py-3">{t("doc_analysis")}</th>
                        <th className="px-4 py-3">{t("doc_uploaded")}</th>
                        <th className="px-4 py-3 text-right">{t("doc_actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentRows.map((doc) => (
                        <tr key={doc.id} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-white/10 p-2">
                                <FileText className="h-5 w-5 text-saffron-300" />
                              </div>
                              <div>
                                <p className="font-medium">{doc.sourceName}</p>
                                <p className="text-xs text-white/55">
                                  {doc.docType} • {doc.pageCount ? `${doc.pageCount} pages` : "page count pending"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/75">{doc.matterName ?? "Matter"}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              {statusBadge(doc.displayStatus)}
                              {doc.displayStatus === "processing" ? (
                                <div className="w-36">
                                  <Progress value={undefined} className="h-1.5 bg-white/15 [&>div]:shimmer-loading [&>div]:bg-saffron-400" />
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {doc.displayStatus === "processed" ? (
                              <div className="space-y-2 text-xs text-white/65">
                                <div className="flex items-center gap-2">
                                  <Badge className="border-green-500/35 bg-green-500/15 text-green-300">AI ready</Badge>
                                  {caps.canRunAIAnalysis ? (
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/matters/${doc.matterId}`)}>
                                      Review
                                    </Button>
                                  ) : null}
                                </div>
                                <AiFeedbackButton
                                  resultId={doc.id}
                                  taskType="clause_extraction"
                                  documentId={doc.id}
                                  compact
                                />
                              </div>
                            ) : (
                              <span className="text-white/45">
                                {doc.displayStatus === "failed" ? "Re-upload required" : "Extraction in progress"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white/75">{formatDate(doc.createdAt)}</p>
                            <p className="text-xs text-white/45">{doc.matterName ?? "Matter workspace"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" aria-label="Open matter" onClick={() => router.push(`/matters/${doc.matterId}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {caps.canExportDocuments ? (
                                <Button variant="ghost" size="icon" aria-label="Download document" onClick={() => void handleDownload(doc.matterId, doc.id)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              ) : null}
                              {caps.canDeleteDocuments ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete document"
                                  onClick={() => {
                                    if (window.confirm(`Delete ${doc.sourceName}? This removes the document and its derived analysis.`)) {
                                      deleteMutation.mutate({ matterId: doc.matterId, documentId: doc.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-300" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {documentRows.map((doc) => (
                <Card key={doc.id} className="glass transition hover:border-saffron-500/40">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="rounded-lg bg-white/10 p-3">
                        <FileText className="h-7 w-7 text-saffron-300" />
                      </div>
                      {statusBadge(doc.displayStatus)}
                    </div>
                    <h3 className="line-clamp-2 font-medium">{doc.sourceName}</h3>
                    <p className="mt-1 text-sm text-white/60">{doc.matterName ?? "Matter workspace"}</p>
                    {doc.displayStatus === "processing" ? (
                      <div className="mt-3">
                        <Progress value={undefined} className="h-1.5 bg-white/15 [&>div]:shimmer-loading [&>div]:bg-saffron-400" />
                      </div>
                    ) : null}
                    <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">
                      <p>{formatDate(doc.createdAt)}</p>
                      <p>{doc.pageCount ? `${doc.pageCount} pages` : "Page count pending"}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/matters/${doc.matterId}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                      <div className="flex items-center gap-1">
                        {caps.canExportDocuments ? (
                          <Button variant="ghost" size="icon" onClick={() => void handleDownload(doc.matterId, doc.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {caps.canDeleteDocuments ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(`Delete ${doc.sourceName}? This removes the document and its derived analysis.`)) {
                                deleteMutation.mutate({ matterId: doc.matterId, documentId: doc.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-300" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
