"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface AiDisclaimerProps {
  className?: string;
  variant?: "default" | "compact" | "inline";
}

/**
 * AI Disclaimer Component
 *
 * AI-assisted legal output must be clearly labeled for licensed advocate review
 * before it is relied on in client-facing or court-facing workflows.
 */
export function AiDisclaimer({ className, variant = "default" }: AiDisclaimerProps) {
  const { t } = useTranslation();

  if (variant === "inline") {
    return (
      <span className={cn("text-xs text-amber-600 dark:text-amber-400", className)}>
        <AlertTriangle className="inline h-3 w-3 mr-1" />
        {t("disclaimer")}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <p className={cn(
        "text-xs text-muted-foreground border-l-2 border-amber-400 pl-2 py-0.5",
        className
      )}>
        {t("disclaimer")}
      </p>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
      className
    )}>
      <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}

/**
 * Wrapper component for AI-generated content
 * Automatically adds disclaimer below the content
 */
export function AiGeneratedContent({
  children,
  className,
  disclaimerVariant = "compact"
}: {
  children: React.ReactNode;
  className?: string;
  disclaimerVariant?: "default" | "compact" | "inline";
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
      <AiDisclaimer variant={disclaimerVariant} />
    </div>
  );
}
