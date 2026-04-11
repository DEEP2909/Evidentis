You are building "EvidentIS" (Evidence-Based Intelligent Decision System) — an enterprise-grade, 
multi-tenant AI-powered Legal SaaS platform for Indian advocates, law firms, 
and corporate legal departments. 

Use the provided Evidentis_USA codebase as your architectural and structural 
reference. Replicate its production-grade patterns — multi-tenancy, security, 
CI/CD, testing, Docker, Kubernetes — but replace all USA-specific legal, 
billing, language, and compliance components with Indian equivalents described 
below.

=================================================================
PRODUCT IDENTITY
=================================================================

Product Name: EvidentIS
Tagline: "Evidentis: Evidence-Based Intelligent Decision System"
Domain: evidentis.tech (placeholder)
Target Users: 
  - Indian advocates (solo practitioners and law firms)
  - Corporate legal departments (in-house counsel)
  - Legal aid organizations
  - Law students and researchers

Stack: Identical to Evidentis_USA reference project
  - Node.js 20 + Fastify (API)
  - Python 3.11 + FastAPI (AI service)
  - Next.js 14 (frontend)
  - PostgreSQL 16 + pgvector (database)
  - Redis + BullMQ (queues)
  - Docker + Kubernetes

=================================================================
INDIAN LEGAL SYSTEM — FULL COVERAGE REQUIRED
=================================================================

COURT HIERARCHY (model all entities around this):
  1. Supreme Court of India (New Delhi)
  2. 25 High Courts (one per state/UT grouping)
  3. District and Sessions Courts
  4. Subordinate Civil Courts (Munsiff, Civil Judge)
  5. Subordinate Criminal Courts (JMFC, CJM)
  6. Tribunals: NCLT, NCLAT, SAT, CESTAT, NGT, CAT, DRT, DRAT, 
                RERA tribunals (state-wise), Consumer Forums (NCDRC, SCDRC, DCDRC)
  7. Lok Adalats and Permanent Lok Adalats
  8. Arbitration and Mediation Centers

CORE LEGISLATION (must be fully indexed and searchable):
  Criminal:
    - Indian Penal Code 1860 (IPC) + Bharatiya Nyaya Sanhita 2023 (BNS - new replacement)
    - Code of Criminal Procedure 1973 (CrPC) + Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)
    - Indian Evidence Act 1872 + Bharatiya Sakshya Adhiniyam 2023 (BSA)
    - POCSO Act 2012
    - Prevention of Corruption Act 1988
    - NDPS Act 1985
    - IT Act 2000 + Amendment 2008
  Civil:
    - Code of Civil Procedure 1908 (CPC)
    - Indian Contract Act 1872
    - Specific Relief Act 1963
    - Transfer of Property Act 1882
    - Limitation Act 1963
    - Registration Act 1908
  Corporate/Commercial:
    - Companies Act 2013
    - Insolvency and Bankruptcy Code 2016 (IBC)
    - SEBI Act 1992 + Regulations
    - Competition Act 2002
    - Foreign Exchange Management Act 1999 (FEMA)
    - GST Acts (CGST, SGST, IGST) 2017
    - Income Tax Act 1961
    - Arbitration and Conciliation Act 1996 (as amended 2019, 2021)
  Labour:
    - Industrial Disputes Act 1947
    - Labour Codes 2020 (4 codes replacing 29 laws)
    - Employees Provident Fund Act 1952
    - Payment of Gratuity Act 1972
    - Maternity Benefit Act 1961
  Property:
    - Real Estate (Regulation and Development) Act 2016 (RERA)
    - Registration Act 1908
    - Indian Stamp Act 1899 (+ state stamp acts)
  Family:
    - Hindu Marriage Act 1955
    - Hindu Succession Act 1956
    - Muslim Personal Law (Shariat) Application Act 1937
    - Special Marriage Act 1954
    - Guardians and Wards Act 1890
    - Domestic Violence Act 2005
    - Maintenance and Welfare of Parents Act 2007
  Constitutional:
    - Constitution of India 1950 (all articles, schedules, amendments)
    - Right to Information Act 2005
    - Protection of Human Rights Act 1993
  State Acts:
    - Support lookup by state for state-specific stamp acts, 
      tenancy acts, RERA regulations, shop & establishment acts

