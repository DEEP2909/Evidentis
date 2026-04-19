# Evidentis — Complete Implementation Prompt
## Master Prompt for AI Coding Assistant

> **What this is:** A complete, ordered set of instructions to implement all pending improvements to the Evidentis codebase. Hand this to an AI coding assistant (Claude, Copilot, Cursor) with the codebase open. Work through each section in order. Do not skip sections.

---

## Context: What Evidentis Is

Evidentis is an enterprise Legal AI SaaS platform for Indian law firms. It is a multi-tenant monorepo with four services:

- `apps/api` — Node.js / Fastify backend (TypeScript)
- `apps/web` — Next.js 14 frontend (TypeScript / React)
- `apps/ai-service` — Python / FastAPI AI inference service
- `apps/ai-worker` — Python / Celery async task worker

The product serves law firms with multiple roles: `admin`, `senior_advocate`, `partner`, `junior_advocate`, `advocate`, `paralegal`, and `client`. The `client` role is for external stakeholders — they only access `/portal/[shareToken]` and never the main app.

---

## Section 1 — AI Model Integration (Priority: Critical)

### 1.1 What to change and why

Currently all AI tasks use Mistral 7B q4_K_M running locally on Ollama at ~10 tokens/second on CPU. This makes every task take 2–3 minutes. The target is under 1 minute for every task.

**New model routing:**
- Clause extraction, risk assessment, obligation extraction, redline suggestions → **Azure OpenAI GPT-4o-mini** (~150 tok/s, $0.15/M input tokens)
- NyayAssist research / RAG answers → **Groq free tier, Llama 3.1 8B Instant** (~750 tok/s, free)
- Embeddings → **BAAI/bge-m3** locally (never send embeddings externally)
- OCR → **Tesseract** locally (never send document images externally)
- Fallback when APIs are unavailable → **Qwen2.5 3B q3_K_M via Ollama** locally

### 1.2 New file: `apps/ai-service/llm_caller.py`

Create this file from scratch. It is the single unified LLM calling layer for the entire ai-service.

```python
"""
EvidentIS LLM Caller
Unified LLM routing: Azure OpenAI (primary) → Groq (research) → Ollama (fallback).
All routers import from here — never call Ollama/Azure directly from a router.
"""

import json
import logging
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def clean_json(text: str) -> str:
    """Strip markdown code fences before JSON parsing. Models sometimes wrap output in ```json blocks."""
    return re.sub(r"```json|```", "", text).strip()


async def call_azure(
    system: str,
    user: str,
    settings: Any,
    max_tokens: int = 1500,
    temperature: float = 0.1,
) -> str:
    """Call Azure OpenAI GPT-4o-mini. Raises on failure so caller can fallback."""
    url = (
        f"{settings.azure_openai_endpoint}/openai/deployments/"
        f"{settings.azure_openai_deployment}/chat/completions"
        f"?api-version={settings.azure_openai_api_version}"
    )
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            url,
            headers={"api-key": settings.azure_openai_api_key},
            json={
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_groq(
    system: str,
    user: str,
    settings: Any,
    max_tokens: int = 2048,
    temperature: float = 0.2,
) -> str:
    """Call Groq free tier Llama 3.1 8B. Raises on failure so caller can fallback."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_ollama(
    system: str,
    user: str,
    settings: Any,
    max_tokens: int = 1200,
    temperature: float = 0.1,
    model_override: str | None = None,
) -> str:
    """Call local Ollama. Last resort fallback. Always available."""
    model = model_override or settings.ollama_model_extract
    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]


async def call_llm(
    system: str,
    user: str,
    settings: Any,
    task: str = "extract",
    max_tokens: int = 1500,
    temperature: float = 0.1,
) -> str:
    """
    Main entry point. Route by task type:
      - task="research"  → Groq first, then Azure, then Ollama
      - task="extract"   → Azure first, then Ollama
      - all others       → Azure first, then Ollama

    Never raises — always returns a string (may be empty on total failure).
    """
    if task == "research" and settings.groq_api_key:
        try:
            return await call_groq(system, user, settings, max_tokens, temperature)
        except Exception as exc:
            logger.warning("Groq failed for research, falling back: %s", exc)

    if settings.azure_openai_api_key and settings.azure_openai_endpoint:
        try:
            return await call_azure(system, user, settings, max_tokens, temperature)
        except Exception as exc:
            logger.warning("Azure OpenAI failed for %s, falling back to Ollama: %s", task, exc)

    # Final fallback — always available
    try:
        return await call_ollama(system, user, settings, max_tokens, temperature)
    except Exception as exc:
        logger.error("Ollama fallback also failed for %s: %s", task, exc)
        return ""
