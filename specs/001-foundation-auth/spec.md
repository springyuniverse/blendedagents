# Feature Specification: Foundation & Auth

**Feature Branch**: `001-foundation-auth`
**Created**: 2026-03-30
**Status**: Draft
**Input**: BlendedAgents PDR v2.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database Schema & Project Scaffolding (Priority: P1)

As a platform operator, I need the core data model and project structure in place so that every subsequent feature has a stable foundation to build on. This includes all tables, relationships, constraints, and security policies that govern how data flows through the system.

**Why this priority**: Nothing else can be built without the data layer. Authentication, test submission, assignment, results -- every feature reads from or writes to these tables. This is the absolute prerequisite for the entire platform.

**Independent Test**: Can be fully tested by verifying that all tables exist with correct columns, constraints, and relationships, and that row-level security policies prevent unauthorized cross-tenant data access.

**Acceptance Scenarios**:

1. **Given** the database has been initialized, **When** I inspect the schema, **Then** all core entities (builders, testers, test_cases, step_results, test_results, test_templates, transactions, webhook_deliveries) exist with UUID primary keys and timestamped audit columns.
2. **Given** row-level security is enabled on all tables, **When** an authenticated builder queries the database, **Then** they can only access records that belong to them.
3. **Given** the schema defines enumerated types for status fields, **When** a record is inserted with an invalid enum value, **Then** the database rejects the insert with a constraint violation.
4. **Given** the project structure has been scaffolded, **When** the application starts, **Then** it connects to the database and serves requests successfully.

---

### User Story 2 - Builder API Key Authentication (Priority: P2)

As a builder (an AI tool developer integrating with BlendedAgents), I need to authenticate my API requests using an API key so that only authorized builders can submit test cases, retrieve results, and manage their account. My API key uniquely identifies me, enforces rate limits, and scopes all data access to my account.

**Why this priority**: Builders are the paying customers who submit test work. Without builder authentication, no API endpoint can be secured, no request can be attributed to a specific account, and no usage-based billing is possible.

**Independent Test**: Can be fully tested by issuing API requests with valid and invalid API keys and verifying that authenticated requests succeed, unauthenticated requests are rejected, and rate limits are enforced.

**Acceptance Scenarios**:

1. **Given** a builder has a valid API key, **When** they send a request with the key in the Authorization header, **Then** the system authenticates the request and returns the expected response.
2. **Given** a request is sent without an API key or with an invalid key, **When** the system receives the request, **Then** it responds with an authentication error and a structured error object containing an error code and message.
3. **Given** a builder exceeds 100 requests per minute, **When** they send an additional request, **Then** the system responds with a rate-limit error and includes retry timing information.
4. **Given** a request originates from an unknown origin, **When** the system evaluates CORS policy, **Then** the request is rejected with an appropriate error.

---

### User Story 3 - Tester Session Authentication (Priority: P3)

As a tester (a human who performs manual testing work), I need to sign in using social login so that I can access my dashboard, view assigned tasks, and submit test results. My session keeps me authenticated across page visits without re-entering credentials.

**Why this priority**: Testers are the supply side of the platform. They need a frictionless login experience (social auth, no password management) to access their work queue. This depends on the data layer (P1) being in place and is less urgent than builder auth (P2) because builders drive initial platform adoption.

**Independent Test**: Can be fully tested by completing a social login flow and verifying that the tester receives a valid session, can access their own data, and cannot access other testers' data.

**Acceptance Scenarios**:

1. **Given** a vetted tester visits the platform, **When** they authenticate via social login, **Then** they receive a session token and are redirected to their dashboard.
2. **Given** a tester has an active session, **When** they make subsequent requests, **Then** the system recognizes their identity without requiring re-authentication.
3. **Given** a tester's session has expired, **When** they attempt to access a protected page, **Then** they are redirected to the login screen with a clear message.
4. **Given** an authenticated tester, **When** they request data, **Then** they can only see their own profile, assigned tasks, and earnings -- never another tester's data.

---

### Edge Cases

