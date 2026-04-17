"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Loader2, Search, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/india/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nyayAssistPrompts } from "@/lib/india";
import { research } from "@/lib/api";
import { AiFeedbackButton } from "@/components/shared/AiFeedbackButton";
import { useTranslation } from "react-i18next";

type Citation = {
  id: string;
  source: string;
  excerpt: string;
};

const relatedActs = [
  "Negotiable Instruments Act",
  "Limitation Act",
  "Code of Criminal Procedure",
  "Bharatiya Nagarik Suraksha Sanhita",
];

export default function ResearchPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [resultAnswer, setResultAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [openCitations, setOpenCitations] = useState<Record<string, boolean>>({});
  const [hasSearched, setHasSearched] = useState(false);

  const runQuery = async () => {
    if (!query.trim() || isThinking) return;

    setIsThinking(true);
    setSubmittedQuery(query.trim());
    setHasSearched(true);
    setResultAnswer("");
    setCitations([]);

    try {
      const result = await research.query({
        query: query.trim(),
      });

      setResultAnswer(result.answer);

      // Map citations from API response
      if (result.citations?.length) {
        setCitations(
          result.citations.map((c, i) => ({
            id: `c-${i}`,
            source: c.source,
            excerpt: c.text,
          }))
        );
      }
    } catch (err) {
      console.error("Research error:", err);
      setResultAnswer(
        "Unable to process your query right now. Please check your connection and try again."
      );
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AppShell title={t("research")}>
      <div className="section-wrap page-enter">
        <section className="glass p-6">
          <div className="section-header">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-saffron-300">
                {t("res_subtitle")}
              </p>
              <h2 className="mt-2 section-title">
                {t("res_headline")}
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
                placeholder={t("res_placeholder")}
                aria-label="Research query input"
                disabled={isThinking}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runQuery();
                }}
              />
            </div>
            <Button onClick={runQuery} disabled={isThinking || !query.trim()}>
              {isThinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("res_thinking")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("res_runResearch")}
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {nyayAssistPrompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10 hover:border-saffron-500/25"
                onClick={() => setQuery(prompt)}
                aria-label={`Use prompt: ${prompt}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        {/* Empty state — shown before any search */}
        {!hasSearched && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 text-center"
          >
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron-500/10 border border-saffron-500/20"
              >
                <BookOpen className="h-8 w-8 text-saffron-400" />
              </motion.div>
            </div>
            <h3 className="text-lg font-semibold text-white/85">{t("res_startTitle")}</h3>
            <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
              {t("res_startDesc")}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 max-w-lg mx-auto">
              {[
                "What is the limitation period for cheque bounce?",
                "Explain Section 138 NI Act",
                "Latest RERA compliance duties",
                "Draft legal notice under Section 80 CPC",
              ].map((example) => (
                <button
                  type="button"
                  key={example}
                  onClick={() => {
                    setQuery(example);
                    // Focus the input
                  }}
                  className="group rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs text-white/65 transition-all hover:bg-white/10 hover:border-saffron-500/20 hover:text-white/85"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-saffron-500/40 group-hover:text-saffron-400 transition-colors" />
                    {example}
                  </span>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Results section — shown after search */}
        {hasSearched && (
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
                  <span className="text-sm">{t("res_analyzing")}</span>
                  {[0, 0.15, 0.3].map((delay) => (
                    <motion.span
                      key={`thinking-dot-${delay}`}
                      className="h-2 w-2 rounded-full bg-saffron-400"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Number.POSITIVE_INFINITY, delay, duration: 0.7 }}
                    />
                  ))}
                </motion.div>
              ) : resultAnswer ? (
                <motion.div
                  key="answer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 space-y-4"
                >
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{resultAnswer}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">{t("disclaimer")}</p>
                    <AiFeedbackButton
                      resultId={submittedQuery}
                      taskType="research"
                      compact
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Source citations */}
            {citations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">{t("res_sourceCitations")}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {citations.map((citation) => {
                    const open = Boolean(openCitations[citation.id]);
                    return (
                      <button
                        type="button"
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
                  {citations.map((citation) =>
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
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">{t("res_relatedActs")}</h3>
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
        )}
      </div>
    </AppShell>
  );
}