```

### 1.3 Update `apps/ai-service/config.py`

Add these new fields to the `Settings` class, after the existing `ollama_timeout` field:

```python
# Azure OpenAI (primary model — GPT-4o-mini)
azure_openai_api_key: str = Field(default="")
azure_openai_endpoint: str = Field(default="")
azure_openai_deployment: str = Field(default="gpt-4o-mini")
azure_openai_api_version: str = Field(default="2024-02-01")

# Groq (research / NyayAssist — Llama 3.1 8B Instant, free tier)
groq_api_key: str = Field(default="")
groq_model: str = Field(default="llama-3.1-8b-instant")
```

Also update the default model values:
```python
# Change these two lines
ollama_model_extract: str = Field(default="qwen2.5:3b-instruct-q3_K_M")  # was mistral:7b
ollama_model_research: str = Field(default="qwen2.5:3b-instruct-q3_K_M")  # was mistral:7b

# Change embedding model
embedding_model: str = Field(default="BAAI/bge-m3")  # was sentence-transformers/LaBSE
embedding_dim: int = Field(default=1024)  # BGE-M3 uses 1024 dimensions, not 768
```

### 1.4 Refactor `apps/ai-service/routers/extract.py`

In the `extract_clauses_llm()` function, find the entire block that builds `payload` and calls `retry_with_backoff(_call_llm)`. Replace it with:

```python
from llm_caller import call_llm, clean_json

# Replace the payload dict + _call_llm function + retry_with_backoff call with:
system_prompt = (
    "You are a legal document analyzer specializing in Indian commercial and legal drafting. "
    "You extract and classify legal clauses. Always respond with valid JSON only — no prose, "
    "no markdown fences."
)
response_text = await call_llm(
    system=system_prompt,
    user=prompt,
    settings=settings,
    task="extract",
    max_tokens=1200,   # was 4096 — realistic max for clause extraction output
    temperature=0.1,
)
```

Then update the JSON parsing line to use `clean_json`:
```python
clauses_data = json.loads(clean_json(response_text))
```

### 1.5 Refactor `apps/ai-service/routers/assess.py`

Same pattern as extract.py. Find the Ollama call block and replace with:

```python
from llm_caller import call_llm, clean_json

system_prompt = (
    "You are a senior legal counsel analyzing contract risks for India-based law firms. "
    "Always respond with valid JSON only — no prose, no markdown fences."
)
response_text = await call_llm(
    system=system_prompt,
    user=prompt,
    settings=settings,
    task="assess",
    max_tokens=1500,   # was 4096
    temperature=0.2,
)
risks_data = json.loads(clean_json(response_text))
```

### 1.6 Refactor `apps/ai-service/routers/obligations.py`

```python
from llm_caller import call_llm, clean_json

system_prompt = (
    "You are a contracts analyst extracting obligations from Indian legal documents. "
    "Always respond with valid JSON only — no prose, no markdown fences."
)
response_text = await call_llm(
    system=system_prompt,
    user=prompt,
    settings=settings,
    task="obligations",
    max_tokens=1000,   # was 4096
    temperature=0.1,
)
obligations_data = json.loads(clean_json(response_text))
```

### 1.7 Refactor `apps/ai-service/routers/suggest.py`

```python
from llm_caller import call_llm, clean_json

system_prompt = (
    "You are an Indian commercial contracts advocate drafting redline suggestions. "
    "Always respond with valid JSON only — no prose, no markdown fences."
)
response_text = await call_llm(
    system=system_prompt,
    user=prompt,
    settings=settings,
    task="suggest",
    max_tokens=800,    # was 4096 — per-clause output is short
    temperature=0.3,
)
suggestion_data = json.loads(clean_json(response_text))
```

### 1.8 Refactor `apps/ai-service/routers/research.py`

This router is different — it streams. Replace the two Ollama call blocks (streaming and non-streaming) with Groq calls.

For the **non-streaming** `generate_research_answer()` function:

```python
from llm_caller import call_llm

