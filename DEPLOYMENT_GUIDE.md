# EvidentIS Production Deployment Guide (`evidentis.tech`)

This is the canonical, step-by-step production runbook for deploying EvidentIS on your domain:

- **Web app:** `https://evidentis.tech`
- **API:** `https://api.evidentis.tech`
- **(Optional) Traefik dashboard:** `https://traefik.evidentis.tech`

> **Important domain note:** use your production domain `evidentis.tech` consistently across DNS, TLS, and webhook setup.

---

## 1. Deployment model used by this repository

This guide targets the production stack already defined in:

- `docker-compose.prod.yml` (Docker Swarm + Traefik + ACME TLS)
- `apps/api/Dockerfile.api`
- `apps/web/Dockerfile.web`
- `apps/ai-service/Dockerfile`
- `apps/ai-worker/Dockerfile`

The production command is:

```bash
docker stack deploy -c docker-compose.prod.yml evidentis
```

---

## 2. Prerequisites

## 2.1 Infrastructure

1. Linux VM(s) with public IP (Ubuntu 22.04/24.04 recommended).
2. Docker Engine 24+ and Docker Swarm enabled.
3. Open inbound ports:
   - `80/tcp`
   - `443/tcp`
4. Persistent data disks mounted for:
   - `/data/evidentis/postgres`
   - `/data/evidentis/redis`
5. A DNS provider where you can manage records for `evidentis.tech`.

## 2.2 External services and accounts

1. PostgreSQL 16+ with pgvector extension (managed recommended for production).
2. Redis 7+ (managed recommended for production).
3. S3-compatible bucket in India region (`centralindia` preferred default in this repo).
4. Razorpay live account:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
5. MSG91 account for OTP/SMS.
6. India legal integrations (optional but recommended):
   - Indian Kanoon API key
   - eCourts API key
7. OpenAI key (if using cloud fallback LLM paths).

---

## 3. DNS setup for `evidentis.tech`

Create these records before first deploy:

| Hostname | Type | Target |
|---|---|---|
| `evidentis.tech` | `A` | Your public server IP |
| `www.evidentis.tech` | `A` | Your public server IP |
| `api.evidentis.tech` | `A` | Your public server IP |
| `traefik.evidentis.tech` (optional) | `A` | Your public server IP |

TLS certificates are issued automatically by Traefik using Let’s Encrypt after DNS resolves.

---

## 4. Server bootstrap

Run on the manager node:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release apache2-utils

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Swarm
docker swarm init

# Data dirs for bind-mounted volumes
sudo mkdir -p /data/evidentis/postgres /data/evidentis/redis
sudo chown -R 999:999 /data/evidentis/postgres
sudo chown -R 100:101 /data/evidentis/redis || true
```

---

## 5. Clone and prepare repository

```bash
git clone https://github.com/DEEP2909/Evidentis.git
cd Evidentis
```

---

## 6. Create production environment file

Create `.env.production` in repo root:

```dotenv
# ------------------------------------------------------------------------------
# Core domain and TLS
# ------------------------------------------------------------------------------
DOMAIN=evidentis.tech
ACME_EMAIL=admin@evidentis.tech

# Traefik dashboard auth user:hashed_password (optional dashboard)
# Generate with: htpasswd -nbB admin 'STRONG_PASSWORD'
TRAEFIK_DASHBOARD_AUTH=admin:$2y$05$REPLACE_ME
TRAEFIK_DASHBOARD_ALLOWED_IPS=127.0.0.1/32,10.0.0.0/8

# ------------------------------------------------------------------------------
# Database and cache
# ------------------------------------------------------------------------------
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/evidentis?sslmode=require
DB_SSL=true
# Optional CA path inside container if your DB provider needs custom CA
DB_SSL_CA=

# If using managed Redis, set full URL and include password if required
REDIS_URL=redis://:REDIS_PASSWORD@REDIS_HOST:6379
REDIS_PASSWORD=REPLACE_ME

