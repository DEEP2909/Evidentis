"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, X, Zap } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface UpgradePromptProps {
  /** What triggered the quota error */
  feature: string;
  /** Optional detail message from API */
  detail?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * Contextual upgrade modal shown when a 402 quota error is caught.
 * Appears as a sleek overlay prompt with a direct link to the billing page.
 */
export function UpgradePrompt({ feature, detail, onDismiss }: UpgradePromptProps) {
  const [visible, setVisible] = useState(true);
  const { t } = useTranslation();

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative mx-4 max-w-md w-full rounded-2xl border border-white/10 bg-[#0c1829] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3 right-3 rounded p-1 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-saffron-500/15">
              <Zap className="h-6 w-6 text-saffron-400" />
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-white">{t("upgrade_title")}</h3>
            <p className="mt-2 text-sm text-white/60">
              {t("upgrade_desc")}
              {detail && <span className="block mt-1 text-white/45">{detail}</span>}
            </p>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="/admin/billing"
                className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-saffron-400"
              >
                {t("upgrade_cta")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition-colors"
              >
                {t("close")}
              </button>
            </div>

            {/* Trust note */}
            <p className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/25">
              <AlertTriangle className="h-3 w-3" />
              Secure billing via Razorpay
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