system_prompt = RESEARCH_QUERY.template.split("USER QUESTION:")[0].strip()
answer = await call_llm(
    system=system_prompt,
    user=f"USER QUESTION:\n{query}\n\nRELEVANT CONTEXT:\n{context}\n\nJURISDICTION: {jurisdiction or 'India'}\nRESPONSE LANGUAGE: {response_language}",
    settings=settings,
    task="research",    # routes to Groq first
    max_tokens=2048,
    temperature=0.2,
)
answer = add_safety_guardrails(answer.strip())
```

For the **streaming** `generate_research_answer_stream()` function, use Groq's streaming endpoint:

```python
async def generate_research_answer_stream(...) -> AsyncGenerator[str, None]:
    # Build context (keep existing chunk-building logic)
    # ...
    
    if settings.groq_api_key:
        async with httpx.AsyncClient(timeout=30) as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": 2048,
                    "temperature": 0.2,
                    "stream": True,
                },
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            chunk = json.loads(line[6:])
                            token = chunk["choices"][0].get("delta", {}).get("content", "")
                            if token:
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except Exception:
                            continue
    # ... followed by existing citation sending logic
```

### 1.9 Update `.env.example`

Add these lines after the existing Ollama section:

```dotenv
# ──────────────────────────────────────────────────────
# Azure OpenAI — Primary model (GPT-4o-mini)
# Get from: education.azure.com → Azure OpenAI → Deploy gpt-4o-mini
# ──────────────────────────────────────────────────────
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE-NAME.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-01

# ──────────────────────────────────────────────────────
# Groq — Research / NyayAssist (free tier, 750 tok/s)
# Get from: console.groq.com
# ──────────────────────────────────────────────────────
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

# ──────────────────────────────────────────────────────
# Ollama — Local fallback only (do not use as primary)
# Pull: ollama pull qwen2.5:3b-instruct-q3_K_M
# ──────────────────────────────────────────────────────
OLLAMA_MODEL_EXTRACT=qwen2.5:3b-instruct-q3_K_M
OLLAMA_MODEL_RESEARCH=qwen2.5:3b-instruct-q3_K_M

# ──────────────────────────────────────────────────────
# Embeddings (always local, never external)
# ──────────────────────────────────────────────────────
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIM=1024
```

---

## Section 2 — Role-Differentiated Interfaces (Priority: High)

### 2.1 Why this matters

Currently the sidebar nav already filters by role (via `ALL_NAV_ITEMS.filter(item => item.roles.includes(role))`), which is good. But the actual page content and available actions within pages are identical for all advocate roles. In a real law firm:

- **Admin advocate** — manages the firm, not a day-to-day document user. They need firm management tools, not matter/document workflows front and centre.
- **Senior advocate / Partner** — power users. They own matters, review AI results, approve redlines, track obligations across all their matters.
- **Junior advocate** — works on assigned matters only. No billing access, no firm settings, no analytics.
- **Paralegal** — uploads documents, manages calendar, views assigned matters. No AI research tools.
- **Client** — never accesses the main app. Portal only (`/portal/[shareToken]`).

### 2.2 Role capability matrix

Implement this matrix as the source of truth for feature gating:

```typescript
// apps/web/lib/role-capabilities.ts  (new file)

export type AdvocateRole =
  | "admin"
  | "senior_advocate"
  | "partner"
  | "junior_advocate"
  | "advocate"
  | "paralegal"
  | "client";

export interface RoleCapabilities {
  // Navigation access
  canAccessAdmin: boolean;
  canAccessBilling: boolean;
  canAccessAnalytics: boolean;
  canAccessAllMatters: boolean;  // vs only assigned matters
  canAccessTemplates: boolean;
  canAccessBareActs: boolean;
  canAccessNyayAssist: boolean;
  canAccessResearch: boolean;

  // Matter actions
  canCreateMatter: boolean;
  canArchiveMatter: boolean;
  canShareMatter: boolean;

  // Document actions
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canExportDocuments: boolean;
  canRunAIAnalysis: boolean;   // clause extraction, risk assessment
  canApproveRedlines: boolean; // senior only

  // Team actions
  canInviteMembers: boolean;
  canChangeRoles: boolean;
  canManagePlaybooks: boolean;

  // Dashboard
  dashboardKpiSet: "admin" | "senior" | "junior" | "paralegal";
}

