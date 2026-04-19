"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, Send, Sparkles, Upload, Loader2 } from "lucide-react";

import { AppShell } from "@/components/india/AppShell";
import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nyayAssistPrompts } from "@/lib/india";
import { documents, matters, research, QuotaError } from "@/lib/api";
import { useCapabilities } from "@/lib/use-capabilities";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import { AiFeedbackButton } from "@/components/shared/AiFeedbackButton";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

type UploadedReference = {
  id: string;
  sourceName: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function NyayAssistPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const caps = useCapabilities();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadMatterId, setUploadMatterId] = useState<string | null>(null);
  const [uploadedReferences, setUploadedReferences] = useState<UploadedReference[]>([]);
  const [hiddenPrompts, setHiddenPrompts] = useState<Record<string, boolean>>({});
  const [showUpgrade, setShowUpgrade] = useState<{ feature: string; detail?: string } | null>(null);

  // Set greeting in the user's selected language (runs once + on language change)
  useEffect(() => {
    if (messages.length === 0 || (messages.length === 1 && messages[0].id === "seed-1")) {
      setMessages([{ id: "seed-1", role: "assistant", content: t("nyay_greeting") }]);
    }
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePrompts = useMemo(
    () => nyayAssistPrompts.filter((prompt) => !hiddenPrompts[prompt]),
    [hiddenPrompts]
  );

  const getScopedMatterId = () => {
    if (uploadMatterId && UUID_PATTERN.test(uploadMatterId)) {
      return uploadMatterId;
    }
    const fromQuery = searchParams.get("matterId");
    if (fromQuery && UUID_PATTERN.test(fromQuery)) {
      return fromQuery;
    }
    return null;
  };

  const ensureUploadMatterId = async (): Promise<string> => {
    const scoped = getScopedMatterId();
    if (scoped) {
      setUploadMatterId(scoped);
      return scoped;
    }

    const existing = await matters.list({ page: 1, limit: 1 });
    const firstMatterId = existing.data[0]?.id;
    if (firstMatterId) {
      setUploadMatterId(firstMatterId);
      return firstMatterId;
    }

    const created = await matters.create({
      name: "Nyay Assist Upload Workspace",
      clientName: "Internal Assistant",
      description: "System-generated matter for Nyay Assist document uploads.",
      practiceArea: "regulatory compliance",
      jurisdiction: "DL",
    });
    setUploadMatterId(created.id);
    return created.id;
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || isTyping || isUploadingFiles) {
      return;
    }

    setIsUploadingFiles(true);
    try {
      const matterId = await ensureUploadMatterId();
      const uploaded: UploadedReference[] = [];

      for (const file of files) {
        const doc = await documents.upload(matterId, file);
        uploaded.push({ id: doc.id, sourceName: doc.sourceName || file.name });
      }

      setUploadedReferences((prev) => {
        const unique = new Map(prev.map((item) => [item.id, item]));
        for (const item of uploaded) unique.set(item.id, item);
        return Array.from(unique.values());
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-upload-${Date.now()}`,
          role: "assistant",
          content:
            `Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}: ` +
            `${uploaded.map((item) => item.sourceName).join(", ")}. ` +
            "Processing has started; ask your question now and answers will improve as extraction completes.",
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-upload-error-${Date.now()}`,
          role: "assistant",
          content: `Unable to upload attachment(s): ${errorMessage}`,
        },
      ]);
    } finally {
      setIsUploadingFiles(false);
      event.target.value = "";
    }
  };

  // Pre-fill from query param (from dashboard quick research buttons)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && messages.length === 1) {
      setDraft(q);
      // Auto-submit after a short delay
      const timeout = window.setTimeout(() => sendMessage(q), 400);
      return () => window.clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (value?: string) => {
    const next = (value ?? draft).trim();
    if (!next || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: next,
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsTyping(true);

    const assistantId = `assistant-${Date.now()}`;

    try {
      // Stream from the real research API
      const stream = await research.stream({
        query: next,
        matterId: getScopedMatterId(),
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        
        // Parse SSE format: chunks delimited by \n\n
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? ""; // keep the last incomplete chunk in buffer

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const token =
                  parsed?.message?.content ??
                  parsed?.response ??
                  parsed?.token ??
                  parsed?.content ??
                  parsed?.text ??
                  "";
                if (token) {
                  accumulated += token;
                  const currentContent = accumulated;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: currentContent }
                        : msg
                    )
                  );
                }
              } catch {
                // Plain text token fallback
                if (data.trim() && !data.includes("{")) {
                  accumulated += data;
                  const currentContent = accumulated;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: currentContent }
                        : msg
                    )
                  );
                }
              }
            } else if (line.trim() && !line.startsWith(":")) {
              // Non-SSE plain text
              if (!line.includes("{")) {
                accumulated += line;
                const currentContent = accumulated;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: currentContent }
                      : msg
                  )
                );
              }
            }
          }
        }
      }

      // Finalize streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (error) {
      if (error instanceof QuotaError) {
        setShowUpgrade({ feature: error.feature, detail: error.detail });
        setIsTyping(false);
        return;
      }
      console.error("Research API error:", error);
      // Fallback: show error message
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === assistantId);
        if (existing) {
          return prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    "I'm unable to reach the research service right now. Please check your connection and try again.",
                  isStreaming: false,
                }
              : msg
          );
        }
        return [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content:
              "I'm unable to reach the research service right now. Please check your connection and try again.",
          },
        ];
      });
    } finally {
      setIsTyping(false);
    }
  };

  if (!caps.canAccessNyayAssist) {
    return (
      <AppShell title={t("assistant")}>
        <div className="glass mx-auto mt-6 max-w-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold text-white/90">Nyay Assist is not enabled for your role</h2>
          <p className="mt-3 text-sm text-white/60">
            This workspace is reserved for advocate roles that can run AI-assisted legal analysis. You can continue working from the matter and document views.
          </p>
          <Button className="mt-5" onClick={() => window.location.assign("/matters")}>
            Go to Matters
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("assistant")}>
      {showUpgrade && (
        <UpgradePrompt
          feature={showUpgrade.feature}
          detail={showUpgrade.detail}
          onDismiss={() => setShowUpgrade(null)}
        />
      )}
      <div className="grid gap-8 py-4 xl:grid-cols-[0.86fr_1.14fr]">
        <section className="glass p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-saffron-300">{t("nyay_suggestedPrompts")}</p>
          <div className="mt-4 space-y-2">
            <AnimatePresence>
              {visiblePrompts.map((prompt, index) => (
                <motion.button
                  key={prompt}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ delay: index * 0.04 }}
                  className="w-full rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/12 hover:text-white"
                  onClick={() => {
                    setHiddenPrompts((prev) => ({ ...prev, [prompt]: true }));
                    sendMessage(prompt);
                  }}
                >
                  {prompt}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </section>

        <section className="glass flex min-h-[640px] flex-col p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/12 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-saffron-300" />
              <h2 className="text-xl font-semibold">Nyay Assist</h2>
              <Badge className="border-white/20 bg-white/10 text-white/75">{t("nyay_aiPowered")}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || isUploadingFiles || !caps.canUploadDocuments}
                className="rounded-lg border border-white/15 bg-white/6 p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={isUploadingFiles ? "Uploading attachment" : "Attach files"}
              >
                {isUploadingFiles ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                onChange={handleFileSelection}
              />
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      message.role === "user"
                        ? "bg-saffron-500 text-slate-900"
                        : "border border-white/15 bg-white/8 text-white/85"
                    }`}
                  >
                    <span className="whitespace-pre-wrap">{message.content}</span>
                    {message.isStreaming && (
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="ml-0.5 inline-block h-4 w-[2px] bg-saffron-400 align-middle"
                      />
                    )}
                    {message.role === "assistant" && !message.isStreaming && message.content && message.id !== "seed-1" && (
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <AiFeedbackButton
                          resultId={message.id}
                          taskType="nyay_assist"
                          compact
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 0.15, 0.3].map((delay) => (
                      <motion.div
                        key={`typing-dot-${delay}`}
                        className="h-2 w-2 rounded-full bg-saffron-400"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Number.POSITIVE_INFINITY, delay, duration: 0.7 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-4 border-t border-white/12 pt-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-white/55">
              <Upload className="h-3.5 w-3.5" />
              {isUploadingFiles
                ? t("nyay_uploadingAttachments")
                : t("nyay_attachmentSupport")}
            </div>
            {uploadedReferences.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {uploadedReferences.map((item) => (
                  <Badge
                    key={item.id}
                    className="border-white/20 bg-white/10 text-[11px] text-white/80"
                  >
                    {item.sourceName}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("nyay_placeholder")}
                className="focus-saffron"
                aria-label="Nyay assist input"
                disabled={isTyping || isUploadingFiles}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={() => sendMessage()}
                aria-label="Send message"
                disabled={isTyping || isUploadingFiles}
              >
                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
