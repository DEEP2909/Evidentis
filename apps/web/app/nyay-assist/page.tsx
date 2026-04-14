"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, Send, Sparkles, Upload } from "lucide-react";

import { AppShell } from "@/components/india/AppShell";
import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nyayAssistPrompts } from "@/lib/india";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function NyayAssistPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "seed-1",
      role: "assistant",
      content:
        "Namaste. I can help with Indian legal research, clause drafting, and case-law references. Ask in your preferred language.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hiddenPrompts, setHiddenPrompts] = useState<Record<string, boolean>>({});

  const visiblePrompts = useMemo(
    () => nyayAssistPrompts.filter((prompt) => !hiddenPrompts[prompt]),
    [hiddenPrompts]
  );

  const sendMessage = (value?: string) => {
    const next = (value ?? draft).trim();
    if (!next) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: next,
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsTyping(true);

    window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Draft response prepared with citations to relevant statutes and recent precedents. Please review and adapt before filing.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1100);
  };

  return (
    <AppShell title={t("assistant")}>
      <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
        <section className="glass p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-saffron-300">Suggested prompts</p>
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
              <Badge className="border-white/20 bg-white/10 text-white/75">File-ready mode</Badge>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                className="rounded-lg border border-white/15 bg-white/6 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Attachments available"
              >
                <Paperclip className="h-4 w-4" />
              </button>
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
                    {message.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 0.15, 0.3].map((delay, index) => (
                      <motion.div
                        key={index}
                        className="h-2 w-2 rounded-full bg-saffron-400"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Number.POSITIVE_INFINITY, delay, duration: 0.7 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>

          <div className="mt-4 border-t border-white/12 pt-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-white/55">
              <Upload className="h-3.5 w-3.5" />
              Attachment support enabled for pleadings and evidence bundles
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask in any Indian language..."
                className="focus-saffron"
                aria-label="Nyay assist input"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={() => sendMessage()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