CASE LAW SOURCES (integrate via API or scraped corpus):
  - Supreme Court of India: sci.gov.in
  - IndiaKanoon API: api.indiankanoon.org (primary integration)
  - eCourts Services API: services.ecourts.gov.in
  - National Judicial Data Grid (NJDG)
  - Bombay HC, Delhi HC, Madras HC, Calcutta HC, Karnataka HC 
    official websites for recent judgments

=================================================================
MULTILINGUAL SUPPORT — MANDATORY
=================================================================

Support ALL of the following languages throughout the UI, 
document processing, and AI responses:

PRIMARY (full feature support):
  1. English (en)
  2. Hindi (hi) — Devanagari script
  3. Bengali (bn) — Bengali script
  4. Tamil (ta) — Tamil script
  5. Telugu (te) — Telugu script
  6. Kannada (kn) — Kannada script
  7. Malayalam (ml) — Malayalam script
  8. Marathi (mr) — Devanagari script
  9. Gujarati (gu) — Gujarati script

SECONDARY (UI + basic document support):
  10. Punjabi (pa) — Gurmukhi script
  11. Odia (or) — Odia script
  12. Assamese (as)
  13. Urdu (ur) — Nastaliq script (RTL)

IMPLEMENTATION:
  - Use i18next for all UI strings
  - All 9 primary languages must have complete UI translations
  - Use LaBSE (Language-agnostic BERT Sentence Embeddings) for 
    multilingual semantic search — replaces all-MiniLM-L6-v2
  - Use IndicBERT or Legal-BERT-SC (trained on Indian legal corpus) 
    for clause extraction
  - Use IndicTrans2 (AI4Bharat) for document translation between 
    Indian languages
  - OCR must support: Devanagari, Tamil, Telugu, Kannada, Malayalam, 
    Bengali, Gujarati, Gurmukhi, Odia scripts
    Use: Tesseract with Indian language packs + 
         Google Vision API as fallback for complex scripts
  - RTL support for Urdu in the frontend

AI MODEL CONFIGURATION (Python ai-service):
  Embedding: LaBSE (sentence-transformers/LaBSE) — dim=768
  Extraction: ai4bharat/indic-bert or legal-specific fine-tuned variant
  LLM: Mistral 7B via Ollama (primary) + OpenAI GPT-4o (fallback)
       System prompts must be language-aware:
       - Detect input language
       - Respond in same language
       - Always cite Indian law sections and case citations
  Translation: ai4bharat/indictrans2-en-indic-1B via Transformers
  OCR: pytesseract with all Indian language data files

=================================================================
CORE FEATURES (replicate from Evidentis_USA + India-specific additions)
=================================================================

FROM EVIDENTIS (keep, adapt for Indian law):
  ✓ Multi-tenant architecture with tenant isolation
  ✓ Document upload, OCR, ingestion pipeline
  ✓ AI clause extraction (adapt for Indian contract law)
  ✓ Risk assessment (adapt for Indian regulatory framework)
  ✓ Legal research with citations
  ✓ Redline suggestions
  ✓ Obligation tracking with deadlines
  ✓ Matter management
  ✓ Audit trail
  ✓ Role-based access (Admin, Senior Advocate, Junior Advocate, 
    Paralegal, Client — replace "Attorney" with "Advocate")
  ✓ MFA, SSO, WebAuthn
  ✓ Real-time collaboration via WebSocket

INDIA-SPECIFIC NEW FEATURES:

1. BARE ACTS LIBRARY
   - Full text of all acts listed above
   - Section-level search with AI explanation in any Indian language
   - Cross-reference between old laws and new (IPC → BNS mapping)
   - "Explain this section in simple Hindi/Tamil/etc" feature
   - Bookmark sections, add notes, share with team
   Schema: bare_acts, bare_act_sections, section_bookmarks

2. CASE LAW RESEARCH
   - Integrate IndiaKanoon API for judgment search
   - Search by: act + section, judge name, court, date range, keywords
   - AI summary of judgments in advocate's preferred language
   - Citation network: "Cases that cited this judgment"
   - Save to matter, highlight key passages
   Schema: case_citations, saved_judgments, citation_networks