export const ROLE_CAPABILITIES: Record<AdvocateRole, RoleCapabilities> = {
  admin: {
    canAccessAdmin: true,
    canAccessBilling: true,
    canAccessAnalytics: true,
    canAccessAllMatters: true,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: true,
    canArchiveMatter: true,
    canShareMatter: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: true,
    canInviteMembers: true,
    canChangeRoles: true,
    canManagePlaybooks: true,
    dashboardKpiSet: "admin",
  },
  senior_advocate: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: true,
    canAccessAllMatters: true,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: true,
    canArchiveMatter: true,
    canShareMatter: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: true,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: true,
    dashboardKpiSet: "senior",
  },
  partner: {
    // Same as senior_advocate
    canAccessAdmin: false,
    canAccessBilling: true,  // Partners can see billing
    canAccessAnalytics: true,
    canAccessAllMatters: true,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: true,
    canArchiveMatter: true,
    canShareMatter: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: true,
    canInviteMembers: true,   // Partners can invite
    canChangeRoles: false,
    canManagePlaybooks: true,
    dashboardKpiSet: "senior",
  },
  junior_advocate: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,  // Only assigned matters
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: false,  // Can suggest, not approve
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "junior",
  },
  advocate: {
    // Same as junior_advocate
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: true,
    canAccessBareActs: true,
    canAccessNyayAssist: true,
    canAccessResearch: true,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canExportDocuments: true,
    canRunAIAnalysis: true,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "junior",
  },
  paralegal: {
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: false,
    canAccessBareActs: false,
    canAccessNyayAssist: false,  // Paralegals don't use AI research
    canAccessResearch: false,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: true,
    canDeleteDocuments: false,
    canExportDocuments: false,
    canRunAIAnalysis: false,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "paralegal",
  },
  client: {
    // Clients should never reach this — they're redirected to /portal
    canAccessAdmin: false,
    canAccessBilling: false,
    canAccessAnalytics: false,
    canAccessAllMatters: false,
    canAccessTemplates: false,
    canAccessBareActs: false,
    canAccessNyayAssist: false,
    canAccessResearch: false,
    canCreateMatter: false,
    canArchiveMatter: false,
    canShareMatter: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canExportDocuments: false,
    canRunAIAnalysis: false,
    canApproveRedlines: false,
    canInviteMembers: false,
    canChangeRoles: false,
    canManagePlaybooks: false,
    dashboardKpiSet: "paralegal",
  },
};

export function getCaps(role: AdvocateRole): RoleCapabilities {
  return ROLE_CAPABILITIES[role] ?? ROLE_CAPABILITIES.junior_advocate;
}
```

### 2.3 Create a `useCapabilities` hook

```typescript
// apps/web/lib/use-capabilities.ts  (new file)
"use client";

import { useAuthStore } from "@/lib/auth";
import { getCaps, type RoleCapabilities, type AdvocateRole } from "@/lib/role-capabilities";

export function useCapabilities(): RoleCapabilities {
  const { user } = useAuthStore();
  return getCaps((user?.role ?? "junior_advocate") as AdvocateRole);
}
```

### 2.4 Apply capabilities throughout the app

In every page or component where an action should be role-restricted, import and use `useCapabilities`:

```typescript
// Example: apps/web/app/matters/page.tsx
const caps = useCapabilities();

// Show "Create Matter" button only to those who can
{caps.canCreateMatter && (
  <Button onClick={openCreateDialog}>New Matter</Button>
)}

// Example: apps/web/app/documents/page.tsx
// Show AI Analysis button only to those with access
{caps.canRunAIAnalysis && (
  <Button onClick={runAnalysis}>Run AI Analysis</Button>
)}

// Show Delete only to those who can delete
{caps.canDeleteDocuments && (
  <Button variant="destructive" onClick={deleteDocument}>Delete</Button>
)}
```

Apply this pattern to:
- `apps/web/app/matters/page.tsx` — Create Matter button
- `apps/web/app/matters/[id]/page.tsx` — Archive, Share, Run Analysis buttons
- `apps/web/app/documents/page.tsx` — Delete, Run AI Analysis, Export buttons
- `apps/web/app/admin/page.tsx` — Already has AuthGuard for admin role, keep it
- `apps/web/app/analytics/page.tsx` — Already has AuthGuard, keep it
- `apps/web/app/nyay-assist/page.tsx` — Wrap entire page content with caps check
- `apps/web/app/research/page.tsx` — Same

### 2.5 Differentiated dashboard views — connect to real analytics

The dashboard already has role-based components (AdminDashboard, SeniorAdvocateDashboard, etc.) that call `analytics.firmOverview()`. The KPI labels need to be differentiated by role. Update each dashboard component to show role-relevant KPIs from the analytics response:

**AdminDashboard KPIs:** Total advocates, open matters, monthly documents processed, DPDP alerts
**SeniorAdvocateDashboard KPIs:** My active matters, hearings this week, docs pending my review, avg matter health score
**JuniorAdvocateDashboard KPIs:** My assigned matters, docs I need to upload, upcoming obligations, research queries this week
**ParalegalDashboard KPIs:** Documents to upload today, upcoming task deadlines

### 2.6 Admin sidebar — separate firm management from legal work

The admin role's sidebar should visually separate firm management from legal work. Update `ALL_NAV_ITEMS` in `AppShell.tsx` to add a group separator label for admin items:

Admin-only nav group (show only for admin role):
- Team Management → `/admin`
- Billing & Plans → `/billing`
- Privacy & DPDP → `/settings/privacy`
- SSO & Security → `/admin#security`

