# Tasks: Foundation & Auth

**Input**: Design documents from `/specs/001-foundation-auth/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — Constitution Principle II (Test-First) is NON-NEGOTIABLE.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and TypeScript/Fastify scaffolding

- [x] T001 Initialize TypeScript project with package.json, tsconfig.json, and dependencies (fastify, postgres, @fastify/oauth2, @fastify/session, @fastify/cookie, @fastify/cors, @fastify/rate-limit, connect-pg-simple, vitest, tsx)
- [x] T002 [P] Configure ESLint and Prettier for TypeScript in eslint.config.js and .prettierrc
- [x] T003 [P] Create .gitignore with Node.js patterns (node_modules, dist, .env, coverage)
- [x] T004 [P] Create vitest.config.ts with test configuration
- [x] T005 [P] Create database connection module with postgres.js in src/lib/db.ts
- [x] T006 [P] Create structured error response utility in src/lib/errors.ts (code + message + context format per constitution)
- [x] T007 [P] Create API key generation and SHA-256 hashing utilities in src/lib/api-key.ts
- [x] T008 Create Fastify server entry point with plugin registration (cookie, cors, rate-limit, session, routes) in src/server.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema for all 8 core entities. MUST complete before ANY user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T009 Create shared updated_at trigger function migration in src/migrations/000-updated-at-trigger.sql
- [x] T010 [P] Create builders table migration with UUID PK, all fields from data-model, CHECK on plan_tier, updated_at trigger in src/migrations/001-builders.sql
- [x] T011 [P] Create api_keys table migration with key_hash CHAR(64) UNIQUE, builder_id FK, revoked_at nullable, in src/migrations/002-api-keys.sql
- [x] T012 [P] Create testers table migration with UUID PK, all profile fields, JSONB skills/languages, updated_at trigger in src/migrations/003-testers.sql
- [x] T013 [P] Create test_templates table migration with builder_id FK, JSONB steps, updated_at trigger in src/migrations/004-test-templates.sql
- [x] T014 [P] Create test_cases table migration with builder_id FK, template_id FK, JSONB steps/credentials, CHECK on status enum, indexes on (builder_id), (builder_id, status), partial index on active statuses in src/migrations/005-test-cases.sql
- [x] T015 [P] Create step_results table migration with test_case_id FK, tester_id FK, CHECK on status/severity enums, UNIQUE on (test_case_id, step_index) in src/migrations/006-step-results.sql
- [x] T016 [P] Create test_results table migration with test_case_id FK UNIQUE, tester_id FK, CHECK on verdict enum in src/migrations/007-test-results.sql
- [x] T017 [P] Create transactions table migration with immutability trigger (reject UPDATE/DELETE), CHECK on type enum, indexes on (builder_id, created_at DESC) and (tester_id, created_at DESC) in src/migrations/008-transactions.sql
- [x] T018 [P] Create webhook_deliveries table migration with builder_id FK, test_case_id FK, JSONB payload, index on (builder_id, created_at DESC) in src/migrations/009-webhook-deliveries.sql
- [x] T019 Create RLS policies migration for all tables — builder policies (own data via app.current_builder_id), tester policies (own data via app.current_tester_id), FORCE ROW LEVEL SECURITY on all tables in src/migrations/010-rls-policies.sql
- [x] T020 [P] Create session storage table migration for connect-pg-simple in src/migrations/011-sessions.sql
- [x] T021 Create seed data script with 2 test builders (with API keys), 3 test testers (one per region), and 1 test template in src/migrations/seed.sql

**Checkpoint**: Foundation ready — all 8 entity tables exist with constraints, triggers, indexes, and RLS policies.

---

## Phase 3: User Story 1 — Database Schema & Project Scaffolding (Priority: P1) MVP

**Goal**: All tables exist with correct columns, constraints, and relationships. RLS prevents cross-tenant access. Application starts and connects to the database.

**Independent Test**: Verify all tables exist with correct columns, insert records with valid/invalid enum values, verify RLS blocks cross-tenant queries, and confirm the app starts and responds to health checks.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US1] Integration test verifying all 8 entity tables exist with UUID PKs and timestamp columns in tests/integration/schema.test.ts
- [x] T023 [P] [US1] Integration test verifying CHECK constraints reject invalid enum values (bad status, bad severity, bad verdict, bad transaction type) in tests/integration/schema.test.ts
- [x] T024 [P] [US1] Integration test verifying RLS blocks cross-tenant data access — builder A cannot see builder B's test cases in tests/integration/rls.test.ts
- [x] T025 [P] [US1] Contract test for GET /health response shape (status, database, uptime_seconds) in tests/contract/health.test.ts
- [x] T026 [P] [US1] Unit test for API key generation (correct prefix, correct length) and SHA-256 hashing (deterministic, correct hash length) in tests/unit/api-key.test.ts
- [x] T027 [P] [US1] Unit test for structured error formatting (code + message + context) in tests/unit/errors.test.ts

### Implementation for User Story 1

- [x] T028 [P] [US1] Create Builder model with findById, findByApiKeyHash, create, and update methods in src/models/builder.ts
- [x] T029 [P] [US1] Create Tester model with findById, findByEmail, create, update, and checkIsActive methods in src/models/tester.ts
- [x] T030 [P] [US1] Create TestCase model with findById, listByBuilder, create, updateStatus methods in src/models/test-case.ts
- [x] T031 [P] [US1] Create TestTemplate model with findById, listByBuilder, create, update, delete methods in src/models/test-template.ts
- [x] T032 [P] [US1] Create StepResult model with findByTestCase, create, update methods in src/models/step-result.ts
- [x] T033 [P] [US1] Create TestResult model with findByTestCase, create methods in src/models/test-result.ts
- [x] T034 [P] [US1] Create Transaction model with insert (immutable), listByBuilder, listByTester methods in src/models/transaction.ts
- [x] T035 [P] [US1] Create WebhookDelivery model with create, listByBuilder, updateAttempt methods in src/models/webhook-delivery.ts
- [x] T036 [US1] Implement GET /health endpoint returning database connectivity status and uptime in src/api/health.routes.ts
- [x] T037 [US1] Wire health route into server and verify app starts, connects to DB, and serves /health in src/server.ts

**Checkpoint**: All 8 tables exist, RLS enforced, enums validated, app starts and serves /health.

---

## Phase 4: User Story 2 — Builder API Key Authentication (Priority: P2)

**Goal**: Builders authenticate via API key in Authorization header. Invalid/revoked keys are rejected. Rate limiting enforces 100 req/min. CORS restricts origins.

**Independent Test**: Send requests with valid key (200), invalid key (401), revoked key (401), missing key (401), exceed rate limit (429), and unknown origin (CORS rejected).

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T038 [P] [US2] Integration test for successful builder auth with valid API key — request.builder is populated in tests/integration/builder-auth.test.ts
- [x] T039 [P] [US2] Integration test for rejection with invalid/missing/revoked API key — structured 401 error in tests/integration/builder-auth.test.ts
- [x] T040 [P] [US2] Integration test for rate limiting — 101st request returns 429 with retry-after headers in tests/integration/rate-limiting.test.ts
- [x] T041 [P] [US2] Contract test for 401 and 429 error response shapes matching auth-api.md contract in tests/contract/auth-errors.test.ts

### Implementation for User Story 2

- [x] T042 [US2] Implement AuthService with verifyApiKey (SHA-256 hash, DB lookup, LRU cache with 30s TTL) and generateApiKey methods in src/services/auth.service.ts
- [x] T043 [US2] Implement builder auth preHandler middleware — extract Bearer token, verify via AuthService, decorate request.builder, set RLS context via SET LOCAL in src/middleware/builder-auth.ts
- [x] T044 [US2] Configure @fastify/cors with ALLOWED_ORIGINS env var whitelist in src/server.ts
- [x] T045 [US2] Configure @fastify/rate-limit at 100 req/min keyed by API key hash, with structured 429 error response and retry-after headers in src/server.ts
- [x] T046 [US2] Create a protected test route (GET /api/v1/me) that returns authenticated builder info, demonstrating the auth middleware works end-to-end in src/api/builder-api.routes.ts

**Checkpoint**: Builder API key auth works end-to-end. Invalid keys rejected. Rate limit enforced. CORS configured.

---

## Phase 5: User Story 3 — Tester Session Authentication (Priority: P3)

**Goal**: Testers authenticate via Google social login, receive a server-side session, and can access their own data. Deactivated testers are rejected. Sessions expire and redirect to login.

**Independent Test**: Complete Google OAuth flow (mocked), verify session is created, verify subsequent requests are authenticated, verify deactivated tester is rejected, verify expired session redirects to login.

### Tests for User Story 3

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T047 [P] [US3] Integration test for successful tester login via OAuth callback — session created, redirect to dashboard in tests/integration/tester-auth.test.ts
- [x] T048 [P] [US3] Integration test for rejection of non-existent tester email (not pre-vetted) — 403 TESTER_NOT_FOUND in tests/integration/tester-auth.test.ts
- [x] T049 [P] [US3] Integration test for rejection of deactivated tester (is_active=false) — 403 TESTER_DEACTIVATED in tests/integration/tester-auth.test.ts
- [x] T050 [P] [US3] Integration test for session expiry — expired session returns 401 and redirects to login in tests/integration/tester-auth.test.ts
- [x] T051 [P] [US3] Integration test for cross-tester data isolation — tester A cannot see tester B's data via RLS in tests/integration/rls.test.ts
- [x] T052 [P] [US3] Contract test for GET /auth/me response shape and POST /auth/logout response shape in tests/contract/auth-errors.test.ts

### Implementation for User Story 3

- [x] T053 [US3] Configure @fastify/session with connect-pg-simple PostgreSQL store (httpOnly, secure, sameSite=Lax, 7-day maxAge, signed) in src/server.ts
- [x] T054 [US3] Configure @fastify/oauth2 for Google OAuth2 with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL in src/server.ts
- [x] T055 [US3] Implement GET /auth/google route that initiates OAuth flow (redirect to Google consent) in src/api/auth.routes.ts
- [x] T056 [US3] Implement GET /auth/google/callback route — exchange code for token, fetch Google userinfo, look up tester by email, check is_active, create session, redirect to dashboard in src/api/auth.routes.ts
- [x] T057 [US3] Implement tester auth preHandler middleware — check session, verify tester is_active, decorate request.tester, set RLS context via SET LOCAL in src/middleware/tester-auth.ts
- [x] T058 [US3] Implement GET /auth/me route returning authenticated tester profile in src/api/auth.routes.ts
- [x] T059 [US3] Implement POST /auth/logout route that destroys session in src/api/auth.routes.ts

**Checkpoint**: Tester social login works end-to-end. Sessions persist. Deactivated testers rejected. Expired sessions redirect. Cross-tester isolation enforced.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, validation, and cross-story integration

- [x] T060 [P] Add JSON Schema validation for all request bodies and query params across auth routes in src/api/auth.routes.ts
- [x] T061 [P] Verify all error responses conform to structured format (code + message + context) — audit all throw/reply paths in src/lib/errors.ts
- [x] T062 [P] Add database connection health check with timeout to /health endpoint in src/api/health.routes.ts
- [x] T063 Run quickstart.md validation — verify end-to-end: app starts in <10s, health check passes, builder auth works, tester login flow completes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on US1 (needs builders table + models)
- **User Story 3 (Phase 5)**: Depends on US1 (needs testers table + models)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all stories)
    ↓
Phase 3: US1 — Schema + Scaffolding (MVP)
    ↓
Phase 4: US2 — Builder API Key Auth (depends on US1 for builder model)
    ↓ (can start after US1, independent of US2)
Phase 5: US3 — Tester Social Login (depends on US1 for tester model)
    ↓
Phase 6: Polish
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Models before services
3. Services before middleware
4. Middleware before routes
5. Commit after each task or logical group

### Parallel Opportunities

**Phase 1**: T002–T007 can all run in parallel after T001
**Phase 2**: T010–T018, T020 can all run in parallel after T009
**Phase 3 (US1)**: T022–T027 (all tests) in parallel; T028–T035 (all models) in parallel
**Phase 4 (US2)**: T038–T041 (all tests) in parallel
**Phase 5 (US3)**: T047–T052 (all tests) in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together (write first, must fail):
Task: "T022 Schema existence test in tests/integration/schema.test.ts"
Task: "T023 Enum constraint test in tests/integration/schema.test.ts"
Task: "T024 RLS isolation test in tests/integration/rls.test.ts"
Task: "T025 Health endpoint contract test in tests/contract/health.test.ts"
Task: "T026 API key utility unit test in tests/unit/api-key.test.ts"
Task: "T027 Error formatting unit test in tests/unit/errors.test.ts"

# Then launch all models for US1 together:
Task: "T028 Builder model in src/models/builder.ts"
Task: "T029 Tester model in src/models/tester.ts"
Task: "T030 TestCase model in src/models/test-case.ts"
Task: "T031 TestTemplate model in src/models/test-template.ts"
Task: "T032 StepResult model in src/models/step-result.ts"
Task: "T033 TestResult model in src/models/test-result.ts"
Task: "T034 Transaction model in src/models/transaction.ts"
Task: "T035 WebhookDelivery model in src/models/webhook-delivery.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: All tables exist, RLS works, app starts, /health responds
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP — schema + health)
3. Add User Story 2 → Test independently → Deploy/Demo (adds builder API auth)
4. Add User Story 3 → Test independently → Deploy/Demo (adds tester social login)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable (after its dependencies)
- Tests are written FIRST and must FAIL before implementation (Constitution Principle II)
- Mocks are only used for Google OAuth (third-party); integration tests hit real PostgreSQL
- Commit after each task or logical group
- API keys are hashed with SHA-256, never stored in plaintext
- RLS context set via SET LOCAL (scoped to transaction, safe with connection pooling)
