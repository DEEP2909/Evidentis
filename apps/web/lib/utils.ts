import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date for India locale display
 */
export function formatIndianDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get risk level color
 */
export function getRiskColor(level: string): string {
  switch (level) {
    case "critical":
      return "#DC2626";
    case "high":
      return "#EA580C";
    case "medium":
      return "#D97706";
    case "low":
      return "#16A34A";
    default:
      return "#6B7280";
  }
}

/**
 * Get risk level badge class
 */
export function getRiskBadgeClass(level: string): string {
  switch (level) {
    case "critical":
      return "risk-critical";
    case "high":
      return "risk-high";
    case "medium":
      return "risk-medium";
    case "low":
      return "risk-low";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Indian states and union territories list
 */
export const INDIAN_STATES = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
  { code: "DL", name: "Delhi (NCT)" },
  { code: "JK", name: "Jammu & Kashmir (UT)" },
  { code: "LA", name: "Ladakh (UT)" },
  { code: "CH", name: "Chandigarh (UT)" },
  { code: "PY", name: "Puducherry (UT)" },
  { code: "AN", name: "Andaman & Nicobar (UT)" },
  { code: "DH", name: "Dadra & Nagar Haveli and Daman & Diu (UT)" },
  { code: "LD", name: "Lakshadweep (UT)" },
] as const;

// Backward-compatible alias while imports migrate.
export const US_STATES = INDIAN_STATES;

/**
 * Clause type display names
 */
export const CLAUSE_TYPE_LABELS: Record<string, string> = {
  indemnity: "Indemnity",
  limitation_of_liability: "Limitation of Liability",
  termination_for_convenience: "Termination for Convenience",
  termination_for_cause: "Termination for Cause",
  confidentiality_nda: "Confidentiality / NDA",
  governing_law: "Governing Law",
  arbitration: "Arbitration",
  jurisdiction: "Jurisdiction",
  force_majeure: "Force Majeure",
  assignment: "Assignment",
  notice_requirements: "Notice Requirements",
  entire_agreement: "Entire Agreement",
  dpdp_privacy: "DPDP Privacy",
  gst_tax: "GST and Tax",
  stamp_duty: "Stamp Duty",
  insurance: "Insurance",
  compliance_with_laws: "Compliance with Laws",
  labour_code_compliance: "Labour Code Compliance",
  rera_compliance: "RERA Compliance",
  consumer_protection: "Consumer Protection",
};
