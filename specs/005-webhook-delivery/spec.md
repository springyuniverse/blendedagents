# Feature Specification: Webhook & Result Delivery

**Feature Branch**: `005-webhook-delivery`
**Created**: 2026-03-30
**Status**: Draft
**Input**: BlendedAgents PDR v2.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Builder Receives Structured Test Results via Webhook (Priority: P1)

A builder (typically an AI coding agent or CI pipeline) submits a test case and needs to receive structured results automatically when a human tester completes it. The builder should not need to poll for results. Instead, when a tester submits their verdict, the system delivers a signed webhook payload containing the full test outcome -- verdict, per-step results, evidence links, environment details, and credits charged. This is the core value loop of BlendedAgents: a human tests, and a machine receives.

**Why this priority**: Without reliable result delivery, the entire pipeline breaks. Builders cannot act on test outcomes if they never receive them. This is the critical path that closes the human-in-the-loop feedback cycle.

**Independent Test**: Can be fully tested by completing a test case (via 004-tester-dashboard) and verifying that the builder's registered endpoint receives a correctly structured, signed payload within the expected timeframe.

**Acceptance Scenarios**:

1. **Given** a builder has registered a webhook URL and a tester has been assigned a test case, **When** the tester submits their completed results, **Then** the system MUST deliver a webhook payload to the builder's URL within 60 seconds containing the event type, test case identifier, external identifier, template identifier, verdict, summary, step counts (passed, failed, blocked, total), per-step detail array, recording URL, environment metadata, credits charged, result URL, and timestamp.

2. **Given** a webhook delivery attempt receives a non-2xx response from the builder's endpoint, **When** the first attempt fails, **Then** the system MUST retry delivery up to 3 additional times at intervals of 1 minute, 5 minutes, and 30 minutes.

3. **Given** a builder has configured a webhook secret, **When** a webhook is delivered, **Then** the payload MUST be signed using HMAC-SHA256 and the signature MUST be included in the `X-BlendedAgents-Signature` request header so the builder can verify authenticity.

4. **Given** a webhook has exhausted all retry attempts without a successful delivery, **When** the final retry fails, **Then** the system MUST record the delivery as permanently failed and the result MUST remain retrievable via the result URL.

5. **Given** a tester marks individual steps as passed, failed, or blocked with severity ratings and evidence, **When** the webhook payload is assembled, **Then** each step in the per-step array MUST include the step index, title, status, severity, actual behavior observed, screenshot URL (if provided), and tester notes.

---

### User Story 2 - Builder Configures and Verifies Webhook Endpoint (Priority: P2)

A builder needs to set up and validate their webhook endpoint before relying on it for production test results. They must be able to register a URL and secret, send a test ping to confirm their endpoint is reachable and correctly verifying signatures, and review recent delivery history to diagnose issues.

**Why this priority**: Builders must be able to self-serve webhook configuration and troubleshoot delivery problems without contacting support. This enables onboarding and operational confidence but is secondary to actual result delivery.

**Independent Test**: Can be fully tested by configuring a webhook URL, sending a test ping, verifying it arrives, and then listing delivery history -- all without requiring a real completed test case.

**Acceptance Scenarios**:

1. **Given** an authenticated builder, **When** they submit a webhook URL and secret via the configuration endpoint, **Then** the system MUST store the configuration and use it for all future webhook deliveries for that builder's test cases.

2. **Given** an authenticated builder with a configured webhook, **When** they request a test webhook delivery, **Then** the system MUST send a synthetic test payload to their registered URL, signed with their secret, so they can verify their endpoint handles it correctly.

3. **Given** an authenticated builder, **When** they request their recent delivery history, **Then** the system MUST return a list of recent webhook delivery attempts including the test case identifier, target URL, HTTP status code received, response body, attempt number, delivery timestamp, and next scheduled retry time (if applicable).

4. **Given** an authenticated builder, **When** they update their webhook URL or secret, **Then** the system MUST apply the new configuration to all subsequent deliveries, including any pending retries for in-flight test cases.

---

### User Story 3 - Machine Summary Generation for AI Consumption (Priority: P2)

When a tester submits their results, the system must auto-generate a structured machine-readable summary optimized for AI agent consumption. This summary distills the raw step-by-step results into a compact, decision-ready format that an AI coding agent can parse and act on immediately -- determining what failed, how severely, and what evidence exists.

**Why this priority**: The machine summary is the primary interface between BlendedAgents and AI coding tools. Without it, AI agents must parse verbose per-step data themselves, which is error-prone and wastes tokens. This is equal priority to webhook configuration because it determines the quality of the AI feedback loop.

**Independent Test**: Can be tested by submitting a set of step results (via 004-tester-dashboard) and verifying the generated machine summary contains the correct verdict, confidence score, step classifications, and evidence references.

**Acceptance Scenarios**:

1. **Given** a tester has submitted results for all steps in a test case, **When** the submission is finalized, **Then** the system MUST auto-generate a machine summary containing: overall verdict, confidence score, list of passed step indices, list of failed steps (each with severity, actual behavior observed, and evidence references), list of blocked step indices, environment details, recording URL, and total execution time in minutes.

2. **Given** a test case with a mix of passed, failed, and blocked steps, **When** the machine summary is generated, **Then** the confidence score MUST reflect the proportion and severity of failures (a single critical failure MUST produce a lower confidence score than multiple minor failures).

3. **Given** the machine summary has been generated, **When** the webhook payload is assembled, **Then** the machine summary MUST be included as a distinct field within the webhook payload so AI agents can consume it directly without parsing per-step data.

---

### Edge Cases

