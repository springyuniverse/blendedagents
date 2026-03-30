<!--
SYNC IMPACT REPORT
==================
Version change: N/A -> 1.0.0 (initial ratification)
Modified principles: N/A (initial)
Added sections:
  - Core Principles (5): Contract-First, Test-First, Structured I/O,
    Managed Quality, Simplicity
  - Integration Standards
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md — OK (no changes needed,
    Constitution Check section is dynamic)
  - .specify/templates/spec-template.md — OK (no changes needed,
    acceptance scenarios align with structured test output)
  - .specify/templates/tasks-template.md — OK (no changes needed,
    test-first ordering preserved)
Follow-up TODOs: None
==================
-->

# BlendedAgents Constitution

## Core Principles

### I. Contract-First

Every integration point — MCP tools, SDK methods, webhooks,
tester-facing forms — MUST be defined as a versioned contract
before implementation begins. Contracts specify request shape,
response shape, error codes, and example payloads. No endpoint
or tool call may ship without a corresponding contract document.

**Rationale**: BlendedAgents sits between AI clients and human
testers. Both sides depend on stable, predictable interfaces.
Breaking a contract silently breaks the entire pipeline.

### II. Test-First (NON-NEGOTIABLE)

TDD is mandatory for all production code. The cycle is:
1. Write failing tests that encode the expected behavior.
2. Confirm tests fail (red).
3. Implement the minimum code to pass (green).
4. Refactor without changing behavior.

No pull request may be merged without passing tests that were
written before the implementation they validate. Integration
tests MUST hit real services (database, queue, webhook receiver)
— mocks are permitted only for third-party APIs outside our
control.

**Rationale**: BlendedAgents delivers machine-readable test
results to AI consumers. If our own code is not rigorously
tested, we cannot credibly promise structured quality to others.

### III. Structured I/O

Every external-facing interface MUST accept and return
machine-readable structured data (JSON). Human-readable
formats (HTML, plain text) are secondary presentation layers,
never the source of truth. Specifically:

- Test case submissions: JSON with steps, URLs, credentials.
- Test results: JSON with per-step pass/fail, severity,
  evidence links, timestamps.
- Webhooks and MCP tool responses: JSON with documented schema.
- Errors: structured error objects with code, message, and
  context — never unstructured strings.

**Rationale**: AI consumers parse results programmatically.
Ambiguous or unstructured output breaks the automation loop.

### IV. Managed Quality

BlendedAgents is a managed testing service, not a marketplace.
This principle governs all decisions about tester lifecycle:

- Testers are recruited, vetted, and trained by the platform.
- Assignment is algorithmic (availability + skill match), not
  auction-based.
- Pricing is predictable and platform-controlled.
- Tester output is validated against the structured schema
  before delivery to the builder.

No feature may introduce open bidding, tester self-signup
without vetting, or unstructured free-text results.

**Rationale**: Predictable quality and pricing are the core
differentiator. Marketplace dynamics erode both.

### V. Simplicity

Start with the simplest implementation that satisfies the
contract. Specifically:

- No abstraction layers until a pattern repeats three times.
- No feature flags or configuration toggles for speculative
  future requirements.
- No microservice extraction until a monolith boundary is
  proven to be a bottleneck.
- YAGNI: if the spec does not require it, do not build it.

**Rationale**: Speed of iteration is critical for a new
platform. Premature complexity slows delivery and obscures
bugs.

## Integration Standards

BlendedAgents operates at the boundary between AI development
tools and human testers. The following constraints apply to all
integration work:

- **MCP compliance**: MCP tool definitions MUST follow the
  Model Context Protocol specification. Tool names, parameter
  schemas, and return types MUST be documented and versioned.
- **SDK parity**: The SDK MUST expose the same capabilities as
  the MCP interface. No SDK-only or MCP-only features unless
  explicitly scoped in the spec.
- **Webhook reliability**: Webhook delivery MUST implement
  retry with exponential backoff. Payloads MUST be idempotent
  (include a unique event ID). Consumers MUST be able to
  deduplicate.
- **Credential handling**: Staging URLs and credentials
  provided in test cases MUST be encrypted at rest and never
  logged in plaintext. Testers receive credentials via a
  secure, time-limited mechanism.

## Development Workflow

- **Branching**: One feature branch per spec. Branch names
  follow the `###-feature-name` convention.
- **Commits**: Atomic commits scoped to a single task. Commit
  after each completed task or logical group.
- **Code review**: All PRs require at least one review.
  Reviewers MUST verify constitution compliance as part of
  the review checklist.
- **Definition of done**: A feature is done when all acceptance
  scenarios from the spec pass, integration tests are green,
  and the contract is published.

## Governance

This constitution is the highest-authority document for the
BlendedAgents project. It supersedes informal conventions,
ad-hoc decisions, and legacy patterns.

**Amendment procedure**:
1. Propose the change as a pull request modifying this file.
2. Document the rationale in the PR description.
3. At least one maintainer MUST approve.
4. Update the version following semantic versioning:
   - MAJOR: principle removed or redefined incompatibly.
   - MINOR: new principle or section added, material expansion.
   - PATCH: wording clarifications, typo fixes.
5. Run the `/speckit.constitution` command to propagate changes
   across dependent templates.

**Compliance review**: Every PR and code review MUST verify
that the change does not violate any principle. The plan
template's "Constitution Check" gate enforces this at the
design phase.

**Version**: 1.0.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-03-30
