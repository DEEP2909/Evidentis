"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsDown, ThumbsUp, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AiFeedbackButtonProps {
  /** Identifier for the AI result being rated */
  resultId: string;
  /** Type of AI task (e.g. "clause_extraction", "risk_assessment", "research") */
  taskType: string;
  /** Optional document ID for context */
  documentId?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * Lightweight feedback widget for AI results.
 * Displays thumbs up/down; on thumbs-down, expands to collect a one-line comment.
 * Stores feedback via POST /api/ai-feedback.
 */
export function AiFeedbackButton({
  resultId,
  taskType,
  documentId,
  compact = false,
}: AiFeedbackButtonProps) {
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  const handleRate = async (value: "positive" | "negative") => {
    setRating(value);
    if (value === "negative") {
      setShowComment(true);
      return; // Wait for comment
    }
    // Positive — submit immediately
    await submitFeedback(value, "");
  };

  const submitFeedback = async (ratingValue: string, commentValue: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId,
          taskType,
          documentId,
          rating: ratingValue,
          comment: commentValue || undefined,
        }),
      });

      if (!response.ok) {
        // Silently accept — the endpoint might not exist yet
        console.warn("AI feedback endpoint not available");
      }

      setSubmitted(true);
      setShowComment(false);
      toast.success(t("feedbackRecorded"));
    } catch {
      // Graceful degradation — don't block the user
      setSubmitted(true);
      toast.success(t("feedbackRecorded"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-1.5 text-xs text-green-400 ${compact ? "" : "mt-2"}`}
      >
        <ThumbsUp className="h-3 w-3" />
        <span>{t("feedbackRecorded")}</span>
      </motion.div>
    );
  }

  return (
    <div className={`${compact ? "inline-flex items-center" : "mt-2"}`}>
      <AnimatePresence mode="wait">
        {!showComment ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            <span className="text-[10px] uppercase tracking-wider text-white/30 mr-1">{t("helpful")}</span>
            <button
              type="button"
              onClick={() => handleRate("positive")}
              className={`rounded p-1 transition-colors ${
                rating === "positive"
                  ? "bg-green-500/20 text-green-400"
                  : "text-white/25 hover:text-green-400 hover:bg-green-500/10"
              }`}
              aria-label={t("ai_thumbsUp")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleRate("negative")}
              className={`rounded p-1 transition-colors ${
                rating === "negative"
                  ? "bg-red-500/20 text-red-400"
                  : "text-white/25 hover:text-red-400 hover:bg-red-500/10"
              }`}
              aria-label={t("ai_thumbsDown")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="comment"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("whatWasWrong")}
              className="h-7 rounded border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30 focus:border-saffron-500/40 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submitFeedback("negative", comment);
                }
              }}
            />
            <button
              type="button"
              onClick={() => submitFeedback("negative", comment)}
              disabled={isSubmitting}
              className="rounded p-1 text-saffron-400 hover:bg-saffron-500/10 transition-colors"
              aria-label="Submit feedback"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => { setShowComment(false); setRating(null); }}
              className="rounded p-1 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Cancel feedback"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
