"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Download,
  Eye,
  FileText,
  Shield,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiDisclaimer } from "@/components/shared/AiDisclaimer";
import { BrandLogo } from "@/components/india/BrandLogo";

interface SharedMatter {
  id: string;
  name: string;
  description: string;
  clientName: string;
  status: string;
  createdAt: string;
  documents: SharedDocument[];
  clauses?: SharedClause[];
  flags?: SharedFlag[];
  expiresAt: string;
  permissions: {
    viewDocuments: boolean;
    downloadDocuments: boolean;
    viewClauses: boolean;
    viewFlags: boolean;
  };
}

interface SharedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface SharedClause {
  id: string;
  type: string;
  text: string;
  documentName: string;
}

interface SharedFlag {
  id: string;
  type: string;
  severity: string;
  description: string;
  documentName: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeUntilExpiry(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  return `${hours} hour${hours === 1 ? "" : "s"} left`;
}

export default function PortalPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matter, setMatter] = useState<SharedMatter | null>(null);
  const [activeSection, setActiveSection] = useState<"documents" | "clauses" | "flags">("documents");

  useEffect(() => {
    async function fetchSharedMatter() {
      try {
        const response = await fetch(`${API_BASE}/api/portal/${shareToken}`);
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error?.message || "Invalid or expired link");
        }
        const result = await response.json();
        setMatter(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared content");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSharedMatter();
  }, [shareToken]);

  const expiryLabel = useMemo(
    () => (matter?.expiresAt ? timeUntilExpiry(matter.expiresAt) : ""),
    [matter?.expiresAt]
  );

  const handleDownload = async (documentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/portal/${shareToken}/documents/${documentId}/download`);
      if (!response.ok) throw new Error("Download failed");

      const result = await response.json();
      const downloadUrl = result?.data?.downloadUrl as string | undefined;
      if (!downloadUrl) throw new Error("Download URL not available");

      const fileResponse = await fetch(downloadUrl);
      if (!fileResponse.ok) throw new Error("Signed download failed");

      const blob = await fileResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const doc = matter?.documents.find((item) => item.id === documentId);
      anchor.download = (result?.data?.fileName as string | undefined) || doc?.name || "document";
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center">
          <Clock className="mx-auto h-8 w-8 animate-spin text-saffron-300" />
          <p className="mt-3 text-sm text-white/65">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <Card className="glass w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
              <AlertTriangle className="h-6 w-6 text-amber-300" />
            </div>
            <CardTitle className="text-2xl">Link not available</CardTitle>
            <CardDescription className="text-white/65">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-white/60">
            This shared link may have expired or been revoked.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/12 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" priority />
            <div>
              <span className="text-xl font-semibold">EvidentIS</span>
              <div className="text-xs text-white/55">Secure Client Portal</div>
            </div>
            <Badge className="ml-2 border-white/20 bg-white/10 text-white/75">
              <Shield className="mr-1 h-3 w-3" />
              Secure Portal
            </Badge>
          </div>
          {matter?.expiresAt ? (
            <div className="text-sm text-white/70">
              Expires: {formatDate(matter.expiresAt)} · <span className="text-saffron-300">{expiryLabel}</span>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-semibold">{matter?.name}</h1>
            {matter?.description ? <p className="mt-2 text-white/65">{matter.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-white/50" />
                <span className="text-white/50">Client:</span>
                <span>{matter?.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/50" />
                <span className="text-white/50">Created:</span>
                <span>{matter?.createdAt ? formatDate(matter.createdAt) : "N/A"}</span>
              </div>
              <Badge variant={matter?.status === "active" ? "default" : "secondary"}>{matter?.status}</Badge>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/12 pb-2">
            {matter?.permissions.viewDocuments ? (
              <button type="button"
                onClick={() => setActiveSection("documents")}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeSection === "documents"
                    ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-300"
                    : "border-white/20 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileText className="mr-2 inline h-4 w-4" />
                Documents ({matter.documents.length})
              </button>
            ) : null}
            {matter?.permissions.viewClauses && matter.clauses ? (
              <button type="button"
                onClick={() => setActiveSection("clauses")}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeSection === "clauses"
                    ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-300"
                    : "border-white/20 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Eye className="mr-2 inline h-4 w-4" />
                Clauses ({matter.clauses.length})
              </button>
            ) : null}
            {matter?.permissions.viewFlags && matter.flags ? (
              <button type="button"
                onClick={() => setActiveSection("flags")}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeSection === "flags"
                    ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-300"
                    : "border-white/20 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                Flags ({matter.flags.length})
              </button>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {activeSection === "documents" ? (
              <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="space-y-3">
                  {matter?.documents.length === 0 ? (
                    <Card className="glass">
                      <CardContent className="py-12 text-center text-white/60">No documents shared.</CardContent>
                    </Card>
                  ) : (
                    matter?.documents.map((doc) => (
                      <Card key={doc.id} className="glass">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                              <FileText className="h-5 w-5 text-saffron-300" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-white/60">
                                {formatBytes(doc.size)} • Uploaded {formatDate(doc.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          {matter.permissions.downloadDocuments ? (
                            <Button onClick={() => handleDownload(doc.id)} className="btn-ripple">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </motion.div>
            ) : null}

            {activeSection === "clauses" ? (
              <motion.div key="clauses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AiDisclaimer variant="compact" />
                <div className="mt-3 space-y-3">
                  {matter?.clauses?.map((clause) => (
                    <Card key={clause.id} className="glass">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="outline">{clause.type}</Badge>
                          <span className="text-xs text-white/50">From: {clause.documentName}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-white/80">{clause.text}</CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {activeSection === "flags" ? (
              <motion.div key="flags" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AiDisclaimer variant="compact" />
                <div className="mt-3 space-y-3">
                  {matter?.flags?.map((flag) => (
                    <Card key={flag.id} className="glass">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                flag.severity === "critical"
                                  ? "border-red-500/35 bg-red-500/15 text-red-200"
                                  : flag.severity === "high"
                                  ? "border-yellow-500/35 bg-yellow-500/15 text-yellow-200"
                                  : "border-blue-500/35 bg-blue-500/15 text-blue-200"
                              }
                            >
                              {flag.severity}
                            </Badge>
                            <span className="font-medium">{flag.type}</span>
                          </div>
                          <span className="text-xs text-white/50">From: {flag.documentName}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-white/80">{flag.description}</CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </main>

      <footer className="border-t border-white/12 py-5 text-sm text-white/55">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
          <p>This content is shared securely via EvidentIS. Access is logged and monitored.</p>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Powered by EvidentIS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