# ------------------------------------------------------------------------------
# Auth/web security
# ------------------------------------------------------------------------------
NEXTAUTH_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
AI_SERVICE_INTERNAL_KEY=REPLACE_WITH_LONG_RANDOM_INTERNAL_KEY
CORS_ORIGINS=https://evidentis.tech,https://www.evidentis.tech

# ------------------------------------------------------------------------------
# Object storage
# ------------------------------------------------------------------------------
S3_BUCKET=evidentis-india-documents
S3_REGION=centralindia
S3_ACCESS_KEY=REPLACE_ME
S3_SECRET_KEY=REPLACE_ME

# ------------------------------------------------------------------------------
# Billing / payments (Razorpay)
# ------------------------------------------------------------------------------
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=replace_me
RAZORPAY_WEBHOOK_SECRET=replace_me

# ------------------------------------------------------------------------------
# India legal integrations
# ------------------------------------------------------------------------------
INDIANKANOON_API_KEY=
ECOURTS_API_KEY=
MSG91_AUTH_KEY=
MSG91_SENDER_ID=EVDTIS
MSG91_WHATSAPP_INTEGRATED_NUMBER=

# ------------------------------------------------------------------------------
# AI fallback
# ------------------------------------------------------------------------------
OPENAI_API_KEY=

# ------------------------------------------------------------------------------
# Optional release tag
# ------------------------------------------------------------------------------
EVIDENTIS_VERSION=latest
```

> **MSG91 + DLT compliance:** `MSG91_SENDER_ID` must be your approved 6-character DLT sender ID in production.

---

## 7. Create Docker Swarm secrets

These secret names must exist exactly as referenced by `docker-compose.prod.yml`.

```bash
# JWT keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# App encryption key (64 hex chars)
openssl rand -hex 32 > app_encryption_key.txt

# DB password secret (only if using included postgres service)
printf '%s' 'REPLACE_DB_PASSWORD' > postgres_password.txt

# Optional: keep Razorpay secrets as swarm secrets too
printf '%s' 'RAZORPAY_KEY_SECRET_VALUE' > razorpay_key_secret.txt
printf '%s' 'RAZORPAY_WEBHOOK_SECRET_VALUE' > razorpay_webhook_secret.txt

docker secret create jwt_private_key private.pem
docker secret create jwt_public_key public.pem
docker secret create app_encryption_key app_encryption_key.txt
docker secret create postgres_password postgres_password.txt
docker secret create razorpay_key_secret razorpay_key_secret.txt
docker secret create razorpay_webhook_secret razorpay_webhook_secret.txt

rm -f private.pem public.pem app_encryption_key.txt postgres_password.txt razorpay_key_secret.txt razorpay_webhook_secret.txt
```

---

## 8. Deploy stack

```bash
# Load env vars for compose interpolation
set -a
source .env.production
set +a

# Deploy
docker stack deploy -c docker-compose.prod.yml evidentis

# Watch services
docker stack services evidentis
docker stack ps evidentis
```

---

## 9. Run database migrations and optional seed

After API service is up:

```bash
# Run migrations in API container
docker run --rm \
  --network evidentis_internal \
  --env-file .env.production \
  -e NODE_ENV=production \
  -e JWT_PRIVATE_KEY_PATH=/tmp/private.pem \
  -e JWT_PUBLIC_KEY_PATH=/tmp/public.pem \
  -e APP_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  evidentis/api:${EVIDENTIS_VERSION:-latest} \
  npm run migrate:up -w @evidentis/api
```

Optional seed:

```bash
docker run --rm \
  --network evidentis_internal \
  --env-file .env.production \
  -e NODE_ENV=production \
  -e JWT_PRIVATE_KEY_PATH=/tmp/private.pem \
  -e JWT_PUBLIC_KEY_PATH=/tmp/public.pem \
  -e APP_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  evidentis/api:${EVIDENTIS_VERSION:-latest} \
  npm run seed -w @evidentis/api
