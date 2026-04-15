"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Filter,
  Grid,
  List,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type DocumentStatus = "processing" | "processed" | "failed";

interface DocumentRow {
  id: string;
  name: string;
  type: string;
  matter: string;
  status: DocumentStatus;
  uploadedAt: string;
  uploadedBy: string;
  pages: number;
  clauses: number;
  flags: number;
  progress: number;
}

const documents: readonly DocumentRow[] = [
  {
    id: "1",
    name: "Master Services Agreement - Acme Corp.pdf",
    type: "MSA",
    matter: "Acme Corp Acquisition",
    status: "processed",
    uploadedAt: "2 hours ago",
    uploadedBy: "John D.",
    pages: 24,
    clauses: 18,
    flags: 2,
    progress: 100,
  },
  {
    id: "2",
    name: "NDA - TechStart Inc.pdf",
    type: "NDA",
    matter: "TechStart Series B",
    status: "processed",
    uploadedAt: "5 hours ago",
    uploadedBy: "Sarah M.",
    pages: 8,
    clauses: 12,
    flags: 0,
    progress: 100,
  },
  {
    id: "3",
    name: "Employment Agreement Draft.docx",
    type: "Employment",
    matter: "HR Restructure",
    status: "processing",
    uploadedAt: "10 min ago",
    uploadedBy: "Emily C.",
    pages: 15,
    clauses: 0,
    flags: 0,
    progress: 62,
  },
  {
    id: "4",
    name: "Vendor Contract - Global Services.pdf",
    type: "Vendor",
    matter: "Global Services RFP",
    status: "failed",
    uploadedAt: "1 day ago",
    uploadedBy: "Mike R.",
    pages: 32,
    clauses: 0,
    flags: 0,
    progress: 37,
  },
];

function statusBadge(status: DocumentStatus) {
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const isDebouncing = searchQuery !== debouncedQuery;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 280);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const filteredDocuments = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((doc) =>
      [doc.name, doc.type, doc.matter, doc.uploadedBy].join(" ").toLowerCase().includes(query)
    );
  }, [debouncedQuery]);

  return (
    <AppShell title="Documents">
      <div className="section-wrap page-enter">
        <div className="section-header">
          <div>
            <h2 className="section-title">Document Intelligence Workspace</h2>
            <p className="section-subtitle">Manage uploads, AI extraction progress, and clause insights.</p>
          </div>
          <Button className="btn-ripple">
            <Upload className="mr-2 h-4 w-4" />
            Upload Documents
          </Button>
        </div>

        <Card
          className={`glass border-2 border-dashed transition ${
            isDragging ? "border-saffron-500 bg-saffron-500/10" : "border-white/20"
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
          }}
        >
          <CardContent className="py-8 text-center">
            <div className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full ${isDragging ? "bg-saffron-500/20 text-saffron-400" : "bg-white/10 text-white/65"}`}>
              <Upload className={`h-6 w-6 ${isDragging ? "animate-bounce" : "animate-pulse"}`} />
            </div>
            <p className="text-lg font-medium">{isDragging ? "Drop files here" : "Drag and drop files to upload"}</p>
            <p className="mt-1 text-sm text-white/55">Supports PDF, DOCX, DOC • Max 50MB per file</p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="focus-saffron pl-9"
            />
            {isDebouncing ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-saffron-400" /> : null}
          </div>

          <Button variant="outline" className="border-white/25 text-white/75">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>

          <div className="flex rounded-lg border border-white/15 bg-white/5 p-1">
            <button type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-2 ${viewMode === "list" ? "bg-saffron-500 text-slate-900" : "text-white/60"}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-2 ${viewMode === "grid" ? "bg-saffron-500 text-slate-900" : "text-white/60"}`}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
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
                        <th className="px-4 py-3">Document</th>
                        <th className="px-4 py-3">Matter</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Analysis</th>
                        <th className="px-4 py-3">Uploaded</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-white/10 p-2">
                                <FileText className="h-5 w-5 text-saffron-300" />
                              </div>
                              <div>
                                <p className="font-medium">{doc.name}</p>
                                <p className="text-xs text-white/55">
                                  {doc.type} • {doc.pages} pages
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/75">{doc.matter}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              {statusBadge(doc.status)}
                              {doc.status === "processing" ? (
                                <div className="w-36">
                                  <Progress value={doc.progress} className="h-1.5 bg-white/15 [&>div]:shimmer-loading [&>div]:bg-saffron-400" />
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {doc.status === "processed" ? (
                              <div className="space-y-1 text-xs text-white/65">
                                <p>{doc.clauses} clauses</p>
                                {doc.flags > 0 ? (
                                  <Badge className="border-amber-500/35 bg-amber-500/15 text-amber-300">{doc.flags} flags</Badge>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-white/45">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white/75">{doc.uploadedAt}</p>
                            <p className="text-xs text-white/45">by {doc.uploadedBy}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" aria-label="View document">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="Download document">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="Delete document">
                                <Trash2 className="h-4 w-4 text-red-300" />
                              </Button>
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
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="glass transition hover:border-saffron-500/40">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="rounded-lg bg-white/10 p-3">
                        <FileText className="h-7 w-7 text-saffron-300" />
                      </div>
                      {statusBadge(doc.status)}
                    </div>
                    <h3 className="line-clamp-2 font-medium">{doc.name}</h3>
                    <p className="mt-1 text-sm text-white/60">{doc.matter}</p>
                    {doc.status === "processing" ? (
                      <div className="mt-3">
                        <Progress value={doc.progress} className="h-1.5 bg-white/15 [&>div]:shimmer-loading [&>div]:bg-saffron-400" />
                      </div>
                    ) : null}
                    <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">
                      <p>{doc.uploadedAt}</p>
                      {doc.status === "processed" ? <p>{doc.clauses} clauses analyzed</p> : null}
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
