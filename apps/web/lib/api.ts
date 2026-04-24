/**
 * EvidentIS API Client
 * Type-safe API client with automatic token refresh
 */

import type {
  Attorney,
  Matter,
  Document,
  Clause,
  Flag,
  Obligation,
  Playbook,
  LoginResponse,
  PaginatedResponse,
  RiskLevel,
  SupportedLanguageCode,
} from "@evidentis/shared";
import {
  ADVOCATE_ROLES,
  ATTORNEY_STATUSES,
  MATTER_TYPES,
  MATTER_STATUSES,
  PRIORITIES,
  DOC_TYPES,
  INGESTION_STATUSES,
  SECURITY_STATUSES,
  SUPPORTED_LANGUAGE_CODES,
  RISK_LEVELS,
  REVIEW_STATUSES,
  FLAG_STATUSES,
  OBLIGATION_STATUSES,
  INDIAN_STATE_CODES,
} from "@evidentis/shared";

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

// Token storage
let accessToken: string | null = null;

/**
 * Set tokens after login
 */
export function setTokens(access: string, refresh?: string | null): void {
  accessToken = access;
  // Store in localStorage for persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("evidentis_access_token", access);
    if (refresh !== undefined) {
      if (refresh) {
        localStorage.setItem("evidentis_refresh_token", refresh);
      } else {
        localStorage.removeItem("evidentis_refresh_token");
      }
    }
  }
}

/**
 * Load tokens from localStorage
 */
export function loadTokens(): void {
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem("evidentis_access_token");
  }
}

/**
 * Clear tokens on logout
 */
