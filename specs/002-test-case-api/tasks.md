# Tasks: Test Case API

**Input**: Design documents from `/specs/002-test-case-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — Constitution Principle II (Test-First) is NON-NEGOTIABLE.

**Organization**: Tasks grouped by user story. This feature builds on existing models/services from 001-foundation-auth and 006-credit-billing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New modules and migrations needed by all user stories

- [x] T001 Create shared pg-boss instance module (lazy init, singleton) in src/lib/jobs.ts
- [x] T002 [P] Create credential encryption service (AES-256-GCM encrypt/decrypt, key from CREDENTIAL_ENCRYPTION_KEY env var, base64 format with inline IV+authTag) in src/services/credential.service.ts
- [x] T003 [P] Create database migration adding required_skills, environment, tags, callback_url, expected_behavior, status_history columns to test_cases table and environment, tags, expected_behavior to test_templates table with GIN indexes in src/migrations/012-test-case-api-columns.sql
- [x] T004 Refactor src/server.ts to use shared pg-boss instance from src/lib/jobs.ts instead of inline creation in startPayoutScheduler

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update existing models to support new columns. MUST complete before user stories.

- [x] T005 Update TestCase model to include new fields (required_skills, environment, tags, callback_url, expected_behavior, status_history) in create/findById/listByBuilder queries, add appendStatusHistory helper in src/models/test-case.ts
- [x] T006 [P] Update TestTemplate model to include new fields (environment, tags, expected_behavior) in create/findById/listByBuilder/update queries in src/models/test-template.ts

**Checkpoint**: Models reflect new schema. User story implementation can begin.

---

## Phase 3: User Story 1 — Test Case Creation & Retrieval (Priority: P1) MVP

**Goal**: Builders create test cases via POST (credits reserved), list/retrieve via GET, cancel via DELETE (credits refunded), and retrieve results. Full CRUD with credit integration.

**Independent Test**: Create a test case (201 + credit reserved), list (paginated), get by ID (full details), cancel queued test (credits refunded), attempt cancel on in_progress (409), get results for completed test.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Unit test for credential encryption/decryption (roundtrip, tampering detection, key version) in tests/unit/credential.test.ts
- [x] T008 [P] [US1] Contract test for POST /api/v1/test-cases request/response shapes (201 success, 400 validation, 400 insufficient credits) in tests/contract/test-cases.test.ts
- [x] T009 [P] [US1] Contract test for GET /api/v1/test-cases list response shape (pagination, filtering) in tests/contract/test-cases.test.ts
- [x] T010 [P] [US1] Contract test for GET /api/v1/test-cases/:id response shape (has_credentials boolean, status_history, never returns credentials) in tests/contract/test-cases.test.ts
- [x] T011 [P] [US1] Contract test for DELETE /api/v1/test-cases/:id response shapes (200 cancelled, 409 cannot cancel) in tests/contract/test-cases.test.ts
- [x] T012 [P] [US1] Contract test for GET /api/v1/test-cases/:id/results response shape (verdict, per_step_results, partial results) in tests/contract/test-cases.test.ts
- [x] T013 [P] [US1] Integration test for test case creation with credit reservation (balance decreases, transaction created) in tests/integration/test-case-crud.test.ts
- [x] T014 [P] [US1] Integration test for test case cancellation with credit refund (only queued/assigned, balance restored) in tests/integration/test-case-cancel.test.ts
- [x] T015 [P] [US1] Integration test for concurrent creation with insufficient credits (one succeeds, one fails atomically) in tests/integration/test-case-crud.test.ts
- [x] T016 [P] [US1] Integration test for credential encryption at rest (credentials stored encrypted, never returned in API response) in tests/integration/credential-encryption.test.ts

### Implementation for User Story 1

- [x] T017 [US1] Implement TestCaseService with create (validate fields, calculate cost, encrypt credentials, reserve credits, insert with status_history, enqueue assign-tester job), getById, list (paginated/filtered), and getResults methods in src/services/test-case.service.ts
- [x] T018 [US1] Implement TestCaseService.cancel — SELECT FOR UPDATE on test_cases, validate status is queued/assigned, set cancelled, refund credits, cancel pg-boss jobs in src/services/test-case.service.ts
- [x] T019 [US1] Implement POST /api/v1/test-cases endpoint with JSON Schema validation (title, description, staging_url, steps required, min 1 step) in src/api/test-cases.routes.ts
- [x] T020 [US1] Implement GET /api/v1/test-cases endpoint with status filter, cursor pagination, limit (max 100) in src/api/test-cases.routes.ts
- [x] T021 [US1] Implement GET /api/v1/test-cases/:id endpoint returning full details with has_credentials boolean and status_history in src/api/test-cases.routes.ts
- [x] T022 [US1] Implement DELETE /api/v1/test-cases/:id endpoint with 409 for non-cancellable statuses in src/api/test-cases.routes.ts
- [x] T023 [US1] Implement GET /api/v1/test-cases/:id/results endpoint returning verdict, per_step_results, partial results for in-progress tests in src/api/test-cases.routes.ts
- [x] T024 [US1] Register test-cases routes in src/server.ts under /api/v1 with builder auth middleware in src/server.ts

**Checkpoint**: Builder can create test cases (credits reserved), list/retrieve, cancel (credits refunded), and view results. Credentials encrypted. Concurrent credit safety verified.

---

## Phase 4: User Story 2 — Template Management (Priority: P2)

**Goal**: Builders CRUD templates and instantiate test cases from templates with optional overrides.

**Independent Test**: Create template, list, update, create test case from template with overrides (inherits values, overrides applied, credits reserved), delete template (existing test cases unaffected).

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T025 [P] [US2] Contract test for POST/GET/PUT/DELETE /api/v1/templates response shapes in tests/contract/templates.test.ts
- [x] T026 [P] [US2] Contract test for POST /api/v1/templates/:id/use (instantiate with overrides) response shape in tests/contract/templates.test.ts
- [x] T027 [P] [US2] Integration test for template CRUD lifecycle (create, list, update fields, delete) in tests/integration/template-crud.test.ts
- [x] T028 [P] [US2] Integration test for template instantiation — test case inherits template values, overrides applied, credits reserved, empty steps override rejected in tests/integration/template-crud.test.ts

### Implementation for User Story 2

- [x] T029 [US2] Implement TemplateService with create, list, getById, update, delete, and useTemplate (merge template fields + overrides, validate, delegate to TestCaseService.create) in src/services/template.service.ts
- [x] T030 [US2] Implement POST /api/v1/templates with JSON Schema validation in src/api/templates.routes.ts
- [x] T031 [US2] Implement GET /api/v1/templates (list) and GET /api/v1/templates/:id in src/api/templates.routes.ts
- [x] T032 [US2] Implement PUT /api/v1/templates/:id and DELETE /api/v1/templates/:id in src/api/templates.routes.ts
- [x] T033 [US2] Implement POST /api/v1/templates/:id/use with optional overrides, same validation as direct creation in src/api/templates.routes.ts
- [x] T034 [US2] Register templates routes in src/server.ts under /api/v1 with builder auth middleware in src/server.ts

**Checkpoint**: Full template lifecycle works. Instantiation creates valid test cases with merged values and credit reservation.

---

## Phase 5: User Story 3 — Tester Assignment Engine (Priority: P3)

**Goal**: Automatic tester assignment via pg-boss jobs. 30-min acceptance window, 2-hour expiry, credit refund on expiry. Testers can accept assignments and submit results.

**Independent Test**: Create test case → observe queued → assigned (pg-boss assigns tester) → simulate tester accept → in_progress → submit results → completed. Also: simulate timeout → expired with credit refund.

### Tests for User Story 3

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T035 [P] [US3] Integration test for assign-tester job finding a qualified tester by skill match and workload in tests/integration/assignment.test.ts
- [x] T036 [P] [US3] Integration test for acceptance-timeout job (30 min) — tester not accepted, status returns to queued for reassignment in tests/integration/assignment.test.ts
- [x] T037 [P] [US3] Integration test for assignment-expiry job (2 hr) — test case expires, credits refunded in tests/integration/assignment.test.ts
- [x] T038 [P] [US3] Integration test for race condition — cancel and accept simultaneously, one wins deterministically in tests/integration/assignment.test.ts
- [x] T039 [P] [US3] Integration test for tester accepting assignment (status → in_progress) and submitting results (status → submitted → completed, 3 transactions created) in tests/integration/assignment.test.ts

### Implementation for User Story 3

- [x] T040 [US3] Implement AssignmentService with findQualifiedTester (skills @> match, FOR UPDATE SKIP LOCKED, workload ranking), assignTester, handleAcceptanceTimeout, and handleExpiry methods in src/services/assignment.service.ts
- [x] T041 [US3] Register assign-tester pg-boss worker — on job: call AssignmentService.findQualifiedTester, if found assign and enqueue acceptance-timeout, if not found let pg-boss retry in src/lib/jobs.ts
- [x] T042 [US3] Register acceptance-timeout pg-boss worker — on job: check if still assigned, if so clear assignment, set status back to queued, enqueue new assign-tester in src/lib/jobs.ts
- [x] T043 [US3] Register assignment-expiry pg-boss worker — on job: check if still queued/assigned, if so set expired, refund credits via CreditService.refundCredits in src/lib/jobs.ts
- [x] T044 [US3] Implement tester accept endpoint POST /api/v1/test-cases/:id/accept — SELECT FOR UPDATE on test_cases, validate assigned status, transition to in_progress, update tester.current_task_id in src/api/test-cases.routes.ts
- [x] T045 [US3] Implement tester submit results endpoint POST /api/v1/test-cases/:id/results — validate all steps have results, create TestResult, transition to submitted→completed, trigger CreditService.completeTest for 3 atomic transactions in src/api/test-cases.routes.ts
- [x] T046 [US3] Wire assignment job enqueue into TestCaseService.create — after credit reservation and test case insert, enqueue assign-tester and assignment-expiry jobs in src/services/test-case.service.ts

**Checkpoint**: Full assignment lifecycle works. Testers auto-assigned, timeouts handled, credits refunded on expiry, results submitted and finalized.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation hardening, callback delivery, and cross-story integration

- [x] T047 [P] Add JSON Schema validation for all test-case and template request bodies in src/api/test-cases.routes.ts and src/api/templates.routes.ts
- [x] T048 [P] Implement callback delivery — when test case reaches completed, POST result payload to callback_url with retry (3 attempts, exponential backoff) in src/services/test-case.service.ts
- [x] T049 [P] Ensure credentials are stripped from all API responses, logs, and error messages — audit serialization paths in src/api/test-cases.routes.ts
- [x] T050 Run quickstart.md validation — verify end-to-end: create test case, assignment flow, cancel/refund, template instantiation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration + models need jobs.ts, credential service)
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core CRUD
- **User Story 2 (Phase 4)**: Depends on US1 (template instantiation calls TestCaseService.create)
- **User Story 3 (Phase 5)**: Depends on US1 (assignment operates on created test cases)
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (model updates)
    ↓
Phase 3: US1 — Test Case CRUD + Credits (MVP)
    ↓
Phase 4: US2 — Template Management (depends on US1 create)
    ↓ (can start after US1, independent of US2)
Phase 5: US3 — Assignment Engine (depends on US1 for test cases)
    ↓
Phase 6: Polish
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Services before routes
3. Routes before server registration
4. Commit after each task or logical group

### Parallel Opportunities

**Phase 1**: T002, T003 in parallel after T001
**Phase 2**: T005, T006 in parallel
**Phase 3 (US1)**: T007–T016 (all tests) in parallel
**Phase 4 (US2)**: T025–T028 (all tests) in parallel
**Phase 5 (US3)**: T035–T039 (all tests) in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together (write first, must fail):
Task: "T007 Credential encryption unit test in tests/unit/credential.test.ts"
Task: "T008 POST test-cases contract test in tests/contract/test-cases.test.ts"
Task: "T013 Test case creation integration test in tests/integration/test-case-crud.test.ts"
Task: "T014 Test case cancellation integration test in tests/integration/test-case-cancel.test.ts"
Task: "T016 Credential encryption integration test in tests/integration/credential-encryption.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (jobs.ts, credential service, migration)
2. Complete Phase 2: Foundational (model updates)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Builder can create/list/cancel test cases with credits
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Ready
2. Add US1 → Deploy/Demo (MVP — test case CRUD with credits)
3. Add US2 → Deploy/Demo (adds templates)
4. Add US3 → Deploy/Demo (adds auto-assignment — full product loop)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests written FIRST and must FAIL (Constitution Principle II)
- Mocks only for external services; integration tests hit real PostgreSQL
- Credentials NEVER appear in API responses — return has_credentials: boolean
- Credit operations use SELECT FOR UPDATE (existing pattern from 006)
- Assignment jobs use pg-boss (already in project for payout scheduling)
