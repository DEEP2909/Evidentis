# Issue Remediation Ledger

## Session 36

| # | Severity | Issue | Status | Resolution |
|---|---|---|---|---|
| 1 | Critical | `k8s/deployment.yaml` still injected Paddle secrets and missed India production secrets | Resolved | Replaced Paddle mappings with `RAZORPAY_*`, `MSG91_AUTH_KEY`, `INDIANKANOON_API_KEY`, `ECOURTS_API_KEY`, and `AI_SERVICE_INTERNAL_KEY` in the ExternalSecret data block. |
| 2 | Critical | `k8s/deployment.yaml` AI service env missed embedding config and internal key | Resolved | Added `EMBEDDING_MODEL=sentence-transformers/LaBSE`, `EMBEDDING_DIM=768`, and `AI_SERVICE_INTERNAL_KEY` via `secretKeyRef` in ai-service env. |
| 3 | Critical | `docker-compose.prod.yml` API service missed `AI_SERVICE_INTERNAL_KEY` | Resolved | Added `AI_SERVICE_INTERNAL_KEY: ${AI_SERVICE_INTERNAL_KEY}` to API production environment. |
| 4 | Major | `/auth/me` profile response missed canonical enrollment and profile fields | Resolved | Extended the SQL projection in `apps/api/src/routes.ts` to include `bar_council_enrollment_number`, `bar_council_state`, `bci_enrollment_number`, `phone_number`, and `preferred_language`. |
| 5 | Major | `scripts/seed.ts` did not persist canonical bar council columns | Resolved | Updated `seedAttorneys` insert to write `bar_council_enrollment_number` and `bar_council_state` alongside compatibility fields. |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` passed.
- `npm run test:smoke --workspace=apps/api` passed.
- `npm run typecheck --workspace=apps/web` passed.