export function clearTokens(): void {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("evidentis_access_token");
    localStorage.removeItem("evidentis_refresh_token");
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Quota/billing error (HTTP 402)
 */
export class QuotaError extends Error {
  public feature: string;
  public detail?: string;

  constructor(feature: string, detail?: string) {
    super(`Quota limit reached for ${feature}`);
    this.name = "QuotaError";
    this.feature = feature;
    this.detail = detail;
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | Record<string, unknown>
        | null;
      const data =
        payload &&
        typeof payload === "object" &&
        "success" in payload &&
        "data" in payload
          ? (payload.data as Record<string, unknown> | undefined)
          : payload;
      const nextAccess =
        data && typeof data.accessToken === "string" ? data.accessToken : null;
      if (nextAccess) {
        setTokens(nextAccess);
        return true;
      }
    }
  } catch {
    // Refresh failed
  }

  clearTokens();
  return false;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  loadTokens();
  const { headers: _ignoredHeaders, ...requestOptions } = options ?? {};

  const headers: Record<string, string> = {};
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [key, value] of options.headers) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, options.headers);
    }
  }

  if (body !== undefined && !("Content-Type" in headers)) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: requestOptions.credentials ?? "include",
    ...requestOptions,
  });

  // Token expired - try refresh
  if (
    response.status === 401 &&
    accessToken &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`;
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: requestOptions.credentials ?? "include",
        ...requestOptions,
      });
    }
  }

  if (!response.ok) {
    const errorPayload = (await response
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    const errorObject =
      errorPayload &&
      typeof errorPayload === "object" &&
      "error" in errorPayload &&
      typeof errorPayload.error === "object" &&
      errorPayload.error !== null
        ? (errorPayload.error as Record<string, unknown>)
        : errorPayload ?? {};

    // Detect 402 Quota/Billing errors
    if (response.status === 402) {
      const quotaFeature = String(errorObject.feature ?? errorObject.resource ?? "this feature");
      const quotaDetail = errorObject.detail ? String(errorObject.detail) : undefined;
      throw new QuotaError(quotaFeature, quotaDetail);
    }

    throw new ApiError(
      response.status,
      String(errorObject.code ?? "ERROR"),
      String(errorObject.message ?? "Request failed")
    );
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const payload = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "success" in (payload as Record<string, unknown>)
    ) {
      const envelope = payload as {
        success: boolean;
        data?: T;
        error?: { code?: string; message?: string };
      };
      if (!envelope.success) {
        throw new ApiError(
          response.status,
          envelope.error?.code || "ERROR",
          envelope.error?.message || "Request failed"
        );
      }
      return (envelope.data ?? ({} as T)) as T;
    }
    return payload as T;
  }

  return {} as T;
}

type PaginationShape = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function defaultPagination(page = 1, limit = 20): PaginationShape {
  return { page, limit, total: 0, totalPages: 0 };
}

function parseDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function parseDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function asNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : { raw: value };
    } catch {
      return { raw: value };
    }
  }
  return null;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function asStateCode(value: unknown): Matter["governingLawState"] {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return INDIAN_STATE_CODES.includes(normalized as (typeof INDIAN_STATE_CODES)[number])
    ? (normalized as Matter["governingLawState"])
    : null;
}

function normalizeFlagSeverity(value: unknown): Flag["severity"] {
  if (typeof value !== "string") return "warn";
  const normalized = value.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "warn" || normalized === "high" || normalized === "medium") return "warn";
  return "info";
}

function normalizeFlagStatus(value: unknown): Flag["status"] {
  if (value === "accepted") return "approved";
  if (value === "deferred") return "waived";
  return asEnum(value, FLAG_STATUSES, "open");
}

function normalizeObligationStatus(value: unknown): Obligation["status"] {
  if (value === "pending" || value === "in_progress") {
    return "active";
  }
  return asEnum(value, OBLIGATION_STATUSES, "active");
}

function mapAttorney(raw: Record<string, unknown>): Attorney {
  const normalizedRole = raw.role === "attorney" ? "advocate" : raw.role;
  const normalizedState = asStateCode(
    raw.bar_council_state ?? raw.barCouncilState ?? raw.bar_state ?? raw.barState
  );
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    email: String(raw.email ?? ""),
    displayName: String(raw.display_name ?? raw.displayName ?? ""),
    role: asEnum(normalizedRole, ADVOCATE_ROLES, "advocate"),
    practiceGroup:
      (raw.practice_group as string | null) ?? (raw.practiceGroup as string | null) ?? null,
    barCouncilEnrollmentNumber:
      (raw.bar_council_enrollment_number as string | null) ??
      (raw.barCouncilEnrollmentNumber as string | null) ??
      null,
    barNumber: (raw.bar_number as string | null) ?? (raw.barNumber as string | null) ?? null,
    barCouncilState: normalizedState,
    barState: normalizedState,
    bciEnrollmentNumber:
      (raw.bci_enrollment_number as string | null) ??
      (raw.bciEnrollmentNumber as string | null) ??
      null,
    phoneNumber: (raw.phone_number as string | null) ?? (raw.phoneNumber as string | null) ?? null,
    mfaEnabled: Boolean(raw.mfa_enabled ?? raw.mfaEnabled ?? false),
    failedLoginAttempts: Number(raw.failed_login_attempts ?? raw.failedLoginAttempts ?? 0),
    lockedUntil: parseDateOrNull(raw.locked_until ?? raw.lockedUntil),
    lastLoginAt: parseDateOrNull(raw.last_login_at ?? raw.lastLoginAt),
    preferredLanguage: asEnum(
      raw.preferred_language ?? raw.preferredLanguage,
      SUPPORTED_LANGUAGE_CODES,
      "en"
    ),
    status: asEnum(raw.status, ATTORNEY_STATUSES, "active"),
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
  };
}

function mapMatter(raw: Record<string, unknown>): Matter {
  const normalizedLeadAdvocateId =
    (raw.lead_advocate_id as string | null) ??
    (raw.leadAdvocateId as string | null) ??
    (raw.lead_attorney_id as string | null) ??
    (raw.leadAttorneyId as string | null) ??
    null;
  const normalizedDealValuePaise =
    (raw.deal_value_paise as number | null) ??
    (raw.dealValuePaise as number | null) ??
    (raw.deal_value_cents as number | null) ??
    (raw.dealValueCents as number | null) ??
    null;
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    matterCode: String(raw.matter_code ?? raw.matterCode ?? ""),
    matterName: String(raw.matter_name ?? raw.matterName ?? ""),
    matterType: asEnum(raw.matter_type ?? raw.matterType, MATTER_TYPES, "commercial_contract"),
    clientName: String(raw.client_name ?? raw.clientName ?? ""),
    counterpartyName: (raw.counterparty_name as string | null) ?? (raw.counterpartyName as string | null) ?? null,
    governingLawState: asStateCode(raw.governing_law_state ?? raw.governingLawState),
    status: asEnum(raw.status, MATTER_STATUSES, "open"),
    priority: asEnum(raw.priority, PRIORITIES, "normal"),
    healthScore: Number(raw.health_score ?? raw.healthScore ?? 0),
    leadAdvocateId: normalizedLeadAdvocateId,

    targetCloseDate: parseDateOrNull(raw.target_close_date ?? raw.targetCloseDate),
    valueInPaise: (raw.value_in_paise as number | null) ?? null,
    dealValuePaise: normalizedDealValuePaise,
    notes: (raw.notes as string | null) ?? null,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    courtName: (raw.court_name as string | null) ?? null,
    caseType: (raw.case_type as string | null) ?? null,
    cnrNumber: (raw.cnr_number as string | null) ?? null,
    clientPhone: (raw.client_phone as string | null) ?? null,
    clientPreferredLanguage:
      (raw.client_preferred_language as Matter["clientPreferredLanguage"]) ??
      (raw.clientPreferredLanguage as Matter["clientPreferredLanguage"]) ??
      null,
    createdBy: (raw.created_by as string | null) ?? null,
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
    updatedAt: parseDate(raw.updated_at ?? raw.updatedAt),
  };
}

function mapDocument(raw: Record<string, unknown>): Document {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    matterId: String(raw.matter_id ?? raw.matterId ?? ""),
    sourceName: String(raw.source_name ?? raw.sourceName ?? ""),
    mimeType: String(raw.mime_type ?? raw.mimeType ?? "application/octet-stream"),
    docType: asEnum(raw.doc_type ?? raw.docType, DOC_TYPES, "other"),
    ingestionStatus: asEnum(raw.ingestion_status ?? raw.ingestionStatus, INGESTION_STATUSES, "uploaded"),
    securityStatus: asEnum(raw.security_status ?? raw.securityStatus, SECURITY_STATUSES, "pending"),
    fileUri: (raw.file_uri as string | null) ?? null,
    sha256: String(raw.sha256 ?? ""),
    normalizedText: (raw.normalized_text as string | null) ?? null,
    pageCount: (raw.page_count as number | null) ?? (raw.pageCount as number | null) ?? null,
    wordCount: (raw.word_count as number | null) ?? (raw.wordCount as number | null) ?? null,
    ocrEngine: (raw.ocr_engine as string | null) ?? (raw.ocrEngine as string | null) ?? null,
    ocrConfidence:
      (raw.ocr_confidence as number | null) ?? (raw.ocrConfidence as number | null) ?? null,
    privilegeScore: Number(raw.privilege_score ?? 0),
    language: asEnum(raw.language, SUPPORTED_LANGUAGE_CODES, "en"),
    extractionModel: (raw.extraction_model as string | null) ?? null,
    createdBy: (raw.created_by as string | null) ?? null,
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
    updatedAt: parseDate(raw.updated_at ?? raw.updatedAt),
  };
}

function mapDocumentListItem(raw: Record<string, unknown>): DocumentListItem {
  return {
    ...mapDocument(raw),
    matterName:
      (raw.matter_name as string | null) ??
      (raw.matterName as string | null) ??
      null,
  };
}

function mapClause(raw: Record<string, unknown>): Clause {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    documentId: String(raw.document_id ?? raw.documentId ?? ""),
    clauseType: String(raw.clause_type ?? raw.clauseType ?? ""),
    heading: (raw.heading as string | null) ?? null,
    textExcerpt: String(raw.text_excerpt ?? raw.textExcerpt ?? ""),
    pageFrom: (raw.page_from as number | null) ?? (raw.pageFrom as number | null) ?? null,
    pageTo: (raw.page_to as number | null) ?? (raw.pageTo as number | null) ?? null,
    riskLevel: asEnum(raw.risk_level ?? raw.riskLevel, RISK_LEVELS, "low"),
    confidence: Number(raw.confidence ?? 0),
    riskFactors: (raw.risk_factors as Clause["riskFactors"]) ?? [],
    extractionModel: (raw.extraction_model as string | null) ?? null,
    reviewerStatus: asEnum(raw.reviewer_status ?? raw.reviewerStatus, REVIEW_STATUSES, "pending"),
    reviewerId: (raw.reviewer_id as string | null) ?? null,
    reviewedAt: parseDateOrNull(raw.reviewed_at ?? raw.reviewedAt),
    reviewerNote: (raw.reviewer_note as string | null) ?? null,
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
  };
}

function mapFlag(raw: Record<string, unknown>, matterId = ""): Flag {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    matterId: String(raw.matter_id ?? raw.matterId ?? matterId),
    documentId: (raw.document_id as string | null) ?? (raw.documentId as string | null) ?? null,
    clauseId: (raw.clause_id as string | null) ?? (raw.clauseId as string | null) ?? null,
    flagType: String(raw.flag_type ?? raw.flagType ?? ""),
    severity: normalizeFlagSeverity(raw.severity),
    reason: String(raw.reason ?? ""),
    playbookRule: (raw.playbook_rule as string | null) ?? null,
    recommendedFix: (raw.recommended_fix as string | null) ?? (raw.recommendedFix as string | null) ?? null,
    status: normalizeFlagStatus(raw.status),
    assignedTo: (raw.assigned_to as string | null) ?? null,
    resolvedBy: (raw.resolved_by as string | null) ?? null,
    resolvedAt: parseDateOrNull(raw.resolved_at ?? raw.resolvedAt),
    resolutionNote: (raw.resolution_note as string | null) ?? null,
    assessmentModel: (raw.assessment_model as string | null) ?? null,
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
  };
}

function mapObligation(raw: Record<string, unknown>): Obligation {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    matterId: String(raw.matter_id ?? raw.matterId ?? ""),
    documentId: (raw.document_id as string | null) ?? (raw.documentId as string | null) ?? null,
    clauseId: (raw.clause_id as string | null) ?? (raw.clauseId as string | null) ?? null,
    obligationType: String(raw.obligation_type ?? raw.obligationType ?? ""),
    party: (raw.responsible_party as string | null) ?? (raw.party as string | null) ?? null,
    description: String(raw.description ?? ""),
    deadlineDate: parseDateOrNull(raw.deadline ?? raw.deadline_date ?? raw.deadlineDate),
    deadlineText: (raw.deadline_text as string | null) ?? null,
    noticeDays: (raw.notice_days as number | null) ?? null,
    recurrenceRule: (raw.recurrence_rule as string | null) ?? null,
    status: normalizeObligationStatus(raw.status),
    assignedTo: (raw.assigned_to as string | null) ?? null,
    notes: (raw.notes as string | null) ?? null,
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
  };
}

function mapPlaybook(raw: Record<string, unknown>): Playbook {
  const parsedRules = parseJsonArray<Record<string, unknown>>(raw.rules);
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? raw.tenantId ?? ""),
    name: String(raw.name ?? ""),
    description: (raw.description as string | null) ?? null,
    practiceArea:
      (raw.practice_area as Playbook["practiceArea"]) ??
      (raw.practiceArea as Playbook["practiceArea"]) ??
      null,
    rules: parsedRules.map((rule, index) => ({
      id: String(rule.id ?? `rule-${index + 1}`),
      clauseType: String(rule.clauseType ?? rule.clause_type ?? "custom"),
      condition: String(rule.condition ?? ""),
      severity: asEnum(rule.severity, ["critical", "warn", "info"], "warn"),
      description: String(rule.description ?? ""),
    })),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    createdBy: (raw.created_by as string | null) ?? (raw.createdBy as string | null) ?? null,
    createdAt: parseDate(raw.created_at ?? raw.createdAt),
  };
}

function toMatterType(practiceArea?: string): string {
  if (!practiceArea) return "commercial_contract";
  const key = practiceArea.trim().toLowerCase();
  if (key.includes("litigation")) return "litigation";
  if (key.includes("real")) return "real_estate";
  if (key.includes("employment") || key.includes("labour")) return "labour_employment";
  if (key.includes("regulatory") || key.includes("compliance")) return "regulatory_compliance";
  if (key.includes("ip")) return "intellectual_property";
  if (key.includes("m&a") || key.includes("ma") || key.includes("acquisition")) return "merger_acquisition";
  return "commercial_contract";
}

// ============================================================================
// Auth API
// ============================================================================

export const auth = {
  async login(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
    const data = await apiRequest<Record<string, unknown>>("POST", "/auth/login", {
      email,
      password,
      ...(mfaCode ? { mfaCode } : {}),
    });
    const accessTokenValue =
      typeof data.accessToken === "string" ? data.accessToken : "";
    const refreshTokenValue =
      typeof data.refreshToken === "string" ? data.refreshToken : undefined;

    if (accessTokenValue) {
      setTokens(accessTokenValue, refreshTokenValue);
    }

    const profile =
      (data.advocate as Record<string, unknown> | undefined) ??
      (data.attorney as Record<string, unknown> | undefined) ??
      {};

    return {
      accessToken: accessTokenValue,
      refreshToken: refreshTokenValue,
      mfaRequired: Boolean(data.mfaRequired),
      mfaSessionToken:
        (typeof data.mfaSessionToken === "string" && data.mfaSessionToken) ||
        (typeof data.mfaToken === "string" && data.mfaToken) ||
        undefined,
      advocate: mapAttorney(profile),
      attorney: mapAttorney(profile),
    };
  },

  async logout(): Promise<void> {
    if (!accessToken) {
      loadTokens();
    }

    if (!accessToken) {
      clearTokens();
      return;
    }

    try {
      await apiRequest("POST", "/auth/logout");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      throw error;
    } finally {
      clearTokens();
    }
  },

  async me(): Promise<Attorney> {
    const data = await apiRequest<{
      attorney?: Record<string, unknown>;
      advocate?: Record<string, unknown>;
    }>("GET", "/auth/me");

    const profile = data.attorney ?? data.advocate;
    if (!profile) {
      throw new ApiError(500, "INVALID_PROFILE", "User profile is missing");
    }
    return mapAttorney(profile);
  },

  async forgotPassword(email: string): Promise<void> {
    await apiRequest("POST", "/auth/forgot-password", { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiRequest("POST", "/auth/reset-password", { token, password });
  },

  async setupMFA(): Promise<{ secret: string; qrCodeUrl: string }> {
    return apiRequest("POST", "/auth/mfa/setup");
  },

  async verifyMFA(code: string): Promise<void> {
    await apiRequest("POST", "/auth/mfa/verify", { code });
  },

  async disableMFA(code: string): Promise<void> {
    await apiRequest("POST", "/auth/mfa/disable", { code });
  },
};

// ============================================================================
// Matters API
// ============================================================================

export interface MatterFilters {
  status?: "open" | "under_review" | "closed" | "archived";
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateMatterInput {
  name: string;
  clientName: string;
  description?: string;
  practiceArea?: string;
  jurisdiction?: string;
}

export const matters = {
  async list(filters?: MatterFilters): Promise<PaginatedResponse<Matter>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const result = await apiRequest<{ matters: Record<string, unknown>[]; pagination?: PaginationShape }>(
      "GET",
      `/api/matters?${params.toString()}`
    );

    return {
      data: (result.matters ?? []).map((matter) => mapMatter(matter)),
      pagination: result.pagination ?? defaultPagination(filters?.page ?? 1, filters?.limit ?? 20),
    };
  },

  async get(id: string): Promise<Matter> {
    const result = await apiRequest<Record<string, unknown>>("GET", `/api/matters/${id}`);
    return mapMatter(result);
  },

  async create(input: CreateMatterInput): Promise<Matter> {
    const generatedCode = `MAT-${Date.now().toString().slice(-8)}`;
    const payload = {
      matterCode: generatedCode,
      matterName: input.name,
      matterType: toMatterType(input.practiceArea),
      clientName: input.clientName,
      governingLawState: input.jurisdiction,
      notes: input.description,
    };

    const created = await apiRequest<{ id: string }>("POST", "/api/matters", payload);
    return matters.get(created.id);
  },

  async update(id: string, input: Partial<CreateMatterInput>): Promise<Matter> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.matterName = input.name;
    if (input.clientName !== undefined) payload.clientName = input.clientName;
    if (input.description !== undefined) payload.notes = input.description;
    if (input.practiceArea !== undefined) payload.matterType = toMatterType(input.practiceArea);
    if (input.jurisdiction !== undefined) payload.governingLawState = input.jurisdiction;

    await apiRequest("PATCH", `/api/matters/${id}`, payload);
    return matters.get(id);
  },

  async delete(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/matters/${id}`);
  },

  async getAnalytics(id: string): Promise<{
    totalDocuments: number;
    totalClauses: number;
    flagsByRisk: Record<RiskLevel, number>;
    processingQueue: number;
  }> {
    return apiRequest("GET", `/api/matters/${id}/analytics`);
  },
};

