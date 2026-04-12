## ✅ Session 33 Python Audit Remediation (2026-04-12)

| Item | Status | Resolution |
|---|---|---|
| CI `python-checks` dependency audit failure | ✅ Fixed | Upgraded `sentencepiece` from `0.2.0` to `0.2.1` in `apps/ai-service/requirements.txt` to remediate `CVE-2026-1260` flagged by `pip-audit`. |

### Verification snapshot
- `pip-audit -r apps/ai-service/requirements.txt` ✅
- Result: **No known vulnerabilities found** ✅

---

## ✅ Session 32 Python Checks Remediation (2026-04-12)

| Item | Status | Resolution |
|---|---|---|
| CI `python-checks` mypy failure in `test_research_helpers.py` | ✅ Fixed | Added explicit payload typing (`list[str \| dict[str, Any]]`) for `build_chunks_from_payload` test input and casted stream alias test request to FastAPI `Request` (`cast(Request, SimpleNamespace())`) to satisfy strict argument types. |

### Verification snapshot
- `mypy main.py config.py domain_models.py explainability.py llm_safety.py prompts routers models evaluation tests/test_ai_service.py tests/test_domain_models.py tests/test_explainability.py tests/test_llm_safety.py tests/test_router_logic.py tests/test_research_helpers.py --ignore-missing-imports` ✅
- `pytest tests/ -v --tb=short --cov=. --cov-config=.coveragerc --cov-report=json` ✅
- Coverage result: **78.4%** ✅

---

## ✅ Session 31 Python Coverage Remediation (2026-04-12)

| Item | Status | Resolution |
|---|---|---|
| Python coverage gate request (≥75%) | ✅ Fixed | Corrected `apps/ai-service/.coveragerc` omit patterns to include working repo-relative paths and added targeted research helper unit tests (`apps/ai-service/tests/test_research_helpers.py`). |
| CI python coverage threshold | ✅ Updated | `.github/workflows/ci.yml` python coverage check now enforces `>= 75`. |

### Verification snapshot
- `pytest tests/ -v --tb=short --cov=. --cov-config=.coveragerc --cov-report=json` ✅
- Coverage result: **78.4%** (passes required 75% gate) ✅

---

## ✅ Session 29 Remediation Status (2026-04-12)

All production-impacting issues listed below are now resolved in code and wired end-to-end.

