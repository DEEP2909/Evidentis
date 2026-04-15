"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nyayAssistPrompts } from "@/lib/india";
import { useTranslation } from "react-i18next";

type Citation = {
  id: string;
  source: string;
  excerpt: string;
};

const citationSeed: readonly Citation[] = [
  {
    id: "c1",
    source: "Negotiable Instruments Act, Section 138",
    excerpt: "Complaint must be filed within one month from date on which cause of action arises.",
  },
  {
    id: "c2",
    source: "MSR Leathers v. S. Palaniappan (2013) 1 SCC 177",
    excerpt: "Successive presentations of cheque permissible, limitation runs from valid cause of action.",
  },
  {
    id: "c3",
    source: "Limitation Act, Article 142",
    excerpt: "Limitation computation may vary by complaint trigger and delay condonation context.",
  },
];

const relatedActs = [
  "Negotiable Instruments Act",
  "Limitation Act",
  "Code of Criminal Procedure",
  "Bharatiya Nagarik Suraksha Sanhita",
];

export default function ResearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("What is the limitation period for cheque bounce complaints and what documents should be attached?");
  const [isThinking, setIsThinking] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [openCitations, setOpenCitations] = useState<Record<string, boolean>>({});

  const resultAnswer = useMemo(
    () =>
      "For Section 138 cheque bounce complaints, the payee must issue statutory notice within 30 days of dishonour memo, allow 15 days for payment, and file complaint within one month of cause-of-action. Attach cheque copy, bank return memo, notice, proof of dispatch/service, and authorization records.",
    []
  );

  const runQuery = () => {
    if (!query.trim()) return;
    setIsThinking(true);
    setSubmittedQuery(query.trim());
    window.setTimeout(() => setIsThinking(false), 1100);
  };

  return (
    <AppShell title={t("research")}>
      <div className="section-wrap page-enter">
        <section className="glass p-6">
          <div className="section-header">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-saffron-300">
                IndiaKanoon + Bare Acts + Matter Memory
              </p>
              <h2 className="mt-2 section-title">
                Research with Indian sections, judgments, and multilingual answers.
              </h2>
            </div>
            <Badge className="border-white/25 bg-white/10 text-white/75">
              <Command className="mr-1 h-3 w-3" />
              Shortcut: Cmd/Ctrl + K
            </Badge>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="focus-saffron pl-9"
                placeholder="Ask a legal research question..."
                aria-label="Research query input"
              />
            </div>
            <Button onClick={runQuery}>
              {isThinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Research
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {nyayAssistPrompts.map((prompt) => (
              <button type="button"
                key={prompt}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10"
                onClick={() => setQuery(prompt)}
                aria-label={`Use prompt: ${prompt}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="glass p-6">
          <p className="text-sm text-white/55">Query</p>
          <p className="mt-1 text-lg text-white/90">{submittedQuery}</p>

          <AnimatePresence mode="wait">
            {isThinking ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-2 text-saffron-300"
              >
                <span className="text-sm">Analyzing sources</span>
                {[0, 0.15, 0.3].map((delay) => (
                  <motion.span
                    key={`thinking-dot-${delay}`}
                    className="h-2 w-2 rounded-full bg-saffron-400"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, delay, duration: 0.7 }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="answer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 space-y-4"
              >
                <p className="text-sm text-white/80">{resultAnswer}</p>
                <p className="text-sm text-white/60">{t("disclaimer")}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Source citations</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {citationSeed.map((citation) => {
                const open = Boolean(openCitations[citation.id]);
                return (
                  <button type="button"
                    key={citation.id}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      open
                        ? "border-saffron-500/40 bg-saffron-500/15 text-saffron-300"
                        : "border-white/20 bg-white/5 text-white/75 hover:bg-white/10"
                    }`}
                    onClick={() =>
                      setOpenCitations((prev) => ({
                        ...prev,
                        [citation.id]: !prev[citation.id],
                      }))
                    }
                    aria-label={`Toggle citation ${citation.source}`}
                  >
                    {citation.source}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 space-y-2">
              {citationSeed.map((citation) =>
                openCitations[citation.id] ? (
                  <motion.div
                    key={citation.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-white/75"
                  >
                    <p className="font-medium text-white/90">{citation.source}</p>
                    <p className="mt-1 text-white/65">{citation.excerpt}</p>
                  </motion.div>
                ) : null
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Related acts</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {relatedActs.map((act) => (
                <Link
                  key={act}
                  href="/bare-acts"
                  className="rounded-full border border-saffron-500/30 bg-saffron-500/10 px-3 py-1.5 text-xs text-saffron-200 transition hover:bg-saffron-500/20"
                >
                  {act}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