// ============================================================================
// Documents API
// ============================================================================

export interface DocumentFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface GlobalDocumentFilters extends DocumentFilters {
  search?: string;
}

export interface DocumentListItem extends Document {
  matterName: string | null;
}

export const documents = {
  async list(matterId: string, filters?: DocumentFilters): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const result = await apiRequest<{ documents: Record<string, unknown>[]; pagination?: PaginationShape }>(
      "GET",
      `/api/matters/${matterId}/documents?${params.toString()}`
    );

    return {
      data: (result.documents ?? []).map((document) => mapDocument(document)),
      pagination: result.pagination ?? defaultPagination(filters?.page ?? 1, filters?.limit ?? 20),
    };
  },

  async listAll(filters?: GlobalDocumentFilters): Promise<PaginatedResponse<DocumentListItem>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const suffix = params.toString();
    const result = await apiRequest<{ documents: Record<string, unknown>[]; pagination?: PaginationShape }>(
      "GET",
      `/api/documents${suffix ? `?${suffix}` : ""}`
    );

    return {
      data: (result.documents ?? []).map((document) => mapDocumentListItem(document)),
      pagination: result.pagination ?? defaultPagination(filters?.page ?? 1, filters?.limit ?? 20),
    };
  },

  async get(matterId: string, documentId: string): Promise<Document> {
    const result = await apiRequest<Record<string, unknown>>("GET", `/api/documents/${documentId}`);
    return mapDocument({ ...result, matter_id: result.matter_id ?? matterId });
  },

  async upload(matterId: string, file: File): Promise<Document> {
    loadTokens();
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}/api/documents/upload?matterId=${matterId}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new ApiError(response.status, error.code || "ERROR", error.message);
    }

    const payload = await response.json();
    const data = payload?.success ? payload.data : payload;
    return mapDocument({
      id: data?.id,
      matter_id: matterId,
      source_name: data?.sourceName ?? file.name,
      mime_type: file.type || "application/octet-stream",
      doc_type: "other",
      ingestion_status: data?.ingestionStatus ?? "uploaded",
      security_status: data?.securityStatus ?? "pending",
      page_count: null,
      word_count: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  },

  async delete(_matterId: string, documentId: string): Promise<void> {
    await apiRequest("DELETE", `/api/documents/${documentId}`);
  },

  async downloadUrl(matterId: string, documentId: string): Promise<string> {
    const data = await apiRequest<{ downloadUrl: string }>(
      "POST",
      `/api/documents/${documentId}/export`,
      { format: "pdf", includeRedlines: false, includeComments: false, matterId }
    );
    return data.downloadUrl;
  },
};