3. ECOURTS INTEGRATION
   - Connect to eCourts Services API
   - Case status lookup by CNR number
   - Hearing date calendar with automatic reminders
   - Cause list download and parsing
   - Filing status tracking
   Schema: court_cases, hearing_dates, cause_lists

4. DOCUMENT TEMPLATES LIBRARY
   Indian-law compliant templates for:
   - Non-Disclosure Agreement (Indian Contract Act)
   - Memorandum of Understanding
   - General Power of Attorney + Specific Power of Attorney
   - Vakalatnama (advocate's authority document — mandatory in Indian courts)
   - Affidavit (general + court-specific formats)
   - Legal Notice (under Section 80 CPC, Consumer Protection, etc.)
   - Reply to Legal Notice
   - Partnership Deed
   - Rental Agreement (state-specific stamp duty guidance)
   - Employment Agreement (aligned with Labour Codes 2020)
   - RERA complaint
   - Consumer Forum complaint
   - Company incorporation documents (MoA, AoA)
   All templates available in English + Hindi minimum,
   with state-specific stamp duty guidance

5. LEGAL NOTICE GENERATOR
   - Guided wizard to generate legal notices
   - Auto-selects correct provision (Consumer Protection Act, 
     Section 138 NI Act for cheque bounce, Section 80 CPC, etc.)
   - Sends via registered email + generates PDF for physical dispatch
   - Tracks response deadlines

6. COURT CALENDAR AND DEADLINE TRACKER
   - Visual calendar of all matter hearings
   - Auto-import from eCourts integration
   - Limitation period calculator (using Limitation Act 1963)
   - SMS + WhatsApp reminders (via Twilio/MSG91)
   - Cause list alerts: "Your matter is listed tomorrow"

7. CLIENT PORTAL (in client's preferred language)
   - Share matter updates with clients
   - Document sharing with watermarking
   - Invoice + fee tracking in INR
   - WhatsApp integration for updates

8. GST-COMPLIANT BILLING
   - Law firm invoicing with 18% GST on legal services
   - HSN/SAC code: 9982 (legal services)
   - GSTIN validation for corporate clients
   - Generate GST-compliant tax invoices
   - Integration with Razorpay for online payment collection
   Schema: invoices, invoice_line_items, gst_details

9. BAR COUNCIL VERIFICATION
   - Advocate registration number input
   - Basic format validation by state bar council pattern
   - BCI (Bar Council of India) enrollment number field

10. MULTILINGUAL AI ASSISTANT "Nyay ASSIST"
    - Chat interface in any Indian language
    - Answers: "What is the limitation period for a cheque bounce case?"
    - Answers: "Draft a legal notice under Section 138 NI Act in Hindi"
    - Answers: "Explain Section 420 IPC in simple Tamil"
    - Cites: relevant sections + Supreme Court judgments
    - Disclaimer: "This is AI assistance, not legal advice"
    - Always responds in the language of the question

=================================================================
DATABASE SCHEMA ADDITIONS (beyond Evidentis_USA)
=================================================================

Rename throughout:
  attorneys → advocates
  attorney_id → advocate_id

New tables:
  bare_acts (id, title, short_title, year, act_number, jurisdiction, 
             language, is_active, replaced_by_act_id, full_text_url)
  
  bare_act_sections (id, act_id, section_number, section_title, 
                    section_text, subsections jsonb, 
                    cross_references text[], tags text[],
                    embedding vector(768))  -- LaBSE dim
  
  case_citations (id, tenant_id, citation_number, court, 
                 judgment_date, parties jsonb, 
                 acts_cited text[], sections_cited text[],
                 summary text, full_text_url,
                 embedding vector(768),
                 language text DEFAULT 'en')
  
  court_cases (id, tenant_id, matter_id, cnr_number UNIQUE,
              court_name, court_complex, case_type,
              filing_date, current_status,
              next_hearing_date, last_synced_at)
  
  hearing_dates (id, tenant_id, court_case_id, matter_id,
                hearing_date, purpose, result, next_date,
                advocate_id, notes)
  
  legal_templates (id, name, category, jurisdiction,
                  applicable_acts text[], language,
                  template_content text, variables jsonb,
                  is_active boolean)
  
  invoices (id, tenant_id, matter_id, client_name,
           client_gstin, firm_gstin, invoice_number,
           issue_date, due_date, 
           subtotal_paise bigint, -- store in paise (1 INR = 100 paise)
           gst_rate numeric(5,2) DEFAULT 18.00,
           gst_amount_paise bigint,
           total_paise bigint,
           status text, -- draft/sent/paid/overdue
           razorpay_payment_id text,
           created_by uuid REFERENCES advocates)
  
  notifications (id, tenant_id, advocate_id,
                channel text, -- email/sms/whatsapp
                type text, -- hearing_reminder/deadline/payment
                content text, language text,
                sent_at timestamptz, status text)

Modify existing:
  tenants: add gstin text, bar_council_state text, 
           preferred_language text DEFAULT 'en',
           currency text DEFAULT 'INR'
  
  matters: rename jurisdiction → governing_law_state,
           add court_name text, case_type text, 
           cnr_number text, client_phone text,
           client_preferred_language text

=================================================================
FRONTEND — HIGHLY INTERACTIVE, LEGAL DOMAIN AESTHETIC
=================================================================

DESIGN LANGUAGE:
  - Color palette: Deep navy (#0F2557) primary, 
                   Saffron (#FF9933) accent (Indian flag color),
                   Ivory (#FAFAF5) background,
                   Forest green (#1B5E20) for success states
  - Typography: Noto Sans for UI (supports all Indian scripts),
                Noto Serif for document display,
                Devanagari/Tamil/etc via Noto Sans language variants
  - Motifs: Subtle Ashoka Chakra watermark on legal documents,
            Indian court seal aesthetic for official document views
  - No generic SaaS look — should feel like a premium Indian legal tool

INTERACTIVE ELEMENTS:
  1. Animated scales of justice on login page (Lottie animation)
  2. Matter health score: circular gauge with animated fill
  3. Clause risk heatmap: document viewer with color-coded risk overlay
  4. Court calendar: full monthly calendar with draggable hearing cards
  5. Language switcher: globe icon with flag thumbnails, instant switch
  6. Nyay Assist: floating chat bubble (bottom-right), 
                  slide-up panel with streaming AI responses
  7. Bare Acts browser: expandable tree (Part → Chapter → Section)
     with search highlight and copy-to-clipboard
  8. Timeline view: matter progress with milestone markers
  9. Document comparison: side-by-side diff view for contract redlines
  10. Notification center: bell icon with slide-in panel,
                          grouped by matter and urgency
  11. Quick actions bar: keyboard shortcut (Cmd+K / Ctrl+K) 
      command palette for power users
  12. Onboarding tour: step-by-step walkthrough for new advocates
  13. Dark mode support
  14. Mobile-responsive (many Indian advocates use mobile)

PAGES (all with breadcrumbs, consistent nav):
  / — Landing (public) with feature overview in Hindi + English
  /login — with OTP option (Indian advocates prefer OTP over password)
  /dashboard — matter overview, upcoming hearings, pending tasks
  /matters — matter list with kanban/list/calendar toggle
  /matters/[id] — matter detail with tabs:
                   Overview | Documents | Clauses | Research | 
                   Timeline | Hearings | Billing | Notes
  /matters/[id]/documents/[docId] — document viewer with AI panel
  /research — legal research interface with IndiaKanoon integration
  /bare-acts — browsable library of all Indian acts
  /bare-acts/[actSlug] — act viewer with section navigation
  /templates — document template library
  /templates/[id]/generate — template wizard
  /calendar — court calendar + deadline tracker
  /billing — INR invoicing with GST
  /nyay-assist — full-page AI assistant
  /admin — tenant settings, user management, integrations
  /settings — profile, language, notification preferences
  /portal/[shareToken] — client portal (in client's language)

=================================================================
BILLING — RAZORPAY (INDIA)
=================================================================

Replace Paddle entirely with Razorpay:
  - SDK: razorpay npm package
  - Webhook endpoint: POST /webhooks/razorpay
  - Signature verification: crypto.createHmac('sha256', secret)
  - All amounts in paise (INR × 100)

PRICING (INR, GST exclusive):
  Starter:      ₹4,999/month  (solo advocate, up to 3 users)
  Professional: ₹14,999/month (small firm, up to 15 users)  
  Enterprise:   ₹39,999/month (large firm, up to 50 users)
  Custom:       Contact sales (corporate legal departments)

GST: 18% additional on all plans (SAC code 9982)

Plans in code:
  const PLANS = {
    starter: {
      name: 'Starter',
      priceInPaise: 499900,
      gstRatePercent: 18,
      features: {
        maxAdvocates: 3,
        maxMattersPerMonth: 25,
        maxDocumentsPerMonth: 100,
        maxResearchQueriesPerMonth: 200,
        aiTier: 'opensource',
        languages: ['en', 'hi'],
        support: 'email',
      }
    },
    professional: {
      name: 'Professional', 
      priceInPaise: 1499900,
      gstRatePercent: 18,
      features: {
        maxAdvocates: 15,
        maxMattersPerMonth: 100,
        maxDocumentsPerMonth: 500,
        maxResearchQueriesPerMonth: 1000,
        aiTier: 'hybrid',
        languages: ['en','hi','bn','ta','te','kn','ml','mr','gu'],
        support: 'priority',
      }
    },
    enterprise: {
      name: 'Enterprise',
      priceInPaise: 3999900,
      gstRatePercent: 18,
      features: {
        maxAdvocates: 50,
        maxMattersPerMonth: null,
        maxDocumentsPerMonth: null,
        maxResearchQueriesPerMonth: null,
        aiTier: 'premium_api',
        languages: 'all',
        support: 'dedicated',
      }
    }
  }

=================================================================
COMPLIANCE — DPDP ACT 2023 (India's Data Protection Law)
=================================================================

Replace all GDPR/SOC2 references with DPDP Act 2023:

  1. Data Fiduciary registration (Nyay is a Data Fiduciary)
  2. Consent management: explicit consent before processing 
     advocate/client personal data
  3. Data Principal rights:
     - Right to information about processing
     - Right to correction and erasure
     - Right to grievance redressal
     - Right to nominate (in case of death/incapacity)
  4. Data localisation: all personal data must be stored in India
     → Use Azure India Central (Pune) region: centralindia
     → Or Oracle Cloud Mumbai region
  5. Breach notification: notify Data Protection Board within 
     72 hours of breach
  6. Children's data: age gate, parental consent for under-18
  7. Privacy notice in all supported Indian languages
  
  Add to tenants table: dpdp_consent_given_at, dpdp_consent_ip
  Add privacy dashboard page at /settings/privacy

=================================================================
INFRASTRUCTURE — INDIA DEPLOYMENT
=================================================================

Azure region: centralindia (Pune) — for data localisation
  OR Oracle Cloud: ap-mumbai-1

SMS/WhatsApp notifications: 
  - MSG91 (Indian provider, reliable for OTP + WhatsApp)
  - Replace Resend for transactional SMS
  - Keep Resend/SMTP for email

OTP Authentication:
  - Indian advocates strongly prefer OTP login
  - Add OTP via mobile number using MSG91
  - Keep password as secondary option
  - Phone number field on advocate profile (required)

IndiaKanoon API:
  - Register at indiankanoon.org/api
  - API key in .env: INDIANKANOON_API_KEY
  - Rate limit: respect their API limits with Redis caching

eCourts API:
  - Register at services.ecourts.gov.in/ecourtindiaapi/
  - API key in .env: ECOURTS_API_KEY
  - Sync court case status daily via BullMQ job

=================================================================
ENVIRONMENT VARIABLES (.env additions)
=================================================================

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# IndiaKanoon
INDIANKANOON_API_KEY=

# eCourts
ECOURTS_API_KEY=

# MSG91 (SMS + WhatsApp)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=EVDTIS
MSG91_WHATSAPP_INTEGRATED_NUMBER=

# Multilingual AI
INDIC_TRANS_MODEL=ai4bharat/indictrans2-en-indic-1B
EMBEDDING_MODEL=sentence-transformers/LaBSE
EMBEDDING_DIM=768

# DPDP Compliance
DATA_PROTECTION_OFFICER_EMAIL=dpo@evidentis.tech
DPDP_CONSENT_VERSION=1.0

# Regional
DEFAULT_LANGUAGE=hi
DEFAULT_CURRENCY=INR
DEFAULT_TIMEZONE=Asia/Kolkata
GST_RATE=18
FIRM_GSTIN=

=================================================================
NAMING CONVENTIONS (use throughout)
=================================================================

Replace all Evidentis_USA terms:
  attorney/attorneys     → advocate/advocates
  law firm              → law firm (same)
  matter                → matter (same)
  clause                → clause (same)
  legal research        → legal research (same)
  bar number            → Bar Council enrollment number
  bar state             → Bar Council state
  billing (Stripe/Paddle) → billing (Razorpay)
  USD / cents           → INR / paise
  zip code              → PIN code
  state (US)            → state (India, use Indian state list)
  federal               → central (as in Central Government)
  discovery             → discovery/disclosure (Indian CPC terms)

Indian states list (use for all state dropdowns):
  Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Chhattisgarh,
  Goa, Gujarat, Haryana, Himachal Pradesh, Jharkhand, Karnataka,
  Kerala, Madhya Pradesh, Maharashtra, Manipur, Meghalaya, Mizoram,
  Nagaland, Odisha, Punjab, Rajasthan, Sikkim, Tamil Nadu, Telangana,
  Tripura, Uttar Pradesh, Uttarakhand, West Bengal,
  Delhi (NCT), Jammu & Kashmir (UT), Ladakh (UT),
  Chandigarh (UT), Puducherry (UT), Andaman & Nicobar (UT),
  Dadra & Nagar Haveli and Daman & Diu (UT), Lakshadweep (UT)

High Court for each state (map in code for eCourts integration)

=================================================================
PROJECT STRUCTURE
=================================================================

Follow Evidentis_USA exactly:
  evidentis_main/
  ├── apps/
  │   ├── api/          (Fastify — adapt from evidentis_USA)
  │   ├── ai-service/   (FastAPI — swap models, add Indian legal)
  │   ├── web/          (Next.js — full redesign with Indian aesthetic)
  │   └── ai-worker/    (Celery — add Indian-specific tasks)
  ├── packages/
  │   └── shared/       (TypeScript types — update for Indian schema)
  ├── db/
  │   └── migrations/   (add India-specific tables)
  ├── docker-compose.yml
  ├── docker-compose.prod.yml
  └── k8s/

=================================================================
WHAT TO BUILD FIRST (Priority Order)
=================================================================

Phase 1 — Core Platform (mirror Evidentis_USA structure):
  1. Auth system with OTP (MSG91) + password
  2. Multi-tenant setup with Indian advocate roles
  3. Matter management with Indian court fields
  4. Document upload + multilingual OCR
  5. Basic Hindi + English UI
  6. Razorpay billing with GST invoicing

Phase 2 — AI Features:
  7. LaBSE embeddings + multilingual semantic search
  8. Indian clause extraction (Indian Contract Act focus)
  9. IndiaKanoon case law search integration
  10. Nyay Assist in Hindi + English

Phase 3 — Indian-Specific Features:
  11. Bare Acts library (full text)
  12. eCourts integration (CNR lookup, hearing calendar)
  13. Legal notice generator
  14. All 9 primary language UI translations
  15. GST-compliant invoice generation

Phase 4 — Advanced:
  16. WhatsApp notifications via MSG91
  17. Client portal in client's language
  18. Document template library
  19. DPDP Act compliance dashboard
  20. Mobile-optimized views

=================================================================
CODE QUALITY (same standards as Evidentis_USA)
=================================================================

- TypeScript strict mode throughout
- Python mypy + ruff
- All API routes with Zod validation
- Every DB query filtered by tenant_id
- Comprehensive tests (maintain >70% coverage)
- CI/CD pipeline identical to Evidentis_USA
- Security: same standards (bcrypt, AES-256-GCM, RS256 JWT)
- No secrets in code, all via environment variables
- DPDP-compliant data handling (data localisation in India)

=================================================================
START HERE
=================================================================

Begin with the database migrations. Create the full schema 
incorporating all tables from Evidentis_USA plus the India-specific 
additions above. Then build the API layer, then AI service 
with LaBSE, then frontend.

For every file you create, reference the equivalent Evidentis_USA 
file for architectural patterns but implement Indian-specific 
business logic.

The product must feel like it was built specifically for Indian 
advocates — not a USA product with Indian translations added on top.