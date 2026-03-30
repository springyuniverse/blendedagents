# Feature Specification: Test Case API

**Feature Branch**: `002-test-case-api`
**Created**: 2026-03-30
**Status**: Draft
**Input**: BlendedAgents PDR v2.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test Case Creation & Retrieval (Priority: P1)

As a builder integrating AI tools with human testing, I need to create test cases via API so that my automated pipeline can request human verification of AI-generated outputs. I must be able to submit a test case with all necessary context (staging URL, credentials, steps, expected behavior) and retrieve its status and results as the human tester progresses through it.

**Why this priority**: This is the core value proposition of BlendedAgents. Without the ability to create and retrieve test cases, no other feature delivers value. Every downstream capability (templates, assignment, results) depends on this.

**Independent Test**: Can be fully tested by creating a test case via POST, retrieving it via GET, and confirming the response contains all submitted fields plus a system-assigned status. Delivers immediate value as the minimum integration point for any builder.

**Acceptance Scenarios**:

1. **Given** an authenticated builder with sufficient credits, **When** they POST a test case with title, description, staging_url, steps, and expected_behavior, **Then** the system creates the test case, reserves credits (base cost of 2 plus 1 per step), returns the test case ID and a `queued` status, and the builder's available credit balance decreases by the reserved amount.
2. **Given** a builder who has created multiple test cases, **When** they GET the test cases list, **Then** the system returns a paginated list of their test cases with summary information (ID, title, status, created date, credit cost).
3. **Given** a builder who has created a test case, **When** they GET the test case by ID, **Then** the system returns the full test case details including current status, all submitted fields, and timestamps for each status transition.
4. **Given** a builder with a test case in `queued` status, **When** they DELETE that test case, **Then** the system cancels the test case, sets its status to `cancelled`, and refunds the reserved credits in full.
5. **Given** a builder with a test case in `completed` status, **When** they GET the result endpoint, **Then** the system returns the full result including overall pass/fail, per-step breakdown with tester observations, screenshots, and timestamps.
6. **Given** a builder with a test case in `in_progress` status, **When** they attempt to DELETE it, **Then** the system rejects the cancellation because work has already begun.
7. **Given** a builder with insufficient credits, **When** they attempt to create a test case, **Then** the system rejects the request with a clear error indicating the credit shortfall and the cost of the requested test case.

---

### User Story 2 - Template Management (Priority: P2)

As a builder who runs recurring or similar tests, I need to save test case configurations as reusable templates so that I can quickly create new test cases without re-entering repetitive details. I should be able to create, browse, edit, and delete my templates, and instantiate a new test case from any template with optional overrides.

**Why this priority**: Templates reduce friction for repeat usage and increase builder retention. However, builders can still use the platform without templates by creating test cases directly, so this is secondary to the core CRUD.

**Independent Test**: Can be fully tested by creating a template, listing templates, updating a template, creating a test case from that template, and confirming the new test case inherits the template values. Delivers value as a standalone workflow for builders who run similar tests repeatedly.

**Acceptance Scenarios**:

1. **Given** an authenticated builder, **When** they POST a template with title, description, staging_url, steps, and expected_behavior, **Then** the system creates the template and returns its ID.
2. **Given** a builder with existing templates, **When** they GET the templates list, **Then** the system returns all their templates with summary information.
3. **Given** a builder with an existing template, **When** they PUT updated fields on that template, **Then** the system updates the template and returns the modified version.
4. **Given** a builder with an existing template, **When** they POST to the template's "use" endpoint with optional field overrides, **Then** the system creates a new test case pre-filled from the template, applies any overrides, reserves credits, and returns the new test case with `queued` status.
5. **Given** a builder with a template that has been used to create test cases, **When** they DELETE the template, **Then** the system removes the template but previously created test cases remain unaffected.

---

### User Story 3 - Tester Assignment Engine (Priority: P3)

As the platform, when a test case is created and enters `queued` status, the system must automatically find and assign a qualified human tester. The assignment engine considers tester availability, skill match against the test case requirements, and current workload balance. Assigned testers have a 30-minute window to accept, after which assignment escalates to a 2-hour extended search. If no tester accepts within the extended window, the test case expires and credits are refunded.

**Why this priority**: Assignment is critical for end-to-end flow but is an internal system behavior, not a builder-facing API surface. Builders interact with it indirectly through status changes on their test cases. It can be implemented after the API layer is stable.