// ============================================================================
// Clauses API
// ============================================================================

export interface ClauseFilters {
  documentId?: string;
  clauseType?: string;
  page?: number;
  limit?: number;
}

export const clauses = {
  async list(matterId: string, filters?: ClauseFilters): Promise<PaginatedResponse<Clause>> {
    const params = new URLSearchParams();
    if (filters?.documentId) params.set("documentId", filters.documentId);
    if (filters?.clauseType) params.set("clauseType", filters.clauseType);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const result = await apiRequest<{ clauses: Record<string, unknown>[]; pagination?: PaginationShape }>(
      "GET",
      `/api/matters/${matterId}/clauses?${params.toString()}`
    );

    return {
      data: (result.clauses ?? []).map((clause) => mapClause(clause)),
      pagination: result.pagination ?? defaultPagination(filters?.page ?? 1, filters?.limit ?? 100),
    };
  },

  async get(matterId: string, clauseId: string): Promise<Clause> {
    const page = await clauses.list(matterId, { page: 1, limit: 100 });
    const clause = page.data.find((item) => item.id === clauseId);
    if (!clause) {
      throw new ApiError(404, "NOT_FOUND", "Clause not found");
    }
    return clause;
  },
};

// ============================================================================
// Flags API
// ============================================================================

export interface FlagFilters {
  documentId?: string;
  riskLevel?: RiskLevel;
  status?: "open" | "accepted" | "rejected" | "deferred";
  page?: number;
  limit?: number;
}

