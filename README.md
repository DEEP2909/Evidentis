# EvidentIS: Evidence-Based Intelligent Decision System

<p align="center">
  <img src="docs/assets/evidentis-logo.png" alt="EvidentIS Logo" width="200"/>
</p>

<p align="center">
  <strong>AI-Powered Contract Intelligence for Indian Law Firms</strong><br/>
  <strong>Enterprise Legal AI Platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#documentation">Documentation</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/license-Proprietary-red.svg" alt="License"/>
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg" alt="Node"/>
  <img src="https://img.shields.io/badge/python-%3E%3D3.11-blue.svg" alt="Python"/>
  <img src="https://img.shields.io/badge/tests-520%2B%20passing-brightgreen.svg" alt="Tests"/>
  <img src="https://img.shields.io/badge/coverage-%3E78%25%20(Python)%20%7C%20%3E65%25%20(Node)-brightgreen.svg" alt="Coverage"/>
</p>

---

## 🎯 What is EvidentIS?

**EvidentIS** stands for **Evidence-Based Intelligent Decision System**.

EvidentIS is an enterprise-grade, multi-tenant Legal AI SaaS platform designed specifically for India-based law firms. It transforms how advocates handle contract review, legal research, and compliance monitoring through advanced AI capabilities.

### The Problem We Solve

- **Contract Review**: Attorneys spend 60% of their time reviewing contracts manually
- **Risk Assessment**: Critical clauses and risks are often missed under time pressure  
- **Compliance Tracking**: Keeping up with central, state, and UT legal obligations is overwhelming
- **Obligation Management**: Missed deadlines lead to liability and malpractice claims

### Our Solution

EvidentIS automates contract analysis, extracts key clauses, assesses risks against firm playbooks, tracks obligations, and provides AI-powered legal research—all while maintaining the highest security and compliance standards required by law firms.

---

## ✨ Features

### 📄 Document Intelligence
- **Smart Upload**: PDF, DOCX, TXT with automatic malware scanning (ClamAV)
- **Security Alerts**: Admin email notifications when infected uploads are quarantined
- **OCR Processing**: Extract text from scanned documents (Tesseract/EasyOCR with optional Google Vision fallback)
- **India Clause Intelligence**: Automatic extraction of India-relevant clause families (DPDP, GST, stamp duty, RERA, labour, and commercial risk terms)
- **Multilingual Support**: UI + AI support for all constitutional Indian languages plus English, with RTL handling where required
- **Risk Assessment**: AI-powered risk scoring with playbook compliance checking

### ⚖️ Legal Compliance
- **36 States and UTs + Central**: Complete India jurisdiction coverage
- **State & UT Rule Packs**: Jurisdiction-aware risk checks and legal playbook enforcement
- **Data Privacy Laws**: DPDP-first controls, consent, grievance, and erasure alignment
- **Regulatory Coverage**: Contract Act, Arbitration Act, GST, labour codes, and sector-specific safeguards

### 🔍 Legal Research
- **Semantic Search**: Natural language queries across all documents
- **RAG Pipeline**: Retrieval-augmented generation for accurate answers
- **Citation Support**: Source-aware citations with chunk metadata and relevance scores
- **Confidence Scoring**: Confidence is derived from retrieval quality and citation evidence (not hardcoded)
- **Research History**: Track and revisit previous research sessions

### 🇮🇳 India Legal Operations
- **Bare Acts API**: Search central/state acts and section text
- **Court Case Tracking**: Tenant-scoped CNR case records and hearing timelines
- **GST Invoicing**: Tenant invoices with GST line-item and SAC support
- **DPDP Workflows**: Consent capture and rights-request tracking endpoints

### ✏️ Contract Redlining
- **AI Suggestions**: Intelligent clause modifications based on firm playbook
- **Track Changes**: Full redline editing with version control
- **Side-by-Side Comparison**: Compare original vs. suggested changes
- **Export Options**: PDF, DOCX with tracked changes

### 📅 Obligation Tracking
- **Automatic Extraction**: Deadlines, milestones, payment terms
- **Smart Reminders**: Email/SMS notifications before due dates
- **Calendar Integration**: Sync with Outlook, Google Calendar
- **Dashboard View**: All upcoming obligations at a glance

### 🔐 Enterprise Security
- **Multi-Tenant Isolation**: Complete data separation between law firms
- **SOC 2 Type II Ready**: Audit logging, access controls, encryption
- **MFA Support**: TOTP, SMS, Email verification
- **SSO/SAML 2.0**: Enterprise identity provider integration
- **SCIM 2.0**: Automated user provisioning
- **AI Service Gatekeeping**: Internal API key forwarding + per-IP/per-route AI-service rate limiting

