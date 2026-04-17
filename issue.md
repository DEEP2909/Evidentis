Features that exist in docs but are stubs in code
Critical
NyayAssist sends hardcoded fake replies — not connected to AI
apps/web/app/nyay-assist/page.tsx → sendMessage()
The chat sends a user message, then after window.setTimeout, appends a fixed string: "Draft response prepared with citations…" regardless of what was asked. The actual /research API endpoint exists — it just isn't being called. Wire sendMessage() to POST /api/research and stream the response tokens into the chat bubble. This is your most prominent feature on the India-facing product.
Critical
Dashboard KPI cards show hardcoded demo numbers to every real user
apps/web/app/dashboard/page.tsx lines ~100, ~211, ~336, ~384
Every role — admin, senior advocate, junior advocate, paralegal — has their KPIs hardcoded as static strings ("12", "128", "2,847", "78%"). A real law firm logging in sees their dashboard say "Active Advocates: 12" when they have 3. Call GET /api/analytics/summary on mount and populate these values. Until then, the product looks like a demo.
Critical
PDF in-document search returns mock results
apps/web/components/PDFViewer.tsx line 399: "return mock results"
The PDF viewer has a search box that returns mock data. Either connect it to a client-side text extraction search over the rendered PDF pages using pdf.js's built-in getTextContent(), or call POST /api/documents/:id/search. In-document search is table stakes for any document review tool.
Critical
Quick Research buttons on dashboard have no onClick handlers
apps/web/app/dashboard/page.tsx → SeniorAdvocateDashboard quick research section
The three suggested research queries ("Section 138 NI Act", "RERA compliance", "BNS mappings from IPC") render as buttons but clicking them does nothing — no navigation, no API call. They should either router.push('/research?q=...') with the query pre-filled, or open an inline research panel. This creates a terrible first impression for new users.
High
Obligation reminder worker runs at UTC midnight — wrong for Indian users
apps/ai-worker/tasks/obligation_remind.py → send_daily_reminders()
The task description says "Runs every morning at 8 AM" but all datetime logic uses datetime.utcnow(). UTC midnight is 5:30 AM IST — reminders fire before advocates start their day. Change to datetime.now(tz=ZoneInfo('Asia/Kolkata')) throughout, and schedule Celery Beat with an IST-aware cron (0 8 * * * in IST = 30 2 * * * UTC).
Frontend & user experience
High
No empty states — blank pages when a new tenant has zero data
apps/web/app/documents/page.tsx, matters/page.tsx, research/page.tsx
When a new firm signs up, every page shows an empty list with no guidance. Add onboarding empty states: "Upload your first contract to get started" with a direct upload CTA on the documents page, "Create your first matter" on matters, and a few pre-filled example queries on the research page. This is the single highest-impact UX change for activation rate.
High
No loading skeletons on matter detail and document pages
apps/web/app/matters/[id]/page.tsx, documents/ pages
Pages flash blank white while data loads. The shared Skeletons.tsx component exists and has the right patterns — it just isn't being used on these pages. Wrap data-dependent sections in skeleton placeholders during the loading state. The component is already built; it just needs to be wired in.
High
Research inline input in matter detail doesn't submit
apps/web/app/matters/[id]/page.tsx line ~511
There's an <Input placeholder="e.g., What are the termination conditions?" /> with no form, no submit button, and no handler. It's a dead UI element. Either connect it to the research API scoped to that matter's documents, or remove it until it's implemented — dead inputs erode trust.
Medium
Mobile keyboard pushes fixed layout off-screen on iOS
apps/web/tests/ux-mobile-keyboard.spec.ts (test exists but likely failing)
The test file ux-mobile-keyboard.spec.ts exists, meaning this was a known issue. On iOS Safari, 100vh doesn't account for the virtual keyboard. Replace min-h-screen / h-screen with min-h-[100dvh] / h-[100dvh] (dynamic viewport height) on the chat and research pages where users type frequently.
Medium
Risk assessment results have no visual severity hierarchy
apps/web/components/documents/ risk display components
Critical and low risks render identically — there's no colour-coded badge, no sorting by severity, no collapse-by-default for low risks. An advocate reviewing a 40-clause contract shouldn't have to scan through 30 low-risk items to find the 2 critical ones. Sort by severity descending, colour-code the severity badge (red/amber/yellow/blue), and collapse low/medium by default.
Quick win
Obligation calendar page exists as a route but has no reminder badge
apps/web/app/calendar/page.tsx, AppShell nav
The obligation reminders worker fires emails, but there's no in-app notification badge on the calendar nav icon showing how many obligations are due in the next 7 days. Add a simple red badge pulled from GET /api/obligations?due_within_days=7&count=true. Takes ~30 minutes, dramatically increases engagement with the reminder feature.
API & backend
High
Analytics aggregation worker calls API over HTTP — bypasses DB, creates a bottleneck
apps/ai-worker/tasks/analytics.py → aggregate_tenant_hourly()
The analytics task fetches raw events by calling GET /internal/events over HTTP, then does aggregation in Python. For tenants with high document volume this creates a large HTTP payload and a slow sequential loop. The worker has a DATABASE_URL — connect directly to Postgres for read queries and do the aggregation with a single SQL GROUP BY. Removes an entire HTTP round-trip per tenant per hour.
High
No rate limiting on AI endpoints — a single tenant can starve others
apps/api/src/ — no per-tenant AI rate limit middleware visible
Billing quotas check monthly document/research counts but there's no per-minute rate limiting on /ai/* routes. On a shared Ollama instance, one tenant firing 10 concurrent research queries will cause 90-second timeouts for everyone else. Add a Redis-backed sliding window limiter (e.g. 5 AI requests/minute/tenant) using the existing Redis connection. The circuit breaker in llm_safety.py handles Ollama failures but not concurrent overload.
High
Document processing is synchronous — large PDFs block the API thread
apps/api/src/ document upload route
The Celery worker exists for async tasks, but check whether OCR and clause extraction are being enqueued or called inline during the upload request. If extraction is synchronous, a 60-page scanned PDF will hold an API worker thread for 30–90 seconds. All post-upload processing (OCR → extract → embed → assess) should be queued to the worker, and the upload endpoint should return immediately with a processing status that the frontend polls or receives via WebSocket.
Medium
Report generation has no progress feedback — users don't know if it's running
apps/ai-worker/tasks/report_gen.py → generate_matter_report()
Reports are generated async by Celery but there's no status endpoint. A user who clicks "Generate Report" gets no feedback until the task completes (or fails silently). Add a report_jobs table or use Redis to track {job_id: status}, expose GET /api/reports/:jobId/status, and have the frontend poll it. Alternatively, emit a WebSocket event — the WebSocket infrastructure already exists in websocket.ts.
Medium
Batch embedding task embeds one chunk at a time — 10× slower than necessary
apps/ai-worker/tasks/batch_embed.py
If the batch embedding task calls the AI service once per chunk, you're paying HTTP overhead per chunk. SentenceTransformers' encode() accepts a list of strings and runs as a single batched GPU/CPU call. Pass all chunks for a document in one call to POST /ai/embed with a texts: string[] payload, then bulk-insert the resulting vectors into pgvector. This alone can make document embedding 5–10× faster.
Performance
High
No embedding cache — identical clauses are re-embedded every upload
apps/api/src/embedding-cache.ts (file exists but check usage)
The file embedding-cache.ts exists, which suggests caching was planned. Verify it's actually being hit before every embed call. Common contract clauses (force majeure, governing law, entire agreement) appear in thousands of documents identically. Hash each chunk's text with SHA-256 and check the cache before calling the AI service. On a busy firm this can eliminate 40–60% of embedding calls.
High
pgvector index type not explicitly set — default may not be optimal
db/migrations/20260101000002_vector-index.js
Check whether the vector index is created as ivfflat or hnsw. At startup with few documents either works, but ivfflat requires a VACUUM and a manual lists tuning as your corpus grows. Prefer hnsw with m=16, ef_construction=64 — it's maintenance-free, handles dynamic inserts well, and gives better recall at the same query speed for corpora under 1M chunks.
Medium
Ollama model is loaded and unloaded between requests — cold start on every call
.env — OLLAMA_TIMEOUT=120
By default, Ollama unloads a model from RAM after 5 minutes of inactivity. On a low-RAM droplet this is useful, but it means the first request after any idle period waits 8–15 seconds for the model to reload. Set OLLAMA_KEEP_ALIVE=-1 in your Ollama environment to keep the model loaded permanently. On a 4GB droplet this is a trade-off (less RAM headroom) but on 8GB it's the right call for a law firm expecting sub-5s response times.
Medium
No pagination on document listing API — returns all documents in one query
apps/web/app/documents/page.tsx, underlying API route
A firm with 500+ documents will get all of them in a single response. Add cursor-based pagination (?cursor=&limit=25) on the documents endpoint, and implement infinite scroll or page navigation in the frontend. Also add a LIMIT safety cap server-side so a missing pagination param never returns an unbounded result set.
Security
High
Audit log missing for AI result exports and document downloads
apps/api/src/audit.ts — audit actions defined but check coverage
The audit action types include document.exported and document.downloaded, but verify these are actually called in the download/export handler code. Law firms under SOC 2 or Bar Council scrutiny need a complete audit trail. Specifically check: PDF export of redlined documents, risk report downloads, and research session exports — these are the actions most likely to carry privileged information outside the platform.
High
DPDP consent capture is listed as a feature but has no consent withdrawal flow
apps/api/src/ DPDP routes, db/migrations/ DPDP tables
India's Digital Personal Data Protection Act requires not just consent capture but a clear withdrawal mechanism — users must be able to revoke consent and trigger data erasure. If consent withdrawal isn't implemented, any firm using the platform to process client PII is exposed. Add POST /api/dpdp/consent/withdraw and a downstream erasure job, and surface the withdrawal option visibly in the client portal.
Medium
ClamAV is set to "disabled" in the deployment plan — malware scanning bypassed
.env.production → MALWARE_SCANNER=disabled
Disabling ClamAV to save RAM is understandable early on, but it should be re-enabled before you onboard paying clients — a law firm uploading a malware-infected PDF that passes through unscanned is a serious liability. As an alternative to running ClamAV locally, route uploads through VirusTotal's free API (500 lookups/day) for lightweight scanning without the ~1GB RAM cost.
Quick win
No Content-Security-Policy header on the Next.js app
apps/web/next.config.js
Add a Content-Security-Policy header in next.config.js under headers(). A legal platform handling contract text is a high-value XSS target. A strict CSP that limits script-src to 'self' and your CDN prevents an entire class of injection attacks. Also add X-Frame-Options: DENY and Referrer-Policy: strict-origin-when-cross-origin while you're there.
Growth & business
High
No onboarding flow — new tenants land directly on an empty dashboard
apps/web/app/dashboard/ — no first-run detection
There's no "first login" detection or onboarding checklist. A new law firm admin sees an empty dashboard with no guidance. Add a simple checklist card: "1. Invite your first advocate → 2. Upload a contract → 3. Run your first AI analysis". Track completion per tenant in a onboarding_steps column and hide the card once all steps are done. This directly impacts activation — the most important metric for a B2B SaaS.
High
Trial period isn't surfaced in the UI — users don't know when it expires
apps/api/src/billing.ts — trialEndsAt field exists in BillingStatus
The BillingStatus interface has a trialEndsAt field but there's no UI banner warning users the trial is ending. A persistent "Trial ends in X days — upgrade now" banner in the AppShell when trialEndsAt is within 7 days is one of the highest-leverage conversion nudges in SaaS. The data already exists — it just isn't being shown.
Medium
Playbook feature is built but there's no default playbook for new tenants
apps/api/ playbook routes, billing.ts PLANS features
Risk assessment requires a playbook to be meaningful, but new tenants start with no playbook — so risk assessment shows generic output with no firm-specific standards. Ship a default "India Standard Commercial Contract Playbook" pre-populated in every new tenant's account covering the most common negotiation positions under Indian Contract Act. Let firms override it. This makes the product immediately useful on day one instead of requiring setup.
Medium
No in-app feedback mechanism — bugs and confusion are invisible
apps/web/ — no feedback widget found
There's no way for an advocate to report a bad AI extraction, a wrong risk classification, or a UI bug without emailing support. Add a lightweight "thumbs down + one-line comment" button on every AI result card. Store feedback in a ai_feedback table with the document_id, task_type, and comment. This becomes your most valuable dataset for improving prompt quality over time — and makes users feel heard.
Quick win
Billing page shows plan features but no upgrade CTA from within the product
apps/web/app/billing/ — feature gating UI
When a user hits a quota limit, they get a 402 error response. The UI should catch this and show an upgrade prompt contextually — "You've used all 100 documents this month. Upgrade to Growth for 500/month →". These in-context upgrade prompts convert significantly better than a generic billing page link. The quota data is already in the 402 response body; the frontend just needs to handle it gracefully.