export const flags = {
  async list(matterId: string, filters?: FlagFilters): Promise<PaginatedResponse<Flag>> {
    const params = new URLSearchParams();
    if (filters?.documentId) params.set("documentId", filters.documentId);
    if (filters?.riskLevel) {
      const severityMap: Record<RiskLevel, string> = {
        critical: "critical",
        high: "high",
        medium: "medium",
        low: "low",
      };
      params.set("severity", severityMap[filters.riskLevel]);
    }
    if (filters?.status) {
      const statusMap: Record<NonNullable<FlagFilters["status"]>, string> = {
        open: "open",
        accepted: "approved",
        rejected: "rejected",
        deferred: "waived",
      };
      params.set("status", statusMap[filters.status]);
    }
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const result = await apiRequest<{ flags: Record<string, unknown>[]; pagination?: PaginationShape }>(
      "GET",
      `/api/matters/${matterId}/flags?${params.toString()}`
    );

    return {
      data: (result.flags ?? []).map((flag) => mapFlag(flag, matterId)),
      pagination: result.pagination ?? defaultPagination(filters?.page ?? 1, filters?.limit ?? 100),
    };
  },

  async updateStatus(
    matterId: string,
    flagId: string,
    status: "accepted" | "rejected" | "deferred",
    notes?: string
  ): Promise<void> {
    await apiRequest("PATCH", `/api/matters/${matterId}/flags/${flagId}`, { status, notes });
  },

  async bulkUpdateStatus(
    matterId: string,
    flagIds: string[],
    status: "accepted" | "rejected" | "deferred"
  ): Promise<void> {
    await Promise.all(flagIds.map((flagId) => flags.updateStatus(matterId, flagId, status)));
  },
};

// ============================================================================
// Obligations API
// ============================================================================

export interface ObligationFilters {
  documentId?: string;
  party?: "client" | "counterparty" | "both";
  status?: "pending" | "completed" | "overdue";
  page?: number;
  limit?: number;
}