### 💳 Flexible Billing
- **4 Pricing Tiers**: Starter, Growth, Professional, Enterprise
- **Usage-Based Quotas**: Documents, research queries, advocate seats
- **Razorpay Integration**: India-native payment processing with GST-aware billing
- **Dunning Alerts**: Automatic admin email on invoice payment failure
- **Self-Service Portal**: Manage subscriptions, invoices, payment methods

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 16 with pgvector
- Redis 7

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/evidentis.git
cd evidentis

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start infrastructure services
docker-compose up -d postgres redis clamav ollama

# Run database migrations
npm run migrate --workspace=apps/api

# Seed demo data (optional)
npm run seed --workspace=apps/api

# Start all services in development mode
npm run dev
```

### Build and Test Notes

- The web app builds as a Next.js standalone bundle. `apps/web/public/.gitkeep` is committed so the Docker runner stage can always copy `/public`, and `apps/web/next.config.js` enables `.next/standalone`.
- API tests use `apps/api/vitest.config.ts` and `apps/api/tests/setup.ts`. `apps/api/package.json` now pins node-pg-migrate to `../../db/migrations`, and CI runs `npm run migrate:up -w @evidentis/api` before the Node test job so Postgres has the expected schema.
- End-to-end `npm test --workspace=apps/api` still requires reachable Postgres and Redis test services.
- AI tests use `apps/ai-service/tests/conftest.py` and `apps/ai-service/pytest.ini`, and should be run with Python 3.11.
- The AI Docker image now installs Debian Trixie-compatible OpenGL runtime packages via `libgl1` in both Dockerfile stages.
### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3000 | Next.js frontend |
| API Server | http://localhost:4000 | Fastify REST API |
| AI Service | http://localhost:5000 | Python FastAPI |
| API Docs | http://localhost:4000/docs | Swagger UI |

### Demo Credentials

```
Email: demo@evidentis.tech
Password: Demo123!@#
Firm: Demo Law Firm LLP
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Web App  │  │ Mobile   │  │ API      │  │ Webhooks │            │
│  │ (Next.js)│  │ (Future) │  │ Clients  │  │          │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────┐
│                      LOAD BALANCER                                   │
│                    (nginx / ALB / CloudFlare)                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   API Server  │   │   API Server  │   │   API Server  │
│   (Fastify)   │   │   (Fastify)   │   │   (Fastify)   │
│   Port 4000   │   │   Port 4000   │   │   Port 4000   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
     ▼                      ▼                      ▼
┌─────────┐          ┌─────────────┐        ┌──────────┐
│ Redis   │◄────────►│ PostgreSQL  │◄──────►│ S3/Minio │
│ (Cache, │          │ + pgvector  │        │ (Files)  │
│  Queue) │          │             │        │          │
└─────────┘          └─────────────┘        └──────────┘
     │
     │ BullMQ Jobs
     ▼
┌─────────────────────────────────────────────────────┐
│                   WORKER POOL                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Document │  │  Clause  │  │   Risk   │          │
│  │  Worker  │  │  Worker  │  │  Worker  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
└───────┼─────────────┼─────────────┼─────────────────┘
        │             │             │
        └─────────────┴──────┬──────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────┐
│                    AI SERVICE                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   OCR    │  │ Embedding│  │   LLM    │          │
│  │(Tesseract)│ │ (LaBSE)  │  │ (Ollama) │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                    FastAPI                           │
└─────────────────────────────────────────────────────┘
```

### Service Communication Diagram (Mermaid)

```mermaid
flowchart LR
  Web[Web App (Next.js)] --> API[API Server (Fastify)]
  API --> PG[(PostgreSQL + pgvector)]
  API --> Redis[(Redis / BullMQ)]
  API --> S3[(S3 / MinIO)]
  API --> AI[AI Service (FastAPI)]
  AI --> Ollama[Ollama LLM]
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| **API** | Fastify 4, TypeScript, Zod validation |
| **AI Service** | FastAPI, Python 3.11, sentence-transformers |
| **Database** | PostgreSQL 16 + pgvector 0.8 |
| **Cache/Queue** | Redis 7, BullMQ |
| **LLM** | Ollama (mistral:7b-instruct) |
| **Storage** | S3-compatible (AWS S3 / MinIO) |
| **Auth** | JWT RS256, TOTP MFA, SAML 2.0, SCIM 2.0 |
| **Observability** | OpenTelemetry, Prometheus, Grafana |

---

## 📁 Project Structure