- What happens when an API key is revoked while a builder has active in-flight requests?
- How does the system behave when a tester's social login provider is temporarily unavailable?
- What happens if two requests arrive simultaneously with the same API key and the rate limit counter is at 99/100?
- How does the system handle a builder whose credits_balance reaches zero mid-session?
- What happens when a tester attempts to authenticate but has been deactivated (is_active = false)?
- How does the system respond to malformed or tampered session tokens?
- What happens if the database connection is lost during an authentication check?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use universally unique identifiers as primary keys for all entities to ensure global uniqueness and safe cross-system references.
- **FR-002**: System MUST record created_at and updated_at timestamps (with timezone) on every record automatically.
- **FR-003**: System MUST enforce type-safe enumerated values for all status and category fields: task status (queued, assigned, in_progress, submitted, completed, expired, cancelled), step status (pending, passed, failed, blocked, skipped), severity (critical, major, minor, suggestion), verdict (pass, fail, partial, blocked), and transaction type (topup, charge, payout, commission, refund).
- **FR-004**: System MUST enforce row-level security on all tables so that authenticated users can only access data they are authorized to see.
- **FR-005**: System MUST authenticate builders via API keys transmitted in the Authorization header using the Bearer scheme with a recognizable prefix (ba_sk_...).
- **FR-006**: System MUST reject any API request that lacks a valid API key with a structured error response containing an error code and human-readable message.
- **FR-007**: System MUST enforce a rate limit of 100 requests per minute per API key and return structured rate-limit errors with retry information when exceeded.
- **FR-008**: System MUST restrict cross-origin requests to a predefined allowlist of known origins.
- **FR-009**: System MUST authenticate testers via session-based authentication supporting social login providers.
- **FR-010**: System MUST store builder records including: display name, email, API key, webhook URL, webhook secret, credits balance, plan tier (starter, pro, team), and extensible metadata.
- **FR-011**: System MUST store tester records including: display name, email, avatar URL, skills list, languages list, region, active status, availability status, current task reference, task counts (total, completed), average completion time in minutes, earnings in cents, and timezone.
- **FR-012**: System MUST store test case records that reference a builder and optionally a test template, and support structured step definitions.
- **FR-013**: System MUST store step-level results with per-step pass/fail status, severity, and evidence references.
- **FR-014**: System MUST store aggregate test results with a verdict (pass, fail, partial, blocked) linked to the originating test case.
- **FR-015**: System MUST store transaction records tracking all credit movements (topup, charge, payout, commission, refund) with amounts in cents and references to the related entities.
- **FR-016**: System MUST store webhook delivery records for auditability, including payload, response status, and retry count.
- **FR-017**: System MUST return all errors as structured objects containing at minimum an error code, a message, and contextual details -- never unstructured strings.

### Key Entities

- **Builder**: A company or developer who integrates with BlendedAgents to submit test work. Identified by API key. Holds a credit balance and belongs to a plan tier. Owns test cases and receives results via webhooks.
- **Tester**: A vetted human who performs manual testing tasks. Has a skill and language profile used for algorithmic task matching. Tracks availability, workload, performance metrics, and earnings.
- **Test Case**: A structured description of what needs to be tested, submitted by a builder. Contains ordered steps, optional credentials, and references a test template if one was used.
- **Test Template**: A reusable blueprint for common test scenarios. Builders can create test cases from templates to ensure consistency.
- **Step Result**: The outcome of a single step within a test case, recorded by the assigned tester. Includes pass/fail status, severity of any issues found, and evidence (screenshots, notes).
- **Test Result**: The aggregate outcome of an entire test case. Carries a verdict and rolls up all step results into a single deliverable for the builder.
- **Transaction**: A financial ledger entry tracking every credit movement on the platform -- top-ups by builders, charges for test work, payouts to testers, platform commissions, and refunds.
- **Webhook Delivery**: An audit record of every webhook sent to a builder's endpoint. Tracks delivery status, response codes, and retry attempts for reliability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All eight core entities can be created, read, updated, and queried, with referential integrity enforced -- zero orphaned records after 1,000 randomized operations.
- **SC-002**: Row-level security prevents 100% of cross-tenant data access attempts in automated security tests.
- **SC-003**: Invalid enum values are rejected at the data layer with a constraint error in 100% of test cases.
- **SC-004**: Authenticated builder requests with a valid API key succeed with correct response data in under 200ms (p95) for simple queries.
- **SC-005**: Requests with missing, invalid, or revoked API keys are rejected with a structured error response in 100% of test cases.
- **SC-006**: Rate limiting activates correctly when a builder exceeds 100 requests per minute, and the 101st request receives a rate-limit error with retry information.
- **SC-007**: Tester social login flow completes end-to-end, resulting in a valid session, in under 5 seconds (excluding external provider latency).
- **SC-008**: Authenticated testers can access only their own data -- cross-tester data access is blocked in 100% of automated security tests.
- **SC-009**: The application starts and passes a health check (database connectivity, auth system readiness) within 10 seconds of launch.
- **SC-010**: All error responses conform to the structured error format (error code + message + context) -- zero unstructured error strings in the entire API surface.

## Assumptions

- Builders are pre-provisioned during this phase; self-service builder registration is out of scope and will be addressed in a later feature.
- Testers are onboarded through a vetting process managed outside the platform; this feature only covers authentication for already-vetted testers.
- A single relational database instance is sufficient for the initial launch; sharding and read replicas are not required yet.
- Credit balances are tracked in cents (integers) to avoid floating-point currency issues.
- The social login providers available to testers will be determined during implementation, but the spec requires at least one provider at launch.
- Webhook delivery retry logic and queue infrastructure are out of scope for this feature; this feature only defines the webhook_deliveries table for future use.
- Rate limit state may be stored in memory for the initial implementation; durable distributed rate limiting is not required until horizontal scaling is needed.
- The API key prefix (ba_sk_) is a convention for human readability and quick identification; it does not carry security semantics.