export const obligations = {
  async list(matterId: string, filters?: ObligationFilters): Promise<PaginatedResponse<Obligation>> {
    const params = new URLSearchParams();
    params.set("matterId", matterId);
    if (filters?.status) {
      const statusMap: Record<NonNullable<ObligationFilters["status"]>, string> = {
        pending: "active",
        completed: "completed",
        overdue: "overdue",
      };
      params.set("status", statusMap[filters.status]);
    }
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const rows = await apiRequest<Record<string, unknown>[]>(
      "GET",
      `/api/obligations?${params.toString()}`
    );

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const items = rows
      .map((obligation) => mapObligation(obligation))
      .filter((obligation) => !filters?.party || obligation.party === filters.party || obligation.party === "both");

    return {
      data: items,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
      },
    };
  },

  async timeline(matterId: string): Promise<{ obligations: Obligation[] }> {
    const result = await obligations.list(matterId, { limit: 100 });
    return { obligations: result.data };
  },

  async markComplete(matterId: string, obligationId: string): Promise<Obligation> {
    await apiRequest("PATCH", `/api/obligations/${obligationId}`, { status: "completed", matterId });
    const refreshed = await obligations.list(matterId, { limit: 100 });
    const obligation = refreshed.data.find((item) => item.id === obligationId);
    if (!obligation) {
      throw new ApiError(404, "NOT_FOUND", "Obligation not found after update");
    }
    return obligation;
  },

  async create(matterId: string, data: {
    description: string;
    party: 'client' | 'counterparty' | 'both';
    type: string;
    deadlineDate?: string;
    deadlineText?: string;
  }): Promise<Obligation> {
    const created = await apiRequest<{ id: string }>("POST", "/api/obligations", {
      matterId,
      obligationType: data.type,
      description: data.description,
      responsibleParty: data.party,
      deadline: data.deadlineDate ?? data.deadlineText,
    });
    const refreshed = await obligations.list(matterId, { limit: 100 });
    const obligation = refreshed.data.find((item) => item.id === created.id);
    if (!obligation) {
      throw new ApiError(404, "NOT_FOUND", "Obligation not found after creation");
    }
    return obligation;
  },

  async update(matterId: string, obligationId: string, data: Partial<Obligation>): Promise<Obligation> {
    await apiRequest("PATCH", `/api/obligations/${obligationId}`, {
      status: data.status,
      notes: data.notes,
      deadline: data.deadlineDate,
    });
    const refreshed = await obligations.list(matterId, { limit: 100 });
    const obligation = refreshed.data.find((item) => item.id === obligationId);
    if (!obligation) {
      throw new ApiError(404, "NOT_FOUND", "Obligation not found after update");
    }
    return obligation;
  },

  async exportCalendar(_matterId: string, obligationId: string): Promise<Response> {
    loadTokens();
    return fetch(`${API_BASE}/api/obligations/${obligationId}/calendar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};

// ============================================================================
// Research API
// ============================================================================

export interface ResearchQuery {
  query: string;
  matterId?: string | null;
  documentIds?: string[];
  jurisdiction?: string;
  language?: SupportedLanguageCode;
}

export interface ResearchCitation {
  id: string;
  source: string;
  text: string;
  page?: number;
  sourceType?: string;
}

export interface ResearchSourceItem {
  documentId: string;
  title: string;
  relevance: number;
  snippet: string;
  pageFrom?: number | null;
  pageTo?: number | null;
  sourceType?: string;
}

export interface ResearchResult {
  answer: string;
  citations: ResearchCitation[];
  sources: ResearchSourceItem[];
  confidence: number;
}

export interface ResearchHistoryItem {
  id: string;
  question: string;
  answer: string;
  citations: string;
  sourcesUsed: number;
  createdAt: string;
}

export const research = {
  async query(input: ResearchQuery): Promise<ResearchResult> {
    const payload: Record<string, unknown> = {
      question: input.query,
      language: input.language,
    };
    if (input.matterId) {
      payload.matterId = input.matterId;
    }
    const result = await apiRequest<Record<string, unknown>>("POST", "/api/research/query", payload);
    const rawCitations = Array.isArray(result.citations) ? result.citations : [];
    const rawSources = Array.isArray(result.sources) ? result.sources : [];

    return {
      answer: String(result.answer ?? ""),
      citations: rawCitations.map((citation, index) => {
        const row = (citation ?? {}) as Record<string, unknown>;
        return {
          id: String(row.id ?? `citation-${index}`),
          source: String(
            row.source ??
              row.document_name ??
              row.documentName ??
              row.title ??
              `Source ${index + 1}`
          ),
          text: String(row.text ?? row.excerpt ?? row.snippet ?? ""),
          page:
            row.page !== undefined
              ? asNumber(row.page)
              : row.page_number !== undefined
              ? asNumber(row.page_number)
              : row.pageNumber !== undefined
              ? asNumber(row.pageNumber)
              : undefined,
          sourceType:
            (row.source_type as string | undefined) ??
            (row.sourceType as string | undefined),
        };
      }),
      sources: rawSources.map((source) => {
        const row = (source ?? {}) as Record<string, unknown>;
        return {
          documentId: String(row.documentId ?? row.document_id ?? ""),
          title: String(row.title ?? row.document_name ?? row.documentName ?? "Untitled source"),
          relevance: asNumber(row.relevance ?? row.relevance_score, 0),
          snippet: String(row.snippet ?? row.text ?? row.excerpt ?? ""),
          pageFrom:
            row.pageFrom !== undefined
              ? asNumber(row.pageFrom)
              : row.page_from !== undefined
              ? asNumber(row.page_from)
              : null,
          pageTo:
            row.pageTo !== undefined
              ? asNumber(row.pageTo)
              : row.page_to !== undefined
              ? asNumber(row.page_to)
              : null,
          sourceType:
            (row.sourceType as string | undefined) ??
            (row.source_type as string | undefined),
        };
      }),
      confidence: asNumber(result.confidence, 0.85),
    };
  },

  async stream(input: ResearchQuery): Promise<ReadableStream<Uint8Array>> {
    loadTokens();
    const payload: Record<string, unknown> = {
      query: input.query,
      language: input.language,
    };
    if (input.matterId) {
      payload.matterId = input.matterId;
    }

    let response = await fetch(`${API_BASE}/api/research/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 && accessToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(`${API_BASE}/api/research/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });
      }
    }

    if (!response.ok) {
      throw new ApiError(response.status, "ERROR", "Research query failed");
    }

    if (!response.body) {
      throw new ApiError(500, "EMPTY_STREAM", "Research stream is empty");
    }
    return response.body;
  },

  async history(matterId?: string, limit?: number): Promise<{ data: ResearchHistoryItem[] }> {
    const params = new URLSearchParams();
    if (matterId) params.set("matterId", matterId);
    if (limit) params.set("limit", String(limit));
    const rows = await apiRequest<Record<string, unknown>[]>("GET", `/api/research/history?${params.toString()}`);
    return {
      data: rows.map((row) => ({
        id: String(row.id ?? ""),
        question: String(row.question ?? ""),
        answer: String(row.answer ?? ""),
        citations: String(row.citations ?? "[]"),
        sourcesUsed: asNumber(row.sources_used ?? row.sourcesUsed, 0),
        createdAt: String(row.created_at ?? row.createdAt ?? ""),
      })),
    };
  },
};

// ============================================================================
// Playbooks API
// ============================================================================

export const playbooks = {
  async list(): Promise<Playbook[]> {
    const result = await apiRequest<Record<string, unknown>[]>("GET", "/api/admin/playbooks");
    return (result ?? []).map((row) => mapPlaybook(row));
  },

  async get(id: string): Promise<Playbook> {
    const rows = await playbooks.list();
    const match = rows.find((playbook) => playbook.id === id);
    if (!match) {
      throw new ApiError(404, "PLAYBOOK_NOT_FOUND", "Playbook not found");
    }
    return match;
  },

  async create(input: Partial<Playbook>): Promise<Playbook> {
    const result = await apiRequest<Record<string, unknown>>("POST", "/api/admin/playbooks", input);
    return mapPlaybook(result);
  },

  async update(id: string, input: Partial<Playbook>): Promise<Playbook> {
    const result = await apiRequest<Record<string, unknown>>(
      "PATCH",
      `/api/admin/playbooks/${id}`,
      input
    );
    return mapPlaybook(result);
  },

  async delete(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/admin/playbooks/${id}`);
  },
};