- What happens when a builder's webhook URL becomes permanently unreachable (e.g., domain expires)? The system MUST exhaust retries, mark the delivery as failed, and preserve the result for retrieval via the result URL. Builders MUST be able to see failed deliveries in their delivery history.
- What happens when a builder changes their webhook URL while retries for a previous test case are still pending? Pending retries MUST use the updated URL.
- What happens when a builder has not configured any webhook URL? The system MUST still generate the machine summary and make results available via the result URL, but MUST NOT attempt delivery.
- What happens when the builder's endpoint returns a 2xx status but with an error in the response body? The system MUST treat any 2xx response as a successful delivery.
- What happens when a test case has zero failed steps but the tester marked the overall verdict as "fail"? The machine summary MUST reflect the tester's verdict, and the confidence score MUST account for the contradiction.
- What happens when screenshot or recording uploads are still processing at the time of webhook dispatch? The system MUST either wait for media processing to complete before dispatching or include placeholder URLs that resolve once processing finishes.
- What happens when the webhook payload exceeds the builder's endpoint size limits? The system MUST document the maximum expected payload size so builders can plan accordingly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST deliver a webhook to the builder's registered URL whenever a test case reaches the "completed" state.
- **FR-002**: The webhook payload MUST include: event type, test case identifier, external identifier, template identifier, verdict, human-written summary, step counts (passed, failed, blocked, total), per-step detail array, recording URL, environment metadata (browser, operating system, viewport), credits charged, result URL, and timestamp.
- **FR-003**: Each entry in the per-step detail array MUST include: step index, title, status, severity, actual behavior observed, screenshot URL, and tester notes.
- **FR-004**: The system MUST sign every webhook payload using HMAC-SHA256 with the builder's configured secret and include the signature in the `X-BlendedAgents-Signature` HTTP header.
- **FR-005**: The system MUST retry failed webhook deliveries (non-2xx responses or network failures) up to 3 times, at intervals of 1 minute, 5 minutes, and 30 minutes after the initial attempt.
- **FR-006**: The system MUST record every webhook delivery attempt, including: test case identifier, builder identifier, target URL, payload sent, HTTP status code received, response body, attempt number, delivery timestamp, and next scheduled retry time.
- **FR-007**: The system MUST provide an endpoint for builders to set or update their webhook URL and secret.
- **FR-008**: The system MUST provide an endpoint for builders to trigger a test webhook delivery to verify their endpoint configuration.
- **FR-009**: The system MUST provide an endpoint for builders to list their recent webhook delivery attempts with status and diagnostic details.
- **FR-010**: The system MUST auto-generate a machine summary when a tester submits completed results, containing: verdict, confidence score, passed step indices, failed steps with severity and actual behavior and evidence references, blocked step indices, environment details, recording URL, and execution duration in minutes.
- **FR-011**: The machine summary MUST be included as a distinct field in the webhook payload.
- **FR-012**: The machine summary confidence score MUST reflect both the quantity and severity of failures.
- **FR-013**: Results MUST remain accessible via the result URL regardless of webhook delivery success or failure.
- **FR-014**: All webhook management endpoints MUST require builder authentication (per 001-foundation-auth).

### Key Entities

- **Webhook Configuration**: A builder's registered delivery endpoint and signing secret. One configuration per builder. Used to determine where and how to deliver results.
- **Webhook Delivery**: A record of a single delivery attempt for a specific test case to a specific builder. Tracks the target URL, payload, HTTP response, attempt number, timing, and retry schedule. Multiple deliveries may exist per test case (one per attempt).
- **Machine Summary**: An auto-generated, AI-optimized digest of a completed test case's results. Derived from per-step outcomes at submission time. Contains the verdict, confidence score, step classifications, evidence references, and execution metadata. One summary per completed test case.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99% of webhook deliveries for completed test cases MUST arrive at the builder's endpoint within 60 seconds of tester submission (when the endpoint is reachable on the first attempt).
- **SC-002**: 100% of webhook payloads MUST pass HMAC-SHA256 signature verification when checked against the builder's stored secret.
- **SC-003**: 100% of failed initial delivery attempts MUST trigger the retry sequence (1 min, 5 min, 30 min) with no deliveries silently dropped.
- **SC-004**: Builders MUST be able to configure a webhook URL, send a test ping, and confirm receipt in under 5 minutes during onboarding.
- **SC-005**: 100% of completed test cases MUST have a machine summary generated within 30 seconds of tester submission.
- **SC-006**: The machine summary MUST be parseable by an AI agent without additional transformation -- an agent receiving the webhook MUST be able to determine the verdict, identify all failed steps with severity, and locate evidence without inspecting the per-step array.
- **SC-007**: 100% of delivery attempts (successful and failed) MUST appear in the builder's delivery history within 1 minute of the attempt.

## Assumptions

- Builders have a publicly reachable HTTPS endpoint capable of receiving POST requests and responding with a 2xx status code.
- The authentication and authorization system from 001-foundation-auth is operational and provides builder identity for all API calls.
- The test case data model from 002-test-case-api is in place, including per-step structure with status, severity, and evidence fields.
- The tester submission flow from 004-tester-dashboard triggers the "test case completed" event that initiates webhook dispatch and machine summary generation.
- Webhook payloads are delivered as JSON over HTTPS.
- The retry schedule (1 min, 5 min, 30 min) is fixed for the initial release; configurable retry policies are out of scope.
- Media assets (screenshots, recordings) referenced in the payload are hosted and accessible via their URLs at the time of delivery, or within a reasonable processing window.
- The machine summary confidence score algorithm will be refined over time; the initial implementation uses a deterministic formula based on step outcomes and severities.
- Rate limiting of webhook deliveries to a single builder endpoint is out of scope for the initial release.