**Independent Test**: Can be tested by creating a test case, observing the status transition from `queued` to `assigned`, simulating tester acceptance to reach `in_progress`, and simulating timeout to verify expiration and credit refund.

**Acceptance Scenarios**:

1. **Given** a test case in `queued` status, **When** the assignment engine runs, **Then** it identifies available testers, filters by skill match, ranks by lowest current workload, and assigns the top candidate, transitioning the test case to `assigned` status.
2. **Given** a test case in `assigned` status, **When** the assigned tester accepts within 30 minutes, **Then** the test case transitions to `in_progress` and the tester can begin executing steps.
3. **Given** a test case in `assigned` status, **When** the assigned tester does not accept within 30 minutes, **Then** the system enters a 2-hour extended assignment window and attempts to find alternative testers.
4. **Given** a test case in the extended assignment window, **When** the 2-hour window elapses with no tester acceptance, **Then** the test case transitions to `expired` status and the builder's reserved credits are refunded in full.
5. **Given** a tester who has accepted a test case, **When** they complete all steps and submit their results, **Then** the test case transitions to `submitted` and then to `completed`, and the builder can retrieve the full results.

---

### Edge Cases

- What happens when a builder creates a test case with zero steps? The system MUST reject it because credit cost calculation requires at least one step.
- What happens when a builder's credits are exactly equal to the cost of the test case? The system MUST allow creation since the balance covers the cost.
- What happens when two test cases are created simultaneously and the builder only has enough credits for one? The system MUST handle concurrent credit reservation atomically to prevent overdraft.
- What happens when a tester disconnects mid-test (after `in_progress`)? The system MUST detect the timeout and either reassign or transition the test case appropriately without losing partial results.
- What happens when a builder cancels a test case at the exact moment a tester accepts it? The system MUST resolve this race condition deterministically -- either the cancellation succeeds and the tester is released, or the acceptance succeeds and cancellation is rejected.
- What happens when a template is used to create a test case but the builder overrides the steps to be empty? The same validation rules that apply to direct creation MUST apply to template-based creation.
- What happens when a builder requests test case results before the test is complete? The system MUST return the current partial state with a clear indication that results are incomplete.
- What happens when the callback_url provided by the builder is unreachable? The system MUST retry delivery with exponential backoff and surface the failure in the test case status details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a RESTful API under `/api/v1/test-cases` for creating, listing, retrieving, and cancelling test cases.
- **FR-002**: System MUST expose a RESTful API under `/api/v1/templates` for creating, listing, retrieving, updating, and deleting test case templates, plus an endpoint to instantiate a test case from a template.
- **FR-003**: System MUST require authentication (from 001-foundation-auth) on all endpoints and scope all data to the authenticated builder's workspace.
- **FR-004**: System MUST validate all required fields on test case creation: title, description, staging_url, expected_behavior, and at least one entry in the steps array.
- **FR-005**: System MUST automatically calculate credit cost as: `base_cost (2) + steps_count * cost_per_step (1)` and reserve that amount from the builder's credit balance at creation time.
- **FR-006**: System MUST reject test case creation when the builder's available credit balance is less than the calculated cost, returning the shortfall amount in the error response.
- **FR-007**: System MUST enforce the test case status lifecycle: `queued` -> `assigned` -> `in_progress` -> `submitted` -> `completed`, with `expired` and `cancelled` as terminal states reachable from `queued` or `assigned`.
- **FR-008**: System MUST support pagination on list endpoints with configurable page size and cursor-based or offset-based navigation.
- **FR-009**: System MUST support filtering test cases by status, date range, and tags.
- **FR-010**: System MUST allow cancellation (DELETE) of test cases only when in `queued` or `assigned` status, and MUST refund the full reserved credits upon cancellation.
- **FR-011**: System MUST record timestamps for every status transition on a test case.
- **FR-012**: System MUST support the following fields on test case creation: title, description, staging_url, credentials (encrypted at rest), expected_behavior, steps (ordered array), environment, tags, external_id, and callback_url.
- **FR-013**: System MUST return per-step results including tester observations, pass/fail per step, screenshots, and timestamps when the builder retrieves test case results.
- **FR-014**: The assignment engine MUST evaluate testers using three criteria in order: availability, skill match, and workload balance.
- **FR-015**: The assignment engine MUST enforce a 30-minute initial acceptance window followed by a 2-hour extended search window before expiring the test case.
- **FR-016**: System MUST refund reserved credits in full when a test case reaches `expired` status due to assignment failure.
- **FR-017**: System MUST allow template-based test case creation via POST to `/api/v1/templates/:id/use`, accepting optional field overrides that take precedence over template values.
- **FR-018**: System MUST apply the same validation rules to template-based test case creation as to direct creation.
- **FR-019**: System MUST encrypt builder-provided credentials at rest and never return them in plaintext via the API.
- **FR-020**: System MUST deliver results to the builder's callback_url (if provided) when a test case reaches `completed` status, with retry logic for delivery failures.