Legal work nav group (all roles except client):
- Dashboard → `/dashboard`
- Matters → `/matters`
- Documents → `/documents`
- Calendar → `/calendar`

Research & Knowledge nav group (admin, senior, junior, advocate):
- Nyay Assist → `/nyay-assist`
- Legal Research → `/research`
- Bare Acts → `/bare-acts`

Analytics (admin, senior, partner):
- Analytics → `/analytics`

---

## Section 3 — Bug Fixes (Priority: High)

### 3.1 Fix: DPDP withdrawal route has no auth middleware

File: `apps/api/src/dpdp.ts`

Both routes (`/api/dpdp/consent/withdraw` and `/api/dpdp/consent/status`) are registered without `preHandler: authenticateRequest`. Add it:

```typescript
// Change:
fastify.post('/api/dpdp/consent/withdraw', async (request, reply) => {

// To:
fastify.post('/api/dpdp/consent/withdraw', { preHandler: authenticateRequest }, async (request, reply) => {

// And:
fastify.get('/api/dpdp/consent/status', { preHandler: authenticateRequest }, async (request, reply) => {
```

### 3.2 Fix: DPDP table name mismatch

File: `apps/api/src/dpdp.ts`

The withdrawal route queries `dpdp_consent` but the existing migration uses `dpdp_requests`. Fix the query to use the correct table:

```typescript
// Change:
await pool.query(
  `UPDATE dpdp_consent 
   SET withdrawn_at = NOW(), withdrawal_reason = $3
   WHERE tenant_id = $1 AND user_id = $2 AND withdrawn_at IS NULL`,
  [tenantId, userId, body.reason ?? null]
);

// To (using existing dpdp_requests table):
await pool.query(
  `INSERT INTO dpdp_requests (tenant_id, advocate_id, request_type, status, details)
   VALUES ($1, $2, 'erasure', 'pending', $3)`,
  [tenantId, userId, JSON.stringify({ reason: body.reason ?? 'User requested erasure' })]
);
```

### 3.3 Fix: Wire the "Raise Erasure Request" button

File: `apps/web/app/settings/privacy/page.tsx`

The "Raise Erasure Request" button has no onClick. Wire it:

```typescript
const [isWithdrawing, setIsWithdrawing] = useState(false);
const [withdrawalDone, setWithdrawalDone] = useState(false);

const handleErasureRequest = async () => {
  if (!window.confirm("This will withdraw your consent and request erasure of your personal data. This cannot be undone. Continue?")) return;
  setIsWithdrawing(true);
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dpdp/consent/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("evidentis_access_token")}`,
      },
      body: JSON.stringify({ reason: "User-initiated withdrawal from privacy settings" }),
    });
    if (res.ok) {
      setWithdrawalDone(true);
      toast.success("Erasure request submitted. Your data will be removed within 30 days.");
    } else {
      toast.error("Failed to submit erasure request. Please try again.");
    }
  } catch {
    toast.error("Network error. Please try again.");
  } finally {
    setIsWithdrawing(false);
  }
};

// Then update the button:
<Button
  variant="outline"
  className="border-red-500/35 text-red-200"
  onClick={handleErasureRequest}
  disabled={isWithdrawing || withdrawalDone}
>
  {isWithdrawing ? "Submitting..." : withdrawalDone ? "Request Submitted" : "Raise Erasure Request"}
