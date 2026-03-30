# Research: Test Case API

**Feature**: 002-test-case-api | **Date**: 2026-03-31

## 1. Assignment Engine Architecture

**Decision**: Hybrid — synchronous credit reservation, async pg-boss jobs for tester matching

**Rationale**:
- Credit reservation stays synchronous in the POST handler (builder needs immediate feedback on insufficient credits).
- Tester matching runs as an async pg-boss job because: matching may take variable time, no testers may be available immediately, and the system needs retry capability.
- Three job types for the timeout chain:
  - `assign-tester`: Enqueued on test case creation. Retries every 2 minutes (up to 15 retries). Finds available tester by skill match + workload.
  - `acceptance-timeout`: Enqueued with `startAfter: 1800` (30 min) when a tester is assigned. If tester hasn't accepted, clears assignment and re-enqueues `assign-tester`.
  - `assignment-expiry`: Enqueued with `startAfter: 7200` (2 hours) at creation. Hard deadline — expires test case and refunds credits regardless of assignment state.

**Alternatives considered**:
- Synchronous assignment blocking the HTTP response: Rejected — can't handle "no tester available now, retry later."
- Single long-running job: Rejected — harder to manage timeout states, less observable.

## 2. Race Condition Resolution (Cancel vs Accept)

**Decision**: SELECT FOR UPDATE on test_cases row, status precondition in UPDATE WHERE clause

**Rationale**:
- Both cancel and accept operations: BEGIN → SELECT FOR UPDATE on test_cases → check status → UPDATE with WHERE status precondition → COMMIT.
- First transaction to lock the row wins. Second sees updated status and aborts.
- Lock ordering: test_cases first, credit_balances second (for refund on cancel). Prevents deadlocks.
- Matches existing pattern in CreditBalanceModel.getForUpdate().

## 3. Skill Matching Query

**Decision**: JSONB containment operator `@>` with existing GIN index + FOR UPDATE SKIP LOCKED

**Rationale**:
- `testers.skills @> '["required_skill"]'::jsonb` uses the GIN index from 001-foundation-auth.
- `FOR UPDATE SKIP LOCKED` prevents concurrent assignment jobs from selecting the same tester.
- Ranking by workload: subquery counting current assigned/in_progress tasks per tester.
- Add `required_skills` JSONB column to test_cases for explicit skill requirements.

## 4. Credential Encryption

**Decision**: AES-256-GCM via Node.js crypto, entire credentials object as one blob

**Rationale**:
- GCM is authenticated encryption (AEAD) — detects tampering. No padding oracle attacks.
- Encrypt entire credentials sub-object (always consumed together, fewer crypto operations).
- Storage format: `base64(iv[12] + ciphertext + authTag[16])` in JSONB field.
- Key stored in `CREDENTIAL_ENCRYPTION_KEY` env var (32 bytes, hex-encoded).
- `key_version` integer stored alongside ciphertext for rotation support.
- API responses never include credentials — return `has_credentials: boolean` only.

**Alternatives considered**:
- AES-256-CBC: Requires separate HMAC for integrity. More error-prone. Rejected.
- Per-field encryption: Unnecessary overhead since credentials are always read/written together. Rejected.
- KMS: Good for production maturity but adds complexity for MVP. Deferred.

## 5. pg-boss Instance Management

**Decision**: Single shared instance exported from src/lib/jobs.ts

**Rationale**:
- Currently pg-boss is created inside startPayoutScheduler(). Refactor to a shared module.
- Export `getJobManager()` that lazily initializes and returns the singleton boss instance.
- Both payout scheduler and assignment engine workers use the same instance.
- Consistent with the `sql` singleton pattern from src/lib/db.ts.