### Key Entities

- **Test Case**: A request from a builder for human verification. Contains all context a tester needs (title, description, staging URL, credentials, expected behavior, ordered steps, environment details), plus system-managed fields (status, credit cost, timestamps, assigned tester, external ID, callback URL, tags). Belongs to one builder workspace. Has one active tester assignment at a time. Produces one result upon completion.
- **Test Case Step**: An individual action within a test case that the tester must execute and report on. Contains the step instruction and expected outcome. Produces a step-level result with pass/fail, observations, and optional screenshots. Order matters.
- **Test Case Result**: The aggregate outcome of a completed test case. Contains overall pass/fail determination, per-step breakdown, tester identity, total execution time, and completion timestamp. Immutable once the test case reaches `completed` status.
- **Template**: A reusable configuration saved by a builder for creating test cases with pre-filled values. Contains the same content fields as a test case (title, description, staging_url, steps, expected_behavior, environment, tags) but no runtime fields (no status, no credits, no assignment). Belongs to one builder workspace. Can be used unlimited times.
- **Credit Reservation**: A hold on a builder's credit balance tied to a specific test case. Created when the test case is created, consumed when the test case completes, and refunded when the test case is cancelled or expires. Amount is calculated deterministically from the step count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A builder can create a test case, receive a confirmation with cost and status, and retrieve it by ID -- all within a single API session and under 3 seconds total round-trip time.
- **SC-002**: 100% of test case cancellations on `queued` or `assigned` test cases result in full credit refund reflected in the builder's balance within 5 seconds.
- **SC-003**: The assignment engine assigns a qualified tester to 90% of queued test cases within 5 minutes under normal platform load.
- **SC-004**: 100% of test cases that exceed the 2-hour extended assignment window transition to `expired` status and trigger a full credit refund with no manual intervention.
- **SC-005**: A builder can create a template, instantiate a test case from it with overrides, and verify the resulting test case reflects the merged values -- all within a single API session.
- **SC-006**: List endpoints return paginated results within 1 second for builders with up to 10,000 test cases.
- **SC-007**: No two concurrent test case creations from the same builder can overdraft the builder's credit balance, verified under concurrent load.
- **SC-008**: Builder-provided credentials are never present in plaintext in API responses, logs, or error messages.
- **SC-009**: Every status transition on a test case is recorded with a timestamp and is retrievable by the builder, providing a complete audit trail.
- **SC-010**: Callback delivery to the builder's callback_url succeeds on first attempt for 95% of reachable URLs, with failed deliveries retried and surfaced in the test case status.

## Assumptions

- The authentication and authorization system from 001-foundation-auth is fully operational and provides workspace-scoped identity on every request.
- Builders have a pre-existing credit balance managed by a separate billing feature; this specification covers reservation and refund mechanics only, not credit purchase or top-up.
- Human testers are registered in the platform with availability status and skill profiles before this feature is deployed; tester onboarding is out of scope.
- A single test case is assigned to exactly one tester at a time; collaborative or parallel testing by multiple testers on one test case is out of scope.
- The callback_url mechanism is a best-effort delivery; builders are expected to also poll for results rather than relying solely on callbacks.
- File attachments (screenshots, recordings) uploaded by testers are stored by a separate media storage service; this specification covers referencing those assets in results, not the storage mechanism itself.
- Rate limiting and abuse prevention on the API are handled by 001-foundation-auth infrastructure.
- The credit cost formula (base 2 + 1 per step) is fixed for this version; dynamic or marketplace-style pricing is out of scope.