</Button>
```

Also replace the hardcoded `consentRecords` array with a real API call:

```typescript
const { data: consentRecords = [] } = useQuery({
  queryKey: ["dpdp-consent-records"],
  queryFn: async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dpdp/requests`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("evidentis_access_token")}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  },
});
```

### 3.4 Fix: Apply the ai_burst rate limiter to AI routes

File: `apps/api/src/routes.ts`

The `ai_burst` rate limiter is defined in `rate-limit.ts` but never registered on any route. Find where the AI proxy routes are registered (`/api/ai/*`) and add the preHandler:

```typescript
import { createRateLimitHandler, RATE_LIMITS } from './rate-limit.js';

// Find the AI route registrations and add preHandler:
fastify.post('/api/ai/research', {
  preHandler: [
    authenticateRequest,
    createRateLimitHandler(RATE_LIMITS.ai_burst),  // per-minute burst limit
    createRateLimitHandler(RATE_LIMITS.ai),         // hourly limit
  ],
}, async (request, reply) => {
  // ...existing handler
});
```

Apply the same dual preHandler to `/api/ai/extract`, `/api/ai/assess`, `/api/ai/obligations`, and `/api/ai/suggest`.

### 3.5 Fix: Add erasure worker in Celery

File: `apps/ai-worker/tasks/erasure.py` (new file)

The DPDP withdrawal route queues to Redis `erasure_jobs` but no worker reads it. Create the worker:

```python
"""
EvidentIS DPDP Erasure Worker
Processes data erasure requests queued by the withdrawal route.
"""
import os
import json
import logging
from celery import shared_task
import httpx

logger = logging.getLogger(__name__)
API_SERVICE_URL = os.getenv("API_SERVICE_URL", "http://api:4000")


@shared_task(bind=True, max_retries=3, default_retry_delay=3600)
def process_erasure_job(self, job_data: dict) -> dict:
    """
    Process a single DPDP erasure job.
    Anonymises PII in the user's records while retaining audit logs
    (required by law — audit logs cannot be fully deleted).
    """
    tenant_id = job_data.get("tenantId")
    user_id = job_data.get("userId")

    try:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                f"{API_SERVICE_URL}/internal/dpdp/erasure",
                headers={"X-Internal-Key": os.getenv("AI_SERVICE_INTERNAL_KEY", "")},
                json={"tenantId": tenant_id, "userId": user_id},
            )
            if response.status_code == 200:
                logger.info("Erasure complete for user %s in tenant %s", user_id, tenant_id)
                return {"status": "completed", "userId": user_id}
            else:
                raise Exception(f"API returned {response.status_code}")
    except Exception as exc:
        logger.error("Erasure failed for %s: %s", user_id, exc)
        raise self.retry(exc=exc)
```

Register this task in `apps/ai-worker/celery_app.py` by importing it alongside existing tasks.

---

## Section 4 — Cleanup (Priority: Medium)

### 4.1 Remove files that should not be in the repository

Delete these files entirely from the repository and run `git rm` on them:

```bash
git rm -r --cached skills-main/
git rm frontend_promt.md
git rm Master_Promt_India.md
git rm apps/web/test-results/.last-run.json
git rm apps/web/playwright-report/index.html 2>/dev/null || true
```

Add to `.gitignore` (if not already present):
```
skills-main/
frontend_promt.md
Master_Promt_India.md
apps/web/test-results/
apps/web/playwright-report/
*.local.md
*_promt.md
*_prompt.md
```

### 4.2 Remove the Ollama KEEP_ALIVE dependency

Since Ollama is now only a fallback (not the primary model), remove `OLLAMA_KEEP_ALIVE=-1` from any Docker config if it was added. Let Ollama unload models after 5 minutes of inactivity to save RAM on the 4GB droplet — it only needs to load when the primary API is unavailable.

### 4.3 Clean up dead legacy references

- In `apps/api/src/legal-rules.ts`: Remove the `US_JURISDICTIONS` alias (line: `export const US_JURISDICTIONS = INDIAN_JURISDICTIONS`) — this is a leftover from a US codebase. It's unused.
- In `.env.example`: Remove the `OPENAI_MODEL=gpt-4o` and `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` lines — these are replaced by Azure OpenAI.
- In `apps/ai-service/config.py`: Remove `openai_fallback_model` and `openai_api_key` fields — replaced by `azure_openai_*` fields.

---

## Section 5 — Indian Laws Database (Priority: Medium)

### 5.1 Do you need it? Yes, for a production legal AI product.

Without a laws database, the RAG pipeline only searches the law firm's own uploaded documents. An advocate asking "What does Section 138 of the Negotiable Instruments Act say?" gets no answer unless someone uploaded that Act. Your users will expect the platform to know Indian law — not just the documents they upload.

**However, do not build your own database right now.** Use existing APIs and seed data. Here is exactly what to do:

### 5.2 Indian Kanoon API (court judgements)

The API route `GET /api/research/indiankanoon` already exists and correctly proxies to Indian Kanoon when `INDIANKANOON_API_KEY` is set. Get a free API key:

1. Email `api@indiankanoon.org` requesting an API key for a legal research platform
2. Free tier gives 500 queries/day — sufficient for 1 month
3. Add to `.env.production`: `INDIANKANOON_API_KEY=your_key_here`

The existing route already falls back to the tenant's local `case_citations` table when the API key is absent or the call fails. No code changes needed — just get the key.

### 5.3 Central Bare Acts — seed from legislation.gov.in

The `bare_acts` table exists but is empty unless demo seed data is run. Seed it with the most important central acts your users need. Create a migration that inserts the core acts:

File: `db/migrations/20260418000024_seed-central-bare-acts.js`

```javascript
exports.up = (pgm) => {
  // Insert the 25 most commonly needed central acts
  // Full text is fetched from legislation.gov.in at runtime via the /api/bare-acts/:slug endpoint
  // This migration only seeds the metadata — full text is fetched on demand
  const acts = [
    { slug: 'indian-contract-act-1872', title: 'Indian Contract Act, 1872', category: 'Contract & Commercial', year: 1872 },
    { slug: 'arbitration-conciliation-act-1996', title: 'Arbitration and Conciliation Act, 1996', category: 'Dispute Resolution', year: 1996 },
    { slug: 'companies-act-2013', title: 'Companies Act, 2013', category: 'Corporate', year: 2013 },
    { slug: 'transfer-of-property-act-1882', title: 'Transfer of Property Act, 1882', category: 'Property', year: 1882 },
    { slug: 'negotiable-instruments-act-1881', title: 'Negotiable Instruments Act, 1881', category: 'Banking & Finance', year: 1881 },
    { slug: 'information-technology-act-2000', title: 'Information Technology Act, 2000', category: 'Technology & Data', year: 2000 },
    { slug: 'dpdp-act-2023', title: 'Digital Personal Data Protection Act, 2023', category: 'Technology & Data', year: 2023 },
    { slug: 'goods-services-tax-act-2017', title: 'Central Goods and Services Tax Act, 2017', category: 'Taxation', year: 2017 },
    { slug: 'real-estate-act-2016', title: 'Real Estate (Regulation and Development) Act, 2016', category: 'Property', year: 2016 },
    { slug: 'consumer-protection-act-2019', title: 'Consumer Protection Act, 2019', category: 'Consumer', year: 2019 },
    { slug: 'code-civil-procedure-1908', title: 'Code of Civil Procedure, 1908', category: 'Procedure', year: 1908 },
    { slug: 'evidence-act-1872', title: 'Indian Evidence Act, 1872', category: 'Procedure', year: 1872 },
    { slug: 'limitation-act-1963', title: 'Limitation Act, 1963', category: 'Procedure', year: 1963 },
    { slug: 'specific-relief-act-1963', title: 'Specific Relief Act, 1963', category: 'Contract & Commercial', year: 1963 },
    { slug: 'intellectual-property-act-1999', title: 'Trade Marks Act, 1999', category: 'Intellectual Property', year: 1999 },
    { slug: 'copyright-act-1957', title: 'Copyright Act, 1957', category: 'Intellectual Property', year: 1957 },
    { slug: 'patents-act-1970', title: 'Patents Act, 1970', category: 'Intellectual Property', year: 1970 },
    { slug: 'labour-code-wages-2019', title: 'Code on Wages, 2019', category: 'Labour', year: 2019 },
    { slug: 'industrial-relations-code-2020', title: 'Industrial Relations Code, 2020', category: 'Labour', year: 2020 },
    { slug: 'insolvency-bankruptcy-code-2016', title: 'Insolvency and Bankruptcy Code, 2016', category: 'Corporate', year: 2016 },
    { slug: 'prevention-money-laundering-2002', title: 'Prevention of Money Laundering Act, 2002', category: 'Financial Crimes', year: 2002 },
    { slug: 'foreign-exchange-management-1999', title: 'Foreign Exchange Management Act, 1999', category: 'Banking & Finance', year: 1999 },
    { slug: 'sebi-act-1992', title: 'Securities and Exchange Board of India Act, 1992', category: 'Banking & Finance', year: 1992 },
    { slug: 'stamp-act-1899', title: 'Indian Stamp Act, 1899', category: 'Property', year: 1899 },
    { slug: 'bharatiya-nyaya-sanhita-2023', title: 'Bharatiya Nyaya Sanhita, 2023', category: 'Criminal', year: 2023 },
  ];

  for (const act of acts) {
    pgm.sql(`
      INSERT INTO bare_acts (slug, title, category, year, jurisdiction, is_central, is_active)
      VALUES ('${act.slug}', '${act.title}', '${act.category}', ${act.year}, 'IN', true, true)
      ON CONFLICT (slug) DO NOTHING;
    `);
  }
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM bare_acts WHERE is_central = true AND jurisdiction = 'IN'`);
};
```

### 5.4 Embed bare acts into the RAG pipeline

The biggest quality improvement you can make to NyayAssist is including bare acts text in the vector search so advocates can ask questions about specific sections and get accurate answers.

In `apps/api/src/routes.ts`, update the research endpoint to also search `bare_acts` sections when building RAG context:

```typescript
// In the research route handler, after fetching document chunks, also fetch relevant act sections:
const actSections = await query(
  `SELECT bas.section_number, bas.section_title, bas.section_text, ba.title as act_title
   FROM bare_act_sections bas
   JOIN bare_acts ba ON bas.act_id = ba.id
   WHERE bas.embedding <=> $1 < 0.4   -- cosine distance threshold
   ORDER BY bas.embedding <=> $1
   LIMIT 3`,
  [queryEmbeddingVector]
);
// Include actSections in the context passed to the AI service
```

### 5.5 What NOT to build right now

Do not attempt to:
- Scrape and import all state legislation (38 states/UTs × hundreds of acts = months of work)
- Build your own court judgement database (Indian Kanoon API covers this)
- Integrate SCC Online or Manupatra (paid, expensive)
- Build a full-text search index on legislation.gov.in content

The Indian Kanoon API + 25 central acts seeded above covers ~80% of what a typical commercial law firm needs. Add state-specific acts incrementally as real user requests reveal the gaps.

---

## Section 6 — What NOT to Change

Do not touch these things — they are working correctly:

- `apps/api/src/orchestrator.ts` — The BullMQ async pipeline is correct
- `apps/api/src/security-hardening.ts` — Security headers are correct
- `apps/web/middleware.ts` — Nonce-based CSP is correct and production-ready
- `apps/web/components/shared/AiFeedbackButton.tsx` — Correctly implemented
- `apps/web/components/shared/UpgradePrompt.tsx` — Correctly implemented and wired
- `apps/ai-service/routers/research.py` chunk deduplication — Keep it
- `db/migrations/20260417000022_hnsw-vector-index.js` — Correct HNSW migration
- `db/migrations/20260417000023_tenant-onboarding.js` — Correct server-side tracking
- `apps/api/src/dpdp.ts` route structure — Just needs auth preHandler (Section 3.1)
- All existing AuthGuard wrappers on admin and analytics pages

---

## Section 7 — Deployment Checklist

After all code changes, do these in order:

1. **Pull the fallback model** on your DigitalOcean droplet:
   ```bash
   docker exec $(docker ps -qf name=evidentis_ollama) \
     ollama pull qwen2.5:3b-instruct-q3_K_M
   ```

2. **Run the new migrations**:
   ```bash
   docker exec $(docker ps -qf name=evidentis_api) \
     npm run migrate:up -w @evidentis/api
   ```

3. **Update `.env.production`** with your actual Azure and Groq keys.

4. **Redeploy the stack**:
   ```bash
   set -a && source .env.production && set +a
   docker stack deploy -c docker-compose.prod.yml evidentis
   ```

5. **Verify all services healthy**:
   ```bash
   curl https://api.evidentis.tech/health/ready
   ```

6. **Test the AI pipeline** — upload a test contract and confirm clause extraction completes in under 30 seconds.

7. **Verify Groq streaming** — open NyayAssist and ask a legal question. First token should appear within 1 second.

---

## Quick Reference: Expected Response Times After Implementation

| Task | Before | After | Model used |
|---|---|---|---|
| Clause extraction | 140–180s | 8–14s | Azure GPT-4o-mini |
| Risk assessment | 160–200s | 10–16s | Azure GPT-4o-mini |
| Obligation extraction | 120–155s | 6–10s | Azure GPT-4o-mini |
| Redline suggestions | 150–200s | 10–18s | Azure GPT-4o-mini |
| NyayAssist research | 100–130s | 2–4s (streamed) | Groq Llama 3.1 8B |
| Full doc pipeline | 7–10 min | 45–90s | Azure + local |
| Embeddings | 5–8s | 4–7s | BGE-M3 local |

**Estimated monthly cost from student pack:**
- DigitalOcean droplet + Spaces: $29 (from $200 credit)
- Azure GPT-4o-mini (1,000 documents): ~$2–4 (from $100 credit)
- Groq research queries: $0 (free tier, 6,000 req/day)
- **Total out of pocket: $0**