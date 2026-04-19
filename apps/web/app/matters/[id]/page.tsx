"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  ArrowLeft,
  FileText,
  Flag,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  ChevronRight,
  Eye,
  Download,
  Trash2,
  BookOpen,
  Scale,
  RefreshCw,
  BarChart3,
  History,
  ChevronDown,
  Sparkles,
  ThumbsDown,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { matters, documents, clauses, flags, obligations, research } from "@/lib/api";
import { useCapabilities } from "@/lib/use-capabilities";
import { formatDate, getRiskColor, CLAUSE_TYPE_LABELS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiDisclaimer, AiGeneratedContent } from "@/components/shared/AiDisclaimer";
import { useTranslation } from "react-i18next";

type TabType = "documents" | "clauses" | "flags" | "obligations" | "research" | "timeline" | "analytics";

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const caps = useCapabilities();
  const matterId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>("documents");
  const [isUploading, setIsUploading] = useState(false);
  const { t } = useTranslation();

  // Fetch matter details
  const { data: matter, isLoading: matterLoading } = useQuery({
    queryKey: ["matter", matterId],
    queryFn: () => matters.get(matterId),
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ["matter", matterId, "analytics"],
    queryFn: () => matters.getAnalytics(matterId),
  });

  // Fetch documents
  const { data: documentsData } = useQuery({
    queryKey: ["matter", matterId, "documents"],
    queryFn: () => documents.list(matterId),
    enabled: activeTab === "documents",
  });

  // Fetch clauses
  const { data: clausesData } = useQuery({
    queryKey: ["matter", matterId, "clauses"],
    queryFn: () => clauses.list(matterId),
    enabled: activeTab === "clauses",
  });

  // Fetch flags
  const { data: flagsData } = useQuery({
    queryKey: ["matter", matterId, "flags"],
    queryFn: () => flags.list(matterId),
    enabled: activeTab === "flags",
  });

  // Fetch obligations
  const { data: obligationsData } = useQuery({
    queryKey: ["matter", matterId, "obligations"],
    queryFn: () => obligations.list(matterId),
    enabled: activeTab === "obligations",
  });

  // Fetch timeline data (real obligations with deadlines)
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["matter", matterId, "timeline"],
    queryFn: () => obligations.timeline(matterId),
    enabled: activeTab === "timeline",
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => documents.upload(matterId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter", matterId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["matter", matterId, "analytics"] });
      toast.success("Document uploaded successfully. AI analysis started.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    },
  });

  // Flag status mutation
  const flagMutation = useMutation({
    mutationFn: ({ flagId, status }: { flagId: string; status: "accepted" | "rejected" | "deferred" }) =>
      flags.updateStatus(matterId, flagId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter", matterId, "flags"] });
      toast.success("Flag updated");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => matters.delete(matterId),
    onSuccess: () => {
      toast.success("Matter archived");
      void queryClient.invalidateQueries({ queryKey: ["matters"] });
      router.push("/matters");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to archive matter");
    },
  });

  const handleShareMatter = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Matter link copied to clipboard");
    } catch {
      toast.error("Unable to copy link right now");
    }
  };

  const handleRunAiAnalysis = () => {
    if (!matter) return;
    const seedPrompt = `Summarize the key risks, obligations, and next steps for ${matter.matterName}.`;
    router.push(`/nyay-assist?matterId=${matterId}&q=${encodeURIComponent(seedPrompt)}`);
  };

  const handleArchiveMatter = () => {
    if (!window.confirm("Archive this matter? It will be removed from active worklists but preserved for audit and reporting.")) {
      return;
    }
    archiveMutation.mutate();
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const url = await documents.downloadUrl(matterId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export document");
    }
  };

  // Dropzone
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      try {
        for (const file of acceptedFiles) {
          await uploadMutation.mutateAsync(file);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  if (matterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("mat_noMatters")}</h2>
          <Button asChild>
            <Link href="/matters">{t("back")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tabsBase: { id: TabType; label: string; icon: typeof FileText }[] = [
    { id: "documents", label: t("mat_tab_documents"), icon: FileText },
    { id: "clauses", label: t("mat_tab_clauses"), icon: BookOpen },
    { id: "flags", label: t("mat_tab_flags"), icon: Flag },
    { id: "obligations", label: t("mat_tab_obligations"), icon: Calendar },
    { id: "research", label: t("mat_tab_research"), icon: Search },
    { id: "timeline", label: t("mat_tab_timeline"), icon: History },
    { id: "analytics", label: t("mat_tab_analytics"), icon: BarChart3 },
  ];
  const tabs: { id: TabType; label: string; icon: typeof FileText }[] = tabsBase.filter((tab) =>
    tab.id === "research" ? caps.canAccessResearch : true
  );

  const totalDocuments = analytics?.totalDocuments ?? 0;
  const totalClauses = analytics?.totalClauses ?? 0;
  const processingQueue = analytics?.processingQueue ?? 0;
  const processedDocuments = Math.max(totalDocuments - processingQueue, 0);
  const flagsByRisk = analytics?.flagsByRisk ?? {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/matters">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{matter.matterName}</h1>
                <Badge variant={matter.status === "open" ? "active" : "secondary"}>
                  {matter.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {matter.clientName}
                {matter.governingLawState && ` • ${matter.governingLawState}`}
                {matter.matterType && ` • ${matter.matterType}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {caps.canShareMatter ? (
                <Button variant="outline" onClick={handleShareMatter}>
                  Share Matter
                </Button>
              ) : null}
              {caps.canRunAIAnalysis ? (
                <Button variant="gold" onClick={handleRunAiAnalysis}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run AI Analysis
                </Button>
              ) : null}
              {caps.canArchiveMatter ? (
                <Button variant="outline" className="border-red-500/35 text-red-300" onClick={handleArchiveMatter} disabled={archiveMutation.isPending}>
                  {archiveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Archiving...
                    </>
                  ) : (
                    "Archive Matter"
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{totalDocuments}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{totalClauses}</p>
              <p className="text-xs text-muted-foreground">Clauses</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-500">
                  {flagsByRisk.critical + flagsByRisk.high}
                </span>
                <span className="text-lg text-muted-foreground">/</span>
                <span className="text-lg text-muted-foreground">
                  {Object.values(flagsByRisk).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Critical/High Flags</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{processingQueue}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b">
            {tabs.map((tab) => (
              <button type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {caps.canUploadDocuments ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p>Uploading and analyzing...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="font-medium">
                      {isDragActive ? "Drop files here" : "Drag & drop documents here"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse (PDF, DOCX up to 50MB)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  You can review documents on this matter, but uploads are restricted for your role.
                </CardContent>
              </Card>
            )}

            {/* Documents List */}
            <div className="space-y-3">
              {documentsData?.data?.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.sourceName}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {doc.pageCount ? `${doc.pageCount} page(s)` : doc.docType}
                      </span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.ingestionStatus === "normalized"
                        ? "completed"
                        : doc.ingestionStatus === "processing" ||
                            doc.ingestionStatus === "scanning"
                        ? "processing"
                        : doc.ingestionStatus === "failed"
                        ? "failed"
                        : "pending"
                    }
                  >
                    {doc.ingestionStatus === "normalized" && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {(doc.ingestionStatus === "processing" ||
                      doc.ingestionStatus === "scanning") && (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {doc.ingestionStatus}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTab("clauses")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {caps.canExportDocuments ? (
                      <Button variant="ghost" size="icon" onClick={() => void handleDownloadDocument(doc.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </motion.div>
              ))}
              {!documentsData?.data?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents yet. Upload your first document above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clauses Tab */}
        {activeTab === "clauses" && (
          <div className="space-y-4">
            <AiDisclaimer variant="default" className="mb-4" />
            {clausesData?.data?.map((clause) => (
              <Card key={clause.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge>{CLAUSE_TYPE_LABELS[clause.clauseType] || clause.clauseType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Confidence: {Math.round(clause.confidence * 100)}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <AiGeneratedContent disclaimerVariant="compact">
                    <p className="text-sm whitespace-pre-wrap">{clause.textExcerpt}</p>
                  </AiGeneratedContent>
                </CardContent>
              </Card>
            ))}
            {!clausesData?.data?.length && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No clauses extracted yet. Upload documents to analyze.</p>
              </div>
            )}
          </div>
        )}

        {/* Flags Tab — sorted by severity, color-coded, low/medium collapsed */}
        {activeTab === "flags" && (
          <FlagsTabContent flagsData={flagsData} flagMutation={flagMutation} />
        )}

        {/* Obligations Tab */}
        {activeTab === "obligations" && (
          <div className="space-y-4">
            {obligationsData?.data?.map((obligation) => (
              <Card key={obligation.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{obligation.obligationType}</Badge>
                        <Badge variant="outline">{obligation.party}</Badge>
                      </div>
                      <p className="font-medium">{obligation.description}</p>
                      {(obligation.deadlineDate || obligation.deadlineText) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Deadline:{" "}
                          {obligation.deadlineDate
                            ? formatDate(obligation.deadlineDate)
                            : obligation.deadlineText}
                        </p>
                      )}
                    </div>
                    <Badge variant={obligation.status === "completed" ? "completed" : "pending"}>
                      {obligation.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!obligationsData?.data?.length && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No obligations extracted yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Research Tab — wired to API */}
        {activeTab === "research" && caps.canAccessResearch && (
          <ResearchTabContent matterId={matterId} />
        )}

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matter Timeline</CardTitle>
                <CardDescription>
                  Chronological view of obligations and deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timelineLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Matter created entry */}
                    <div className="flex gap-4 items-start border-l-2 border-primary pl-4">
                      <div className="flex-1">
                        <p className="font-medium">Matter created</p>
                        <p className="text-sm text-muted-foreground">
                          {matter.createdAt ? formatDate(matter.createdAt) : "Date not available"}
                        </p>
                      </div>
                    </div>

                    {/* Documents uploaded summary */}
                    {totalDocuments > 0 && (
                      <div className="flex gap-4 items-start border-l-2 border-blue-500 pl-4">
                        <div className="flex-1">
                          <p className="font-medium">{totalDocuments} document(s) uploaded</p>
                          <p className="text-sm text-muted-foreground">
                            {processedDocuments} processed
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Risk flags summary */}
                    {(flagsByRisk.critical > 0 || flagsByRisk.high > 0) && (
                      <div className="flex gap-4 items-start border-l-2 border-red-500 pl-4">
                        <div className="flex-1">
                          <p className="font-medium">Risk flags identified</p>
                          <p className="text-sm text-muted-foreground">
                            {flagsByRisk.critical} critical, {flagsByRisk.high} high priority
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Obligations from timeline API */}
                    {timelineData?.obligations?.map((obligation) => (
                      <div 
                        key={obligation.id} 
                        className={`flex gap-4 items-start border-l-2 pl-4 ${
                          obligation.status === 'overdue' ? 'border-red-500' :
                          obligation.status === 'completed' ? 'border-green-500' :
                          'border-yellow-500'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{obligation.description}</p>
                            <Badge variant={
                              obligation.status === 'overdue' ? 'destructive' :
                              obligation.status === 'completed' ? 'secondary' :
                              'outline'
                            }>
                              {obligation.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {obligation.deadlineDate 
                              ? `Due: ${formatDate(obligation.deadlineDate)}` 
                              : obligation.deadlineText || 'No deadline set'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Party: {obligation.party}
                          </p>
                          <AiDisclaimer variant="inline" className="mt-2" />
                        </div>
                      </div>
                    ))}

                    {/* Empty state */}
                    {!timelineData?.obligations?.length && totalDocuments === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No timeline events yet. Upload documents to get started.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDocuments}</div>
                  <p className="text-xs text-muted-foreground">
                    {processedDocuments} processed
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Clauses Extracted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalClauses}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all documents
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Open Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {flagsByRisk.critical + flagsByRisk.high + flagsByRisk.medium + flagsByRisk.low}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {flagsByRisk.critical} critical
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{processingQueue}</div>
                  <p className="text-xs text-muted-foreground">
                    Documents pending
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>
                  Breakdown of identified risks by severity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="w-20 text-sm">Critical</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full" 
                        style={{ width: `${Math.min(100, flagsByRisk.critical * 10)}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-right">{flagsByRisk.critical}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="w-20 text-sm">High</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full" 
                        style={{ width: `${Math.min(100, flagsByRisk.high * 10)}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-right">{flagsByRisk.high}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-20 text-sm">Medium</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ width: `${Math.min(100, flagsByRisk.medium * 10)}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-right">{flagsByRisk.medium}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="w-20 text-sm">Low</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ width: `${Math.min(100, flagsByRisk.low * 10)}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-right">{flagsByRisk.low}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Flags Tab with severity sort + color + collapse ── */
const SEVERITY_ORDER: Record<string, number> = { critical: 0, warn: 1, info: 2 };
const SEVERITY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  critical: { border: "border-red-500/40", bg: "bg-red-500/10", text: "text-red-300" },
  warn:     { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-300" },
  info:     { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-300" },
};

function FlagsTabContent({ flagsData, flagMutation }: { flagsData: any; flagMutation: any }) {
  const [showLowMedium, setShowLowMedium] = useState(false);

  const sortedFlags = useMemo(() => {
    if (!flagsData?.data) return [];
    return [...flagsData.data].sort(
      (a: any, b: any) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
    );
  }, [flagsData]);

  const criticalHighFlags = sortedFlags.filter((f: any) => f.severity === "critical");
  const otherFlags = sortedFlags.filter((f: any) => f.severity !== "critical");

  const renderFlag = (flag: any) => {
    const colors = SEVERITY_COLORS[flag.severity] ?? SEVERITY_COLORS.info;
    return (
      <Card key={flag.id} className={`${colors.border} border`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className="h-3 w-3 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: getRiskColor(flag.severity === "critical" ? "critical" : flag.severity === "warn" ? "medium" : "low") }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${colors.bg} ${colors.text} ${colors.border}`}>
                  {flag.severity === "critical" ? "Critical" : flag.severity === "warn" ? "Warning" : "Info"}
                </Badge>
                <span className="text-sm text-muted-foreground">{flag.flagType}</span>
              </div>
              <p className="font-medium">{flag.reason}</p>
              {flag.recommendedFix && (
                <AiGeneratedContent disclaimerVariant="inline" className="mt-2">
                  <p className="text-sm text-muted-foreground">Suggestion: {flag.recommendedFix}</p>
                </AiGeneratedContent>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => flagMutation.mutate({ flagId: flag.id, status: "accepted" })}>Accept</Button>
              <Button variant="outline" size="sm" onClick={() => flagMutation.mutate({ flagId: flag.id, status: "rejected" })}>Reject</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <AiDisclaimer variant="default" className="mb-4" />

      {/* Critical/High flags — always visible */}
      {criticalHighFlags.map(renderFlag)}

      {/* Low/Medium — collapsed by default */}
      {otherFlags.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowLowMedium(!showLowMedium)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showLowMedium ? "rotate-180" : ""}`} />
            {showLowMedium ? "Hide" : "Show"} {otherFlags.length} lower-priority flag{otherFlags.length !== 1 ? "s" : ""}
          </button>
          <AnimatePresence>
            {showLowMedium && otherFlags.map(renderFlag)}
          </AnimatePresence>
        </>
      )}

      {!flagsData?.data?.length && (
        <div className="text-center py-12 text-muted-foreground">
          <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No flags generated yet.</p>
        </div>
      )}
    </div>
  );
}

/* ── Research Tab — wired to real API ── */
function ResearchTabContent({ matterId }: { matterId: string }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isResearching, setIsResearching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isResearching) return;

    setIsResearching(true);
    setAnswer("");

    try {
      const result = await research.query({
        query: query.trim(),
        matterId,
      });
      setAnswer(result.answer);
    } catch (err) {
      console.error("Research error:", err);
      setAnswer("Unable to process your research query right now. Please try again.");
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Legal Research
        </CardTitle>
        <CardDescription>
          Ask questions about this matter&apos;s documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="e.g., What are the termination conditions?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isResearching}
          />
          <Button type="submit" variant="gold" disabled={isResearching || !query.trim()}>
            {isResearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Research
              </>
            )}
          </Button>
        </form>

        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border bg-muted/30 p-4"
          >
            <AiGeneratedContent disclaimerVariant="compact">
              <p className="text-sm whitespace-pre-wrap">{answer}</p>
            </AiGeneratedContent>
          </motion.div>
        )}

        <AiDisclaimer variant="compact" className="mt-4" />
      </CardContent>
    </Card>
  );
}
