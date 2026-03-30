# Tasks: Webhook Delivery

**Feature**: 005-webhook-delivery | **Date**: 2026-03-30

## Phase 1: Setup

- [x] **T001** Create migration adding machine_summary JSONB column to test_results
  - File: `src/migrations/013-machine-summary.sql`
  - `ALTER TABLE test_results ADD COLUMN IF NOT EXISTS machine_summary JSONB;`

- [x] **T002** [P] Create webhook signing utility (HMAC-SHA256)
  - File: `src/lib/webhook-signing.ts`
  - `signPayload(payload, secret)` returns hex string
  - `verifySignature(payload, secret, signature)` returns boolean

## Phase 2: US1 -- Webhook Delivery (P1)

### Tests

- [x] **T003** [P] [US1] Unit test for HMAC-SHA256 signing (deterministic, verifiable)
  - File: `tests/unit/webhook-signing.test.ts`
  - Deterministic output, different inputs produce different signatures, verify round-trip

- [x] **T004** [P] [US1] Unit test for machine summary generation (confidence scoring)
  - File: `tests/unit/machine-summary.test.ts`
  - All passed -> 1.0, critical failure penalty, multiple failures accumulate, blocked steps, zero steps

- [x] **T005** [P] [US1] Integration test for webhook delivery with retry scheduling
  - File: `tests/integration/webhook-delivery.test.ts`
  - Delivery on completion, failed delivery triggers retry, HMAC verifiable, history recorded

### Implementation

- [x] **T006** [US1] Implement machine summary generator
  - File: `src/services/summary.service.ts`
  - `generateMachineSummary(params)` with severity-based confidence penalties
  - Penalty schedule: critical -0.4, major -0.2, minor -0.1, suggestion -0.05, blocked -0.15

- [x] **T007** [US1] Implement webhook delivery service
  - File: `src/services/webhook.service.ts`
  - `assemblePayload(testCaseId)`: Load test case + step results + test result, generate summary, build payload
  - `deliverWebhook(testCaseId)`: Get builder config, assemble, sign, POST, record attempt, schedule retry on failure
  - `scheduleRetry(deliveryId, testCaseId, attemptNumber)`: pg-boss job with delay (1min/5min/30min)
  - `sendPing(builderId)`: Synthetic test payload

- [x] **T008** [US1] Register webhook delivery pg-boss workers
  - File: `src/lib/jobs.ts` (modification)
  - Worker for `deliver-webhook` job type
  - Exported `WEBHOOK_JOB` constant and `registerWebhookWorker(boss, logger)` function

- [x] **T009** [US1] Wire webhook delivery trigger into test completion flow
  - File: `src/services/webhook.service.ts`
  - `triggerWebhookDelivery(testCaseId)` enqueues pg-boss job for immediate delivery

## Phase 3: US2 -- Webhook Configuration (P2)

### Tests

- [x] **T010** [P] [US2] Contract test for webhook config endpoints
  - File: `tests/contract/webhook.test.ts`
  - PUT /api/v1/webhook: set URL + secret, validates response shape
  - POST /api/v1/webhook/ping: send test payload, validates response shape
  - GET /api/v1/webhook/history: list attempts, validates pagination shape

### Implementation

- [x] **T011** [US2] Implement webhook configuration routes
  - File: `src/api/webhook.routes.ts`
  - PUT /api/v1/webhook: Update builder webhook_url + webhook_secret
  - POST /api/v1/webhook/ping: Send test ping via WebhookService.sendPing()
  - GET /api/v1/webhook/history: List deliveries with keyset pagination

- [x] **T012** [US2] Register webhook routes in server
  - File: `src/server.ts` (modification)
  - Register `webhookRoutes` with prefix `/api/v1`

## Phase 4: US3 -- Machine Summary (P2)

- [x] **T013** [P] [US3] Integration test for machine summary confidence scoring
  - File: `tests/integration/machine-summary.test.ts`
  - Various step outcome combinations produce correct confidence values

## Phase 5: Polish

- [x] **T014** Ensure webhook payload never contains builder credentials or sensitive data
  - Verified in `WebhookService.assemblePayload()`: only includes test case fields, step results (no credentials), test result, and machine summary. Builder credentials, API keys, and webhook secrets are never included in the payload.