// ============================================================================
// Analytics API
// ============================================================================

export const analytics = {
  async firmOverview(): Promise<{
    totalMatters: number;
    openMatters: number;
    totalDocuments: number;
    processedDocuments: number;
    totalFlags: number;
    openFlags: number;
    criticalFlags: number;
    avgHealthScore: number;
  }> {
    const result = await apiRequest<{
      metrics?: Record<string, unknown>;
    }>("GET", "/api/analytics/firm");

    const metrics = result.metrics ?? {};

    return {
      totalMatters: asNumber(metrics.total_matters),
      openMatters: asNumber(metrics.open_matters),
      totalDocuments: asNumber(metrics.total_documents),
      processedDocuments: asNumber(metrics.processed_documents),
      totalFlags: asNumber(metrics.total_flags),
      openFlags: asNumber(metrics.open_flags),
      criticalFlags: asNumber(metrics.critical_flags),
      avgHealthScore: asNumber(metrics.avg_health_score),
    };
  },

  async attorneyProductivity(): Promise<
    Array<{
      attorneyId: string;
      name: string;
      mattersAssigned: number;
      documentsReviewed: number;
      flagsResolved: number;
    }>
  > {
    const rows = await apiRequest<Record<string, unknown>[]>("GET", "/api/analytics/attorneys");
    return rows.map((row) => ({
      attorneyId: String(row.id ?? row.attorneyId ?? ""),
      name: String(row.display_name ?? row.name ?? ""),
      mattersAssigned: asNumber(row.matters_count ?? row.mattersAssigned),
      documentsReviewed: asNumber(row.documents_reviewed ?? row.documentsReviewed),
      flagsResolved: asNumber(row.flags_resolved ?? row.flagsResolved),
    }));
  },

  async riskTrends(days = 30): Promise<
    Array<{
      date: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>
  > {
    return apiRequest("GET", `/analytics/risk-trends?days=${days}`);
  },
};

export interface DpdpRequest {
  id: string;
  advocateId: string | null;
  requestType: string;
  status: string;
  details: Record<string, unknown> | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface DpdpConsentStatus {
  active: boolean;
  consentedAt: string | null;
  withdrawnAt: string | null;
  requests: DpdpRequest[];
}

export const dpdp = {
  async requests(): Promise<DpdpRequest[]> {
    const rows = await apiRequest<Record<string, unknown>[]>("GET", "/api/dpdp/requests");
    return rows.map((row) => ({
      id: String(row.id ?? ""),
      advocateId: (row.advocate_id as string | null) ?? (row.advocateId as string | null) ?? null,
      requestType: String(row.request_type ?? row.requestType ?? ""),
      status: String(row.status ?? ""),
      details: parseJsonRecord(row.details),
      resolvedAt: (row.resolved_at as string | null) ?? (row.resolvedAt as string | null) ?? null,
      createdAt: String(row.created_at ?? row.createdAt ?? ""),
    }));
  },

  async consentStatus(): Promise<DpdpConsentStatus> {
    const result = await apiRequest<Record<string, unknown>>("GET", "/api/dpdp/consent/status");
    const requests = Array.isArray(result.requests) ? result.requests : [];

    return {
      active: Boolean(result.active),
      consentedAt: (result.consentedAt as string | null) ?? null,
      withdrawnAt: (result.withdrawnAt as string | null) ?? null,
      requests: requests.map((row, index) => {
        const item = (row ?? {}) as Record<string, unknown>;
        return {
          id: String(item.id ?? `dpdp-request-${index}`),
          advocateId:
            (item.advocateId as string | null) ??
            (item.advocate_id as string | null) ??
            null,
          requestType: String(item.requestType ?? item.request_type ?? ""),
          status: String(item.status ?? ""),
          details: parseJsonRecord(item.details),
          resolvedAt: (item.resolvedAt as string | null) ?? (item.resolved_at as string | null) ?? null,
          createdAt: String(item.createdAt ?? item.created_at ?? ""),
        };
      }),
    };
  },

  async withdrawConsent(reason?: string): Promise<{ requestId: string; erasureDeadline: string; message: string }> {
    const result = await apiRequest<Record<string, unknown>>("POST", "/api/dpdp/consent/withdraw", {
      ...(reason ? { reason } : {}),
    });

    return {
      requestId: String(result.requestId ?? ""),
      erasureDeadline: String(result.erasureDeadline ?? ""),
      message: String(result.message ?? ""),
    };
  },
};

// ============================================================================
// Admin API
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
}

export interface InviteMemberInput {
  email: string;
  role: string;
}

export interface UpdateMemberInput {
  role?: string;
  status?: string;
  mfaEnabled?: boolean;
}

export interface AdminSecuritySettings {
  enforceMfa: boolean;
  sessionTimeoutMinutes: number;
  maxFailedLogins: number;
}

export interface AdminWebhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface AdminSsoConfiguration {
  id: string;
  providerType: string;
  issuerUrl: string | null;
  ssoUrl: string | null;
  metadataUrl: string | null;
  enabled: boolean;
  updatedAt: string | null;
}

export const admin = {
  async listMembers(): Promise<TeamMember[]> {
    const result = await apiRequest<{ members: Record<string, unknown>[] }>(
      "GET",
      "/api/admin/members"
    );
    return (result.members ?? []).map((m) => ({
      id: String(m.id ?? ""),
      name: String(m.display_name ?? m.displayName ?? m.name ?? ""),
      email: String(m.email ?? ""),
      role: String(m.role ?? "advocate"),
      status: String(m.status ?? "active"),
      mfaEnabled: Boolean(m.mfa_enabled ?? m.mfaEnabled ?? false),
      lastLoginAt: (m.last_login_at as string | null) ?? (m.lastLoginAt as string | null) ?? null,
    }));
  },

  async inviteMember(input: InviteMemberInput): Promise<void> {
    await apiRequest("POST", "/api/admin/attorneys", input);
  },

  async updateMember(id: string, input: UpdateMemberInput): Promise<TeamMember> {
    const result = await apiRequest<Record<string, unknown>>("PATCH", `/api/admin/attorneys/${id}`, input);
    return {
      id: String(result.id ?? ""),
      name: String(result.display_name ?? result.displayName ?? result.name ?? ""),
      email: String(result.email ?? ""),
      role: String(result.role ?? "advocate"),
      status: String(result.status ?? "active"),
      mfaEnabled: Boolean(result.mfa_enabled ?? result.mfaEnabled ?? false),
      lastLoginAt: (result.last_login_at as string | null) ?? (result.lastLoginAt as string | null) ?? null,
    };
  },

  async getSecuritySettings(): Promise<AdminSecuritySettings> {
    return apiRequest("GET", "/api/admin/security-settings");
  },

  async saveSecuritySettings(input: AdminSecuritySettings): Promise<AdminSecuritySettings> {
    return apiRequest("PATCH", "/api/admin/security-settings", input);
  },

  async listWebhooks(): Promise<AdminWebhook[]> {
    const result = await apiRequest<Record<string, unknown>[]>("GET", "/api/webhooks");
    return (result ?? []).map((webhook) => ({
      id: String(webhook.id ?? ""),
      url: String(webhook.url ?? ""),
      events: Array.isArray(webhook.events) ? webhook.events.map((event) => String(event)) : [],
      isActive: Boolean(webhook.is_active ?? webhook.isActive ?? false),
      lastTriggeredAt:
        (webhook.last_triggered_at as string | null) ??
        (webhook.lastTriggeredAt as string | null) ??
        null,
      createdAt: String(webhook.created_at ?? webhook.createdAt ?? ""),
    }));
  },

  async createWebhook(input: { url: string; events: string[] }): Promise<{ id: string; secret: string }> {
    const result = await apiRequest<{ id: string; secret: string }>("POST", "/api/webhooks", input);
    return {
      id: String(result.id ?? ""),
      secret: String(result.secret ?? ""),
    };
  },

  async deleteWebhook(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/webhooks/${id}`);
  },

  async listSsoConfigurations(): Promise<AdminSsoConfiguration[]> {
    const result = await apiRequest<Record<string, unknown>[]>("GET", "/api/admin/sso");
    return (result ?? []).map((item) => ({
      id: String(item.id ?? ""),
      providerType: String(item.provider_type ?? item.providerType ?? ""),
      issuerUrl:
        (item.issuer_url as string | null) ??
        (item.issuerUrl as string | null) ??
        null,
      ssoUrl: (item.sso_url as string | null) ?? (item.ssoUrl as string | null) ?? null,
      metadataUrl:
        (item.metadata_url as string | null) ??
        (item.metadataUrl as string | null) ??
        (((item.issuer_url as string | null) ?? (item.issuerUrl as string | null) ?? null)
          ? `${String(item.issuer_url ?? item.issuerUrl)}/metadata`
          : null),
      enabled: Boolean(item.enabled ?? false),
      updatedAt: (item.updated_at as string | null) ?? (item.updatedAt as string | null) ?? null,
    }));
  },

  async saveSamlConfiguration(input: { ssoUrl: string; certificate: string }): Promise<AdminSsoConfiguration> {
    const result = await apiRequest<Record<string, unknown>>("POST", "/api/admin/sso/saml", input);
    return {
      id: String(result.id ?? ""),
      providerType: String(result.providerType ?? "saml"),
      issuerUrl: (result.issuerUrl as string | null) ?? null,
      ssoUrl: (result.ssoUrl as string | null) ?? null,
      metadataUrl:
        (result.metadataUrl as string | null) ??
        ((result.issuerUrl as string | null) ? `${String(result.issuerUrl)}/metadata` : null),
      enabled: Boolean(result.enabled ?? true),
      updatedAt: new Date().toISOString(),
    };
  },
};

// ============================================================================
// Onboarding API
// ============================================================================

export const onboarding = {
  async getStatus(): Promise<Record<string, boolean>> {
    try {
      return await apiRequest<Record<string, boolean>>("GET", "/api/onboarding");
    } catch {
      return {};
    }
  },

  async completeStep(stepKey: string): Promise<void> {
    try {
      await apiRequest("POST", "/api/onboarding/complete", { stepKey });
    } catch {
      // Graceful degradation — store locally as fallback
      if (typeof window !== "undefined") {
        const stored = JSON.parse(localStorage.getItem("evidentis_onboarding") || "{}");
        stored[stepKey] = true;
        localStorage.setItem("evidentis_onboarding", JSON.stringify(stored));
      }
    }
  },
};

export const billing = {
  async status(): Promise<{ plan?: string }> {
    return apiRequest<{ plan?: string }>("GET", "/api/billing/status");
  },
};