| Item | Status | Resolution |
|---|---|---|
| #1 Professional plan drift | ✅ Fixed | `apps/api/src/billing.ts` now differentiates Growth vs Professional tier limits/pricing/support/language envelope. |
| #2 Duplicate attorney/advocate usage counters | ✅ Fixed | Billing usage payload keeps advocate counters only. |
| #3/#4 Matter schema drift | ✅ Fixed | `matterCreateSchema` uses `MATTER_TYPES` + `INDIAN_STATE_CODES`, with canonical India naming and compatibility normalization. |
| #5 Invite role still accepted `attorney` | ✅ Fixed | Invite role schema is advocate-first (`ADVOCATE_ROLES`) with legacy alias normalization. |
| #6/#7 Auth token wording/fallback role drift | ✅ Fixed | `auth.ts` comments + legacy refresh fallback use `advocate`. |
| #8 MSG91 sender mismatch | ✅ Fixed | API config/default env aligned to `EVDTIS` per master prompt. |
| #9 Embedding dimension mismatch risk | ✅ Fixed | Added runtime embedding-dimension assertions in API embedding cache/query path; invalid cache entries are discarded and mismatches fail fast. |
| #10 MATTER_TYPES duplicates/legacy aliases | ✅ Fixed | Shared matter taxonomy normalized (`merger_acquisition`, `intellectual_property`, de-duplication). |
| #11 research.py retrieval stub silent failure | ✅ Fixed | Stub now explicitly warns and raises clear `NotImplementedError`/503 when DB retrieval is not configured. |
| #12 Shared matter contract naming drift | ✅ Fixed | Shared/web/api matter mapping aligned to advocate + paise naming with compatibility aliases. |
| #13/#14 Attorney naming drift in enforcement/request context | ✅ Fixed | Advocate-first naming adopted across route middleware and auth request surface. |
| #15 APP_ENCRYPTION_KEY unsafe optionality | ✅ Fixed | Deterministic non-prod default and strict production minimum validation enforced. |
| #16 audit_events legacy column naming | ✅ Documented | Column remains legacy (`actor_attorney_id`) for migration compatibility; runtime semantics use advocate IDs. |
| #17 SAC code specificity | ✅ Fixed | Billing/GST record path uses SAC `998212`. |
| #18 Missing India AI config schema fields | ✅ Fixed | Added/validated embedding + Indic model fields in API config schema. |
| Claim: AI service lacked auth/rate limiting | ✅ Fixed | AI service now enforces optional internal key and request-rate throttling middleware; API/worker forward `X-Internal-Key`. |
| Claim: Hardcoded research confidence + weak citation metadata | ✅ Fixed | Confidence now derived from evidence quality; citations include richer metadata fields. |
| Claim: Tesseract English-only container | ✅ Fixed | Docker now installs major Indic Tesseract language packs in builder + runtime stages. |
| Claim: Missing India operations APIs | ✅ Fixed | Added `/api/auth/otp/*`, `/api/bare-acts*`, `/api/court-cases*`, `/api/hearings`, `/api/invoices*`, `/api/dpdp/*`, `/api/research/indiankanoon`. |
| Claim: IndicTrans tokenizer deps missing | ✅ Fixed | Added `sentencepiece` and `sacremoses` to AI requirements. |
| Claim: Root `npm run dev` race behavior | ✅ Fixed | Root dev startup now uses ordered orchestration (`concurrently` + `dev:web:wait`) so web waits for API port readiness. |