```

---

## 10. Post-deploy verification

## 10.1 Health endpoints

```bash
curl -fsS https://api.evidentis.tech/health/live
curl -fsS https://api.evidentis.tech/health/ready
curl -I https://evidentis.tech
```

## 10.2 Functional checks

1. Login works from web app.
2. File upload succeeds and gets malware scanned.
3. AI research endpoint responds.
4. OTP send/verify succeeds (if MSG91 configured).
5. Razorpay webhook endpoint reachable:
   - `POST https://api.evidentis.tech/webhooks/razorpay`

---

## 11. Razorpay webhook setup

In Razorpay dashboard:

1. Set webhook URL to `https://api.evidentis.tech/webhooks/razorpay`.
2. Use the same secret value as `RAZORPAY_WEBHOOK_SECRET`.
3. Enable required events for subscription/payment lifecycle used by API billing routes.

---

## 12. Operational commands

```bash
# List stack services
docker stack services evidentis

# API logs
docker service logs -f evidentis_api

# Web logs
docker service logs -f evidentis_web

# AI service logs
docker service logs -f evidentis_ai-service

# Scale API to 5 replicas
docker service scale evidentis_api=5

# Rolling update with new image tag
EVIDENTIS_VERSION=v1.0.1 docker stack deploy -c docker-compose.prod.yml evidentis

# Remove stack
docker stack rm evidentis
```

---

## 13. Backup and recovery

## 13.1 PostgreSQL backups

- Use managed database automated backups + PITR where possible.
- If self-hosted PostgreSQL, schedule `pg_dump` and WAL archiving.

Example:

```bash
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%F-%H%M).sql.gz
```

## 13.2 Redis backups

- Use managed Redis backup snapshots.
- If self-hosted Redis, persist AOF/RDB and snapshot volume backups.

## 13.3 Object storage backups

- Enable versioning.
- Enable lifecycle replication if compliance requires cross-region disaster recovery.

---

## 14. Security hardening checklist

1. Keep `AI_SERVICE_INTERNAL_KEY` long and rotated.
2. Keep Traefik dashboard disabled unless needed; if enabled, enforce IP allowlist + strong basic auth.
3. Restrict SSH to trusted IPs only.
4. Use managed DB/Redis with TLS and auth.
5. Rotate:
   - JWT keys
   - APP_ENCRYPTION_KEY
   - Razorpay secrets
   - MSG91 keys
6. Monitor:
   - `/health/ready`
   - container restart loops
   - elevated 4xx/5xx rates
7. Ensure legal/PII data remains in approved India region storage.

---

## 15. Troubleshooting

## 15.1 TLS certificates not issuing

1. Verify A records resolve publicly to your server IP.
2. Confirm ports 80/443 are open.
3. Check Traefik logs:

```bash
docker service logs -f evidentis_traefik
```

## 15.2 API unhealthy (`/health/ready` fails)

1. Check DB/Redis connectivity from API logs.
2. Confirm `DATABASE_URL`, `REDIS_URL`, `DB_SSL` values.
3. Verify migrations are applied.

## 15.3 Web works but API calls fail

1. Ensure `NEXT_PUBLIC_API_URL=https://api.evidentis.tech`.
2. Ensure `CORS_ORIGINS` includes web domain(s).
3. Ensure API router labels in Traefik match `api.${DOMAIN}`.

## 15.4 AI requests rejected

1. Verify same `AI_SERVICE_INTERNAL_KEY` is set for API, AI service, and AI worker.
2. Confirm AI service is healthy on port `5000`.

---

## 16. Kubernetes option

If you prefer Kubernetes, use `k8s/deployment.yaml` as baseline. Keep the same env/secret values and domain mapping (`evidentis.tech`, `api.evidentis.tech`). This guide remains Docker Swarm-first because it matches the active production compose and Traefik setup in this repository.