```
evidentis/
├── apps/
│   ├── api/                 # Fastify REST API (Node.js)
│   │   ├── src/
│   │   │   ├── index.ts     # Server entry point
│   │   │   ├── routes.ts    # All API endpoints (~120 routes)
│   │   │   ├── auth.ts      # JWT, MFA, session management
│   │   │   ├── billing.ts   # Razorpay integration
│   │   │   └── ...
│   │   └── tests/           # API tests
│   │
│   ├── ai-service/          # FastAPI AI service (Python)
│   │   ├── main.py          # FastAPI app
│   │   ├── routers/         # OCR, embed, extract, assess, research
│   │   ├── evaluation/      # AI model evaluation framework
│   │   └── tests/           # AI tests (105 tests)
│   │
│   ├── ai-worker/           # Celery background workers
│   │   └── tasks/           # Async task definitions
│   │
│   └── web/                 # Next.js frontend
│       ├── app/             # App router pages
│       ├── components/      # React components
│       └── tests/           # Frontend tests
│
├── db/
│   └── migrations/          # Database migrations (15 files)
│
├── k8s/                     # Kubernetes deployment manifests
│
├── packages/
│   └── shared/              # Shared types and utilities
│
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
└── .github/workflows/       # CI/CD pipelines
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific workspace tests
npm test --workspace=apps/api
npm test --workspace=apps/web
pytest apps/ai-service/tests/

# Run E2E tests
npm run test:e2e --workspace=apps/web

# Run tenant isolation tests
npm run test:isolation --workspace=apps/api
```

### Test Coverage

| Component | Tests | Coverage |
|-----------|-------|----------|
| API | 325+ | >50% |
| AI Service | 105 | >30% (structural exclusions) |
| Frontend | 90+ | >50% |
| **Total** | **520+** | **>50% / >30%** |

---

## 📚 API Reference

### Authentication

```bash
# Login
POST /auth/login
{
  "email": "attorney@firm.com",
  "password": "SecurePass123!"
}

# Response
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 900
}
```

```bash
# OTP login (India mobile)
POST /auth/otp/send
{
  "phoneNumber": "+919876543210",
  "purpose": "login",
  "tenantSlug": "demo-firm"
}

POST /auth/otp/verify
{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "purpose": "login",
  "tenantSlug": "demo-firm"
}

# API-prefixed aliases are also available:
# /api/auth/otp/send and /api/auth/otp/verify
```

### Documents

```bash
# Upload document
POST /documents
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Get document analysis
GET /documents/:id/analysis

# Get extracted clauses
GET /documents/:id/clauses
```

### Research

```bash
# Legal research query
POST /api/research/query
{
  "question": "What are the liability caps in our vendor contracts?",
  "matterId": "uuid",
  "language": "hi"
}
```

```bash
# Streamed research (SSE)
POST /api/research/stream
{
  "query": "What are termination remedies under this contract?",
  "matterId": "uuid",
  "language": "en"
}

# IndiaKanoon/local citation search proxy
GET /api/research/indiankanoon?q=arbitration+award&limit=20
```

### India Legal Ops APIs

```bash
GET  /api/bare-acts
GET  /api/bare-acts/:slug
GET  /api/court-cases
POST /api/court-cases
GET  /api/hearings
GET  /api/invoices
POST /api/invoices
GET  /api/dpdp/requests
POST /api/dpdp/consent
```

Full API documentation available at `/docs` when running the server.

---

## 🔒 Security

### Data Protection
- **Encryption at Rest**: AES-256-GCM for sensitive data
- **Encryption in Transit**: TLS 1.3 for all connections
- **Key Management**: AWS KMS / HashiCorp Vault integration

### Access Control
- **Multi-Factor Authentication**: TOTP, SMS, Email
- **Role-Based Access**: Admin, Partner, Senior Advocate, Junior Advocate, Paralegal, Client
- **Session Management**: 15-minute access tokens, secure refresh tokens

### Compliance
- **SOC 2 Type II**: Audit logging, access controls
- **HIPAA Ready**: PHI handling capabilities
- **State Bar Rules**: Ethics-compliant AI disclaimers

### Audit Trail
- Every action logged with: user, tenant, timestamp, IP, resource, action
- 7-year retention policy
- Immutable audit records

---

## 📈 Monitoring

### Health Checks

```bash
# Liveness probe
GET /health
# Response: { "status": "ok" }

# Readiness probe  
GET /health/ready
# Response: { "status": "ok", "checks": { "database": true, "redis": true, "clamav": true } }
```

### Metrics

Prometheus metrics available at `/metrics`:
- `http_requests_total`
- `http_request_duration_seconds`
- `db_query_duration_seconds`
- `ai_inference_duration_seconds`
- `documents_processed_total`

### Tracing

OpenTelemetry traces exported to:
- Jaeger
- AWS X-Ray
- Datadog

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features (>75% Python coverage target)
- Use conventional commits
- Update documentation

---

## 📄 License

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

© 2026 EvidentIS Inc. All rights reserved.

---

## 📞 Support

- **Documentation**: [docs.evidentis.tech](https://docs.evidentis.tech)
- **Email**: support@evidentis.tech
- **Enterprise Support**: enterprise@evidentis.tech

---

<p align="center">
  <strong>Built with ❤️ for the legal profession</strong>
</p>
