# Feature Specification: MCP Server

**Feature Branch**: `003-mcp-server`
**Created**: 2026-03-30
**Status**: Draft
**Input**: BlendedAgents PDR v2.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Tool Submits a Test and Retrieves Results via MCP (Priority: P1)

A builder's AI tool (Claude, Cursor, Copilot) needs to submit a test case to a human tester and retrieve structured results -- all without leaving the AI workflow. The AI calls `create_test` with steps, a staging URL, and credentials. The platform assigns the test to a human tester who executes it. The AI then calls `get_status` to monitor progress and `get_result` to retrieve structured, step-level pass/fail results. The AI uses these results to auto-fix issues or surface them to the builder.

**Why this priority**: This is the core value proposition of BlendedAgents. Without the ability to submit tests and retrieve results, the MCP server has no purpose. This single flow delivers the full human-in-the-loop testing cycle.

**Independent Test**: Can be fully tested by having an AI tool create a test case via MCP, waiting for a tester to complete it, and retrieving results. Delivers immediate value as a standalone integration.

**Acceptance Scenarios**:

1. **Given** a valid API key is configured in the MCP server, **When** an AI tool calls `create_test` with test steps, a staging URL, and credentials, **Then** the system creates a test case and returns a test case identifier and confirmation status.
2. **Given** a test case has been created, **When** an AI tool calls `get_status` with the test case identifier, **Then** the system returns the current status of the test case (e.g., queued, assigned, in-progress, completed, cancelled).
3. **Given** a test case has been completed by a human tester, **When** an AI tool calls `get_result` with the test case identifier, **Then** the system returns structured JSON containing step-level results (pass/fail per step, tester notes, screenshots if applicable).
4. **Given** a test case is still in progress, **When** an AI tool calls `get_result`, **Then** the system returns an appropriate status indicating results are not yet available.
5. **Given** an invalid or missing API key, **When** an AI tool calls any MCP tool, **Then** the system returns a clear authentication error in structured JSON.

---

### User Story 2 - AI Tool Manages Templates via MCP (Priority: P2)

A builder's AI tool frequently runs the same types of tests (e.g., checkout flow, login flow). Instead of specifying full test steps each time, the AI calls `create_template` to save a reusable test definition. On subsequent runs, it calls `create_test_from_template` with the template identifier and any overrides (e.g., different staging URL or credentials). The AI can also call `list_templates` to discover available templates.

**Why this priority**: Templates reduce repetition and errors in test creation. However, the core submit-and-retrieve flow (P1) must work first. Templates build on top of that foundation to improve efficiency for repeated testing scenarios.

**Independent Test**: Can be tested by creating a template via MCP, listing templates to confirm it exists, and then creating a test case from that template with overrides. Delivers value as a productivity improvement for repeated test patterns.

**Acceptance Scenarios**:

1. **Given** a valid API key, **When** an AI tool calls `create_template` with a name, description, and test steps, **Then** the system saves the template and returns a template identifier.
2. **Given** one or more templates exist, **When** an AI tool calls `list_templates`, **Then** the system returns a list of available templates with their identifiers, names, and descriptions.
3. **Given** a saved template exists, **When** an AI tool calls `create_test_from_template` with the template identifier and override values (e.g., a different staging URL), **Then** the system creates a new test case using the template steps with the overrides applied, and returns the new test case identifier.
4. **Given** a saved template exists, **When** an AI tool calls `create_test_from_template` with no overrides, **Then** the system creates a new test case using the template steps exactly as saved.
5. **Given** an invalid template identifier, **When** an AI tool calls `create_test_from_template`, **Then** the system returns a clear error indicating the template was not found.

---

### User Story 3 - AI Tool Monitors Credits and Manages Test Lifecycle via MCP (Priority: P3)

A builder's AI tool needs to manage its testing budget and active test cases. Before submitting a test, the AI calls `get_credits` to check the remaining credit balance. It can call `list_tests` with status or date filters to review past and active tests. If a test is no longer needed, the AI calls `cancel_test` to cancel a queued or assigned test before a tester begins work.

**Why this priority**: Credit monitoring and lifecycle management are operational necessities but not part of the core testing loop. A builder can use BlendedAgents without these features initially, but they become important as usage scales and cost management matters.

**Independent Test**: Can be tested by checking the credit balance, listing tests with various filters, and cancelling a queued test. Delivers value as an operational management layer for AI-driven testing workflows.

**Acceptance Scenarios**:

1. **Given** a valid API key, **When** an AI tool calls `get_credits`, **Then** the system returns the current remaining credit balance in structured JSON.
2. **Given** multiple test cases exist, **When** an AI tool calls `list_tests` with a status filter (e.g., "completed"), **Then** the system returns only test cases matching that status.
3. **Given** multiple test cases exist, **When** an AI tool calls `list_tests` with a date filter, **Then** the system returns only test cases within the specified date range.
4. **Given** a test case is in "queued" status, **When** an AI tool calls `cancel_test` with the test case identifier, **Then** the system cancels the test and returns confirmation.
5. **Given** a test case is in "assigned" status but not yet started, **When** an AI tool calls `cancel_test`, **Then** the system cancels the test and returns confirmation.
6. **Given** a test case is already "in-progress" or "completed", **When** an AI tool calls `cancel_test`, **Then** the system returns an error indicating the test cannot be cancelled in its current state.

---

### Edge Cases