### Verification snapshot
- `npm run typecheck --workspace=apps/api` ✅
- `npm run build --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `pytest apps/ai-service/tests -q` ✅ (105 passed)

---

🔴 Critical Issues
1. Duplicate growth / professional Plans in billing.ts
File: apps/api/src/billing.ts
Both growth and professional have identical prices and limits (priceInPaise: 1499900, 15 advocates, 500 docs/month). This is almost certainly a copy-paste error.
Fix:
ts// billing.ts — differentiate professional from growth
growth: {
  name: 'Growth',
  priceInPaise: 1499900,   // ₹14,999/month
  gstRatePercent: 18,
  features: {
    maxAdvocates: 15,
    maxDocumentsPerMonth: 500,
    maxResearchQueriesPerMonth: 1000,
    aiTier: 'hybrid',
    languages: PRIMARY_LANGUAGE_CODES,
    support: 'priority',
  },
},
professional: {
  name: 'Professional',
  priceInPaise: 2499900,   // ₹24,999/month — FIXED (was same as growth)
  gstRatePercent: 18,
  features: {
    maxAdvocates: 30,                    // FIXED (was 15)
    maxDocumentsPerMonth: 2000,          // FIXED (was 500)
    maxResearchQueriesPerMonth: 5000,    // FIXED (was 1000)
    aiTier: 'premium_api',              // FIXED (was 'hybrid')
    languages: SUPPORTED_LANGUAGE_CODES, // FIXED (was PRIMARY only)
    support: 'dedicated',               // FIXED (was 'priority')
  },
},

2. attorneys Table Queried Instead of Correct India Table in billing.ts
File: apps/api/src/billing.ts — getBillingStatus()
ts// WRONG — uses old attorneys table alias
const advocatesResult = await pool.query<{ count: string }>(
  `SELECT COUNT(*) FROM attorneys WHERE tenant_id = $1 AND status = 'active'`,
  [tenantId]
);
The attorneys table exists but the BillingStatus interface has both advocatesActive and attorneysActive set to the same value — a redundant leftover. Clean it up:
Fix:
ts// billing.ts — BillingStatus interface: remove the duplicate attorneysActive/Limit fields
export interface BillingStatus {
  plan: PlanType;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  usage: {
    documentsThisMonth: number;
    documentsLimit: number | null;
    researchThisMonth: number;
    researchLimit: number | null;
    advocatesActive: number;    // ← keep
    advocatesLimit: number | null;
    // REMOVE: attorneysActive and attorneysLimit (duplicates)
  };
}

// In getBillingStatus(), update the return block:
return {
  ...
  usage: {
    documentsThisMonth: quota.current_month_docs,
    documentsLimit: quota.monthly_doc_limit,
    researchThisMonth: quota.current_month_research,
    researchLimit: quota.monthly_research_limit,
    advocatesActive: Number.parseInt(advocatesResult.rows[0]?.count ?? '0', 10),
    advocatesLimit: planConfig.features.maxAdvocates,
    // REMOVE the two attorney* lines
  },
};

3. matterCreateSchema Uses USA-Only governingLawState: z.string().length(2) — Wrong for India
File: apps/api/src/routes.ts
Indian state codes are 2-letter (like MH, DL) but the validation just uses z.string().length(2) — no validation against actual Indian states. Additionally dealValueCents is still named in US dollars/cents terminology.
Fix:
ts// routes.ts — matterCreateSchema
import { INDIAN_STATE_CODES } from '@evidentis/shared';

const matterCreateSchema = z.object({
  matterCode: z.string().min(1),
  matterName: z.string().min(1),
  matterType: z.enum(MATTER_TYPES),                       // ← use the shared constant
  clientName: z.string().min(1),
  counterpartyName: z.string().optional(),
  governingLawState: z.enum(INDIAN_STATE_CODES).optional(), // ← validate against real codes
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  leadAdvocateId: z.string().uuid().optional(),            // ← rename from leadAttorneyId
  targetCloseDate: z.string().optional(),
  dealValuePaise: z.number().int().positive().optional(),  // ← rename from dealValueCents
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
Also update DB insert accordingly (deal_value_paise column, not deal_value_cents).

4. matterType Enum in Routes Doesn't Match Shared MATTER_TYPES
File: apps/api/src/routes.ts
ts// routes.ts uses hardcoded subset:
matterType: z.enum(['ma_transaction', 'commercial_contract', 'real_estate', 
                    'litigation', 'ip', 'employment', 'regulatory']),
But packages/shared/src/index.ts defines 18 types including India-specific ones like criminal_defense, family_law, tax_gst, insolvency, consumer_dispute, constitutional, arbitration.
Fix:
tsimport { MATTER_TYPES } from '@evidentis/shared';

// In matterCreateSchema:
matterType: z.enum(MATTER_TYPES),

5. inviteSchema Still Includes 'attorney' Role
File: apps/api/src/routes.ts
ts// WRONG — 'attorney' is a USA term
role: z.enum(['attorney', 'admin', 'partner', 'paralegal', 
              'senior_advocate', 'junior_advocate', 'client']).optional(),
The Master Prompt mandates: replace attorney → advocate.
Fix:
tsimport { ADVOCATE_ROLES } from '@evidentis/shared';

role: z.enum(ADVOCATE_ROLES).optional(),
// ADVOCATE_ROLES already includes: 'admin', 'senior_advocate', 'junior_advocate',
// 'paralegal', 'partner', 'client', 'advocate'

6. auth.ts — JWT TokenPayload.sub Comment Says "Attorney ID"
File: apps/api/src/auth.ts
ts// WRONG comment
export interface TokenPayload extends JWTPayload {
  sub: string; // Attorney ID  ← should be Advocate ID
Minor but causes confusion across the whole codebase since sub is referenced everywhere.
Fix:
tsexport interface TokenPayload extends JWTPayload {
  sub: string; // Advocate ID
  ...
}

7. createRefreshToken Legacy Fallback Uses role: 'attorney'
File: apps/api/src/auth.ts
tsreturn generateRefreshToken({
  sub: payloadOrSub,
  tenantId: 'legacy-tenant',
  email: 'legacy@example.com',
  role: 'attorney',   // ← USA role name
  tokenId: crypto.randomUUID(),
});
Fix:
tsrole: 'advocate',  // corrected

8. MSG91_SENDER_ID Mismatch Between Config and .env.example
File: apps/api/src/config.ts vs .env.example

config.ts defaults MSG91_SENDER_ID to 'NYAYA'
.env.example sets MSG91_SENDER_ID=NYAYA
Master Prompt specifies MSG91_SENDER_ID=EVDTIS

The sender ID must be pre-registered with MSG91. Using the wrong ID will cause SMS delivery failures.
Fix — config.ts:
tsMSG91_SENDER_ID: z.string().default('EVDTIS'),
Fix — .env.example:
MSG91_SENDER_ID=EVDTIS

9. Embedding Dimension Mismatch Risk — OPENAI_EMBEDDING_MODEL Left as text-embedding-3-small
File: apps/api/src/config.ts and .env.example
The config still has:
tsOPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
text-embedding-3-small outputs 1536 dimensions, but the DB migration sets vector(768) (LaBSE). If OpenAI embeddings are ever used for the document_chunks table, pgvector will throw a dimension mismatch error.
Fix — config.ts:
ts// Clarify that OpenAI embeddings are ONLY for fallback LLM, never for vector storage
OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
// Add a note or remove this entirely if LaBSE is always used
Better: Add a runtime assertion in the embedding pipeline to guard against this.
ts// In embedding-cache.ts or wherever embeddings are generated:
if (embeddingVector.length !== config.EMBEDDING_DIM) {
  throw new Error(
    `Embedding dimension mismatch: expected ${config.EMBEDDING_DIM}, got ${embeddingVector.length}`
  );
}

🟡 Significant Issues
10. MATTER_TYPES in shared/index.ts Contains Duplicates
File: packages/shared/src/index.ts
tsexport const MATTER_TYPES = [
  'litigation', 'criminal_defense', 'civil_dispute', 'commercial_contract',
  'corporate_advisory', 'real_estate', 'labour_employment', 'family_law',
  'tax_gst', 'insolvency', 'consumer_dispute', 'constitutional',
  'arbitration', 'regulatory_compliance',
  'ma_transaction',        // ← USA M&A term, should be 'merger_acquisition'
  'ip',                    // ← abbreviated, should be 'intellectual_property'
  'employment',            // ← DUPLICATE of 'labour_employment'
  'regulatory',            // ← DUPLICATE of 'regulatory_compliance'
] as const;
Fix:
tsexport const MATTER_TYPES = [
  'litigation',
  'criminal_defense',
  'civil_dispute',
  'commercial_contract',
  'corporate_advisory',
  'real_estate',
  'labour_employment',
  'family_law',
  'tax_gst',
  'insolvency',
  'consumer_dispute',
  'constitutional',
  'arbitration',
  'regulatory_compliance',
  'merger_acquisition',       // renamed from ma_transaction
  'intellectual_property',    // renamed from ip
] as const;

11. ai-service/routers/research.py — get_relevant_chunks() Is a Stub (Always Returns [])
File: apps/ai-service/routers/research.py
python# TODO: In production, this would be:
# SELECT dc.id ...
# Mock return for now
return []
When chunks aren't passed from the API layer and the service tries its own DB lookup, it returns nothing — silently producing empty research results with no error. This is a silent failure.
Fix — at minimum, log a warning and raise an HTTP error:
pythonasync def get_relevant_chunks(...) -> List[ChunkForRAG]:
    if not pg_connection_string:
        logger.warning(
            "get_relevant_chunks called without DB connection string; "
            "no chunks retrieved. Ensure API layer passes pre-fetched chunks."
        )
        return []
    # TODO: implement actual DB query via asyncpg
    raise NotImplementedError(
        "Direct DB retrieval not yet implemented in ai-service. "
        "API layer must pass chunks in request body."
    )

12. shared/index.ts — Matter Type Still Has leadAttorneyId and dealValueCents
File: packages/shared/src/index.ts
tsexport interface Matter {
  governingLawState: IndianStateCode | null;
  leadAttorneyId: string | null;   // ← should be leadAdvocateId
  dealValueCents?: number | null;  // ← should be dealValuePaise
}
This creates type confusion throughout the frontend and API.
Fix:
tsexport interface Matter {
  governingLawState: IndianStateCode | null;
  leadAdvocateId: string | null;    // renamed
  dealValuePaise?: number | null;   // renamed + correct unit
}

// Keep backward compat alias if needed during migration:
/** @deprecated use leadAdvocateId */
leadAttorneyId?: string | null;

13. billing-enforcement.ts References enforceAttorneyLimit Exported with Wrong Naming
File: apps/api/src/billing-enforcement.ts and routes.ts
The function is called enforceAttorneyLimit but the Master Prompt says all "attorney" references must become "advocate". Both the export and all imports in routes.ts need renaming.
Fix:
ts// billing-enforcement.ts
export async function enforceAdvocateLimit(  // renamed
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> { ... }

// routes.ts — update the import
import {
  enforceDocumentQuota,
  enforceResearchQuota,
  enforceAdvocateLimit,   // updated
  enforceActiveSubscription,
  ...
} from './billing-enforcement.js';

14. AuthenticatedRequest Uses attorneyId and attorneyRole — Should Be advocateId/advocateRole
File: apps/api/src/routes.ts
tsinterface AuthenticatedRequest extends FastifyRequest {
  tenantId: string;
  attorneyId: string;   // ← should be advocateId
  attorneyRole: string; // ← should be advocateRole
  tokenPayload: AccessTokenPayload;
}
This leaks into every downstream handler (e.g., authReq.attorneyId appears 40+ times across routes).
Fix: Rename the interface fields and do a project-wide find-replace:
tsinterface AuthenticatedRequest extends FastifyRequest {
  tenantId: string;
  advocateId: string;
  advocateRole: string;
  tokenPayload: AccessTokenPayload;
}

15. config.ts — APP_ENCRYPTION_KEY Is Optional in Non-Production
File: apps/api/src/config.ts
tsAPP_ENCRYPTION_KEY: isProductionEnv
  ? z.string().min(64, '...')
  : z.string().min(64).optional(),
If APP_ENCRYPTION_KEY is not set in development, any code that calls AES-256-GCM encryption will throw at runtime rather than at startup. This makes bugs hard to catch.
Fix:
tsAPP_ENCRYPTION_KEY: isProductionEnv
  ? z.string().min(64, 'APP_ENCRYPTION_KEY must be at least 64 chars in production')
  : z.string().min(64).default(
      // deterministic dev key — clearly not for production
      'dev-only-key-do-not-use-in-production-00000000000000000000000000000000'
    ),

🟢 Minor Issues
16. audit_events Insert in Login Route Uses actor_attorney_id Column Name
File: apps/api/src/routes.ts
ts`INSERT INTO audit_events (tenant_id, actor_attorney_id, event_type, ip_address, user_agent)
 VALUES ($1, $2, $3, $4, $5)`
The migration creates the column as actor_attorney_id. While technically consistent, the Master Prompt mandates advocate terminology. This should align with India naming — either update the migration column name to actor_advocate_id (and update all inserts) or at minimum document the deliberate exception.

17. legal-rules.ts Prompt Mentions SAC Code 998212 — Verify for Legal Services
File: apps/api/src/legal-rules.ts (cross-reference with billing.ts notes field)
tssacCode: '9982',  // in billing.ts notes
SAC 9982 is the top-level group. Legal services specifically fall under SAC 998212 (Legal advisory and representation services) per GST schedule. Using just 9982 may cause GST filing issues.
Fix — billing.ts:
tsnotes: {
  tenantId,
  plan,
  subtotalPaise: String(totals.subtotalPaise),
  gstAmountPaise: String(totals.gstAmountPaise),
  sacCode: '998212',   // corrected to specific legal services SAC
},

18. Missing EMBEDDING_MODEL / EMBEDDING_DIM in config.ts Schema
File: apps/api/src/config.ts
The .env.example exposes EMBEDDING_MODEL=sentence-transformers/LaBSE and EMBEDDING_DIM=768, but config.ts has no corresponding schema fields. These go unvalidated at startup.
Fix — add to configSchema:
tsEMBEDDING_MODEL: z.string().default('sentence-transformers/LaBSE'),
EMBEDDING_DIM: z.coerce.number().default(768),
INDIC_TRANS_MODEL: z.string().default('ai4bharat/indictrans2-en-indic-1B'),
FIRM_GSTIN: z.string().optional(),
GST_RATE: z.coerce.number().default(18),
(Some are already in the schema, but EMBEDDING_MODEL, EMBEDDING_DIM, and INDIC_TRANS_MODEL are missing from config.ts but present in .env.example per the Master Prompt.)

⚠️ Claim 2: "Monorepo dev script has race conditions" — PARTIALLY TRUE (minor)
The root npm run dev does run all workspaces in parallel with no ordering. However, the issue is much smaller than presented because:

Separate dev:api and dev:web scripts already exist
In Docker Compose (the correct way to run the full stack), depends_on: condition: service_healthy is already wired correctly

The only real gap: The bare npm run dev (non-Docker path) has no wait-on guard. This is a legitimate but low-severity issue for local development only, not a production risk.

✅ Claim 4: "AI service has no rate limiting, no auth" — TRUE — this is a real gap
Evidence — apps/ai-service/requirements.txt: No slowapi, no auth library.
Evidence — apps/ai-service/main.py: No API key middleware, no rate limiting decorator anywhere. The comment says "AI service is internal-only" as justification — but that's a network trust assumption, not a security control. If the internal network is ever breached or misconfigured, every AI endpoint is fully open.
Fix needed — apps/ai-service/main.py:
python# Add to requirements.txt
slowapi==0.1.9

# Add to main.py
import os
from fastapi import Request, HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

INTERNAL_API_KEY = os.environ.get("AI_SERVICE_INTERNAL_KEY", "")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Internal auth middleware
@app.middleware("http")
async def verify_internal_key(request: Request, call_next):
    # Skip health check
    if request.url.path in ("/health", "/"):
        return await call_next(request)
    key = request.headers.get("X-Internal-Key", "")
    if INTERNAL_API_KEY and key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await call_next(request)

# Then on heavy endpoints:
@router.post("")
@limiter.limit("30/minute")
async def research(request: Request, body: ResearchQuery):
    ...
Add AI_SERVICE_INTERNAL_KEY to .env.example and the API's outbound calls.

✅ Claim 10: "No citation verification / court source reliability layer" — PARTIALLY TRUE
There IS a confidence field and LegalCitation dataclass in explainability.py — so it's not completely absent. But the claim is right that it's insufficient. The real gaps are:

Hardcoded confidence — generate_research_answer() always returns 0.8 regardless of evidence quality
No court source tagging — citations don't carry court_type, year, bench_strength
No IndiaKanoon cross-validation — AI-generated citations aren't verified against the actual case database

Fix for research.py:
pythondef score_answer_confidence(
    answer: str,
    chunks: List[ChunkForRAG],
    jurisdiction: Optional[str]
) -> float:
    """Derive confidence from evidence quality, not a constant."""
    if not chunks:
        return 0.1
    avg_relevance = sum(c.relevance_score for c in chunks) / len(chunks)
    source_bonus = min(len(chunks) * 0.05, 0.2)  # more sources = higher confidence
    jurisdiction_match = 0.1 if jurisdiction else 0.0
    return min(round(avg_relevance + source_bonus + jurisdiction_match, 2), 0.95)
And add court source tagging to Citation:
pythonclass Citation(BaseModel):
    document_id: str
    document_name: str
    chunk_id: str
    text_excerpt: str
    page_number: Optional[int] = None
    relevance_score: float
    court_type: Optional[str] = None        # "Supreme Court", "High Court", etc.
    judgment_year: Optional[int] = None
    source_verified: bool = False            # True if cross-checked with IndiaKanoon

    Issue 2 — MAJOR: Tesseract only has English (tesseract-ocr-eng)
The Dockerfile installs tesseract-ocr-eng in both builder and runner stages but no Indian language packs. The config correctly defines ocr_languages = "eng+hin+ben+tam+tel+kan+mal+mar+guj+pan+ori+asm+urd..." but Tesseract will silently fall back to English-only because the language data files aren't installed. Every Indian language document will get poor OCR.
Fix in apps/ai-service/Dockerfile, in both the builder and runner apt-get install blocks:
dockerfile# Replace:
tesseract-ocr \
tesseract-ocr-eng \

# With:
tesseract-ocr \
tesseract-ocr-eng \
tesseract-ocr-hin \
tesseract-ocr-ben \
tesseract-ocr-tam \
tesseract-ocr-tel \
tesseract-ocr-kan \
tesseract-ocr-mal \
tesseract-ocr-mar \
tesseract-ocr-guj \
tesseract-ocr-pan \
tesseract-ocr-ori \
tesseract-ocr-urd \
tesseract-ocr-san \

Issue 3 — MAJOR: Zero India-specific API routes implemented
routes.ts has 56 route handlers but none for the India-specific features the schema was built for — no /api/bare-acts, no /api/court-cases, no /api/hearings, no /api/otp/send, no /api/invoices, no /api/dpdp, no IndiaKanoon proxy. The database tables (bare_acts, court_cases, hearing_dates, invoices, advocate_otps) exist but are completely unreachable from the API. The frontend pages (/bare-acts, /calendar, /billing) fetch from these endpoints but will get 404s.
This is the biggest gap between what's been built and what's needed. The routes need to be added. At minimum for a working MVP:
POST /api/auth/otp/send        — send OTP via MSG91
POST /api/auth/otp/verify      — verify OTP and issue JWT
GET  /api/bare-acts            — list acts from bare_acts table
GET  /api/bare-acts/:slug      — get sections for an act
GET  /api/court-cases          — list CNR cases for tenant
POST /api/court-cases          — add CNR number, trigger eCourts sync
GET  /api/hearings             — get upcoming hearings
GET  /api/invoices             — list GST invoices
POST /api/invoices             — create GST invoice
GET  /api/dpdp/requests        — list DPDP rights requests
POST /api/dpdp/consent         — record DPDP consent
GET  /api/research/indiankanoon — proxy IndiaKanoon search

#5 — IndicTrans2 not in requirements.txt
config.py sets translation_model = "ai4bharat/indictrans2-en-indic-1B" but the package needed to load it (ctranslate2 or transformers with the right tokenizer packages like sentencepiece, sacremoses) isn't pinned. When the translation feature is actually called, it will fail at import. Add to requirements.txt:
sentencepiece==0.2.0
sacremoses==0.1.1
#6 — growth plan still exists alongside professional
Once you fix Issue 1 (price differentiation), you'll have starter, growth, professional, enterprise, custom — that's 5 tiers which is more than most B2B SaaS products need at launch. Consider dropping growth and going starter → professional → enterprise for simplicity. The fewer tiers, the easier the sales conversation with advocates.
