import { CORE_INDIAN_ACTS, LEGAL_TEMPLATE_LIBRARY } from "@evidentis/shared";

export const dashboardHighlights = [
  { label: "Open matters", value: "128", note: "Across Supreme Court, High Courts, tribunals, and district courts" },
  { label: "Hearings this week", value: "23", note: "Auto-synced from eCourts and matter timelines" },
  { label: "Bare act sections indexed", value: "54K+", note: "Multilingual search and section explanations" },
  { label: "DPDP alerts", value: "4", note: "Consent, retention, and grievance workflow gaps" },
];

export const hearingCalendar = [
  { date: "Mon 14", title: "Section 138 complaint", court: "Delhi District Court", urgency: "high" },
  { date: "Tue 15", title: "RERA appeal", court: "MahaRERA Tribunal", urgency: "medium" },
  { date: "Thu 17", title: "IBC admission matter", court: "NCLT Mumbai", urgency: "high" },
  { date: "Fri 18", title: "Consumer forum hearing", court: "NCDRC", urgency: "low" },
];

export const featuredActs = CORE_INDIAN_ACTS.slice(0, 8);
export const featuredTemplates = LEGAL_TEMPLATE_LIBRARY.slice(0, 6);

export const nyayAssistPrompts = [
  "Explain Section 138 NI Act in Hindi",
  "Summarize the latest RERA compliance duties for Maharashtra",
  "Draft a legal notice under Section 80 CPC",
  "Map IPC provisions to BNS replacements",
];

export const privacyChecklist = [
  "Consent capture recorded with IP and version",
  "Data principal correction and erasure workflow",
  "Data localisation pinned to India region",
  "72-hour breach notification playbook",
];