- What happens when an AI tool submits a test case with no steps or empty steps? The system MUST reject it with a clear validation error.
- What happens when an AI tool calls `get_result` for a test case that belongs to a different account? The system MUST return an authorization error, never leaking another account's data.
- What happens when an AI tool calls `create_test_from_template` with overrides that conflict with required template fields? The system MUST return a clear validation error describing the conflict.
- What happens when the credit balance is zero and an AI tool calls `create_test`? The system MUST reject the test creation with a clear insufficient-credits error.
- What happens when an AI tool sends a malformed request (e.g., missing required fields)? The system MUST return structured JSON error responses that AI tools can parse and act on programmatically.
- What happens when the underlying REST API is temporarily unavailable? The MCP server MUST return a structured error indicating a service disruption rather than failing silently or returning unstructured output.
- What happens when an AI tool calls `cancel_test` on an already-cancelled test? The system MUST handle this gracefully, either as a no-op confirmation or a clear "already cancelled" response.
- What happens when `list_tests` is called with no filters? The system MUST return a reasonable default set of results (e.g., most recent tests) rather than an unbounded result set.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The MCP server MUST expose the following tools: `create_test`, `create_test_from_template`, `get_status`, `get_result`, `list_tests`, `cancel_test`, `list_templates`, `create_template`, and `get_credits`.
- **FR-002**: The MCP server MUST authenticate every tool call using the same API key mechanism as the REST API (feature 001-foundation-auth), with the key passed through MCP server configuration.
- **FR-003**: All MCP tool responses MUST return machine-readable structured JSON designed for AI consumption, not human-readable prose.
- **FR-004**: The MCP server MUST wrap the REST API (feature 002-test-case-api) -- it MUST NOT implement its own business logic or data access. It is an AI-friendly interface layer over the existing API.
- **FR-005**: The `create_test` tool MUST accept test steps, a staging URL, and credentials as input, and MUST return a test case identifier upon successful creation.
- **FR-006**: The `create_test_from_template` tool MUST accept a template identifier and optional overrides, and MUST create a test case using the referenced template with overrides applied.
- **FR-007**: The `get_status` tool MUST return the current lifecycle status of a given test case.
- **FR-008**: The `get_result` tool MUST return structured step-level results for a completed test case, including pass/fail per step and tester observations.
- **FR-009**: The `list_tests` tool MUST support filtering by status and date range.
- **FR-010**: The `cancel_test` tool MUST cancel a test case that is in "queued" or "assigned" status, and MUST reject cancellation of tests that are "in-progress" or "completed".
- **FR-011**: The `list_templates` tool MUST return available templates for the authenticated account.
- **FR-012**: The `create_template` tool MUST save a reusable test definition with a name, description, and test steps.
- **FR-013**: The `get_credits` tool MUST return the current remaining credit balance for the authenticated account.
- **FR-014**: All error responses MUST be structured JSON with a consistent format, including an error type and a human-readable message, so that AI tools can handle errors programmatically.
- **FR-015**: The MCP server MUST validate all inputs before forwarding requests to the REST API and MUST return clear validation errors for malformed requests.
- **FR-016**: The MCP server MUST be compatible with the Model Context Protocol specification so that any MCP-compliant AI tool can integrate without custom adapters.

### Key Entities

- **MCP Tool**: A callable function exposed by the MCP server that AI tools invoke. Each tool has a defined name, input schema, and output schema. Maps one-to-one with a REST API operation.
- **MCP Server Configuration**: The connection and authentication settings an AI tool uses to connect to the MCP server, including the API key. Configured once per AI tool integration.
- **Tool Response**: The structured JSON object returned by every MCP tool call. Contains either a successful result payload or a structured error payload. Designed for machine parsing, not human reading.
- **Template**: A saved, reusable test case definition containing a name, description, and predefined test steps. Belongs to an account and can be used to create test cases with optional overrides.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An AI tool can create a test case, monitor its status, and retrieve structured results in a single automated workflow with no human intervention on the AI side.
- **SC-002**: All nine MCP tools return structured JSON responses that can be parsed programmatically without error by a consuming AI tool.
- **SC-003**: Authentication failures return a clear, structured error within the MCP tool response -- never an unstructured exception or silent failure.
- **SC-004**: A test case created via `create_test_from_template` with overrides produces results identical to a test case created via `create_test` with the same effective steps and configuration.
- **SC-005**: The `list_tests` tool correctly filters results by status and date range, returning only matching test cases.
- **SC-006**: The `cancel_test` tool successfully cancels tests in "queued" or "assigned" status and rejects cancellation attempts on tests in other states, with clear error messages.
- **SC-007**: The end-to-end latency added by the MCP server layer (above and beyond the underlying REST API call) is negligible and does not materially impact AI tool workflows.
- **SC-008**: Any MCP-compliant AI tool (Claude, Cursor, Copilot, or others) can integrate with the MCP server using only the standard MCP protocol -- no custom client code required.

## Assumptions

- The REST API (feature 002-test-case-api) is implemented and operational before MCP server development begins.
- Authentication and API key management (feature 001-foundation-auth) is implemented and operational before MCP server development begins.
- AI tools integrating with the MCP server have an MCP-compliant client available in their environment.
- The MCP server is a stateless layer -- all state is owned by the REST API and its underlying data store.
- Credit balance enforcement (rejecting test creation when balance is zero) is handled by the REST API, not the MCP server. The MCP server surfaces the API's response.
- The MCP server does not need to handle streaming or long-polling for test results in the initial version. AI tools will poll `get_status` and `get_result` as needed.
- Template management (create, list) is scoped to the authenticated account. There are no shared or public templates in the initial version.
