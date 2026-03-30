# Feature Specification: Tester Dashboard

**Feature Branch**: `004-tester-dashboard`
**Created**: 2026-03-30
**Status**: Draft
**Input**: BlendedAgents PDR v2.0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tester Executes a Test Case Step-by-Step with Evidence (Priority: P1)

A tester receives a test assignment, reviews the test header (title, anonymized builder name, staging URL, environment requirements), clicks "Start Test" to reveal credentials and begin screen recording, then works through each step in order. For each step, the tester marks it passed with an optional screenshot, marks it failed with a required severity rating, description of actual behavior, and mandatory screenshot, marks it blocked, or skips it with a reason. After completing all steps, the tester writes a 1-3 sentence summary, selects a verdict, and submits the completed test. Screen recording stops on submission.

**Why this priority**: This is the core value proposition of the platform. Without step-by-step test execution and evidence capture, there is no testing service. Every other feature depends on testers being able to complete this workflow reliably.

**Independent Test**: Can be fully tested by assigning a multi-step test case to a tester and verifying they can start, execute each step with varied outcomes (pass, fail, block, skip), attach evidence, and submit a final verdict. Delivers the primary value of structured human test execution.

**Acceptance Scenarios**:

1. **Given** a tester has an assigned task, **When** they open the task, **Then** they see the test title, anonymized builder name, staging URL, and environment requirements, but credentials are hidden until the test is started.
2. **Given** a tester is viewing an assigned task, **When** they click "Start Test", **Then** the credentials panel is revealed, screen recording begins, and the first step is highlighted as the current step.
3. **Given** a tester is on a pending step, **When** they mark the step as passed, **Then** the step is checked off, a timestamp is recorded, the next step becomes the current highlighted step, and the tester may optionally attach a screenshot.
4. **Given** a tester is on a pending step, **When** they mark the step as failed, **Then** they MUST select a severity level (critical, major, minor, or suggestion), describe the actual behavior observed, and attach a screenshot before the failure is recorded.
5. **Given** a previous step has been marked as failed, **When** the tester advances to the next step, **Then** subsequent dependent steps are automatically set to "Blocked" status, or the tester may manually mark a step as blocked with a reason (e.g., staging environment down, credentials invalid).
6. **Given** a tester is on a pending step that does not apply to the current environment, **When** they skip the step, **Then** they MUST provide a reason for skipping.
7. **Given** all steps have been addressed (passed, failed, blocked, or skipped), **When** the tester proceeds to completion, **Then** they MUST write an overall summary of 1-3 sentences, select a verdict, and submit the test.
8. **Given** a tester submits the completed test, **When** submission is confirmed, **Then** the screen recording stops and the full test result (all step outcomes, evidence, summary, and verdict) is persisted.

---

### User Story 2 - Tester Manages Profile and Availability (Priority: P2)

A tester views and edits their profile information, toggles their availability on or off to control whether new tasks are assigned to them, and reviews their earnings and payout history.

**Why this priority**: Testers need control over when they receive work and visibility into their compensation. This directly affects tester retention and platform trust, but the platform can function for initial testing without it.

**Independent Test**: Can be fully tested by having a tester log in, update their profile, toggle availability off (confirming no new tasks are assigned), toggle availability back on, and view earnings history. Delivers tester self-service and transparency.

**Acceptance Scenarios**:

1. **Given** an authenticated tester, **When** they navigate to their profile, **Then** they see their current profile information and can edit it.
2. **Given** an authenticated tester, **When** they toggle their availability to "unavailable", **Then** the system stops assigning new tasks to them, and their availability status is reflected immediately.
3. **Given** an authenticated tester, **When** they toggle their availability back to "available", **Then** they become eligible for new task assignments again.
4. **Given** an authenticated tester, **When** they navigate to earnings, **Then** they see a history of completed tasks with corresponding payouts and any pending earnings.

---

### User Story 3 - Screen Recording Capture During Test Execution (Priority: P3)

When a tester starts a test, a browser-based screen recording begins automatically. The recording uploads in chunks throughout execution so that progress is not lost if the session is interrupted. On test submission, the recording stops and the complete session is stored. Recordings are retained for 90 days and accessible via time-limited signed URLs.

**Why this priority**: Screen recordings provide crucial evidence for builders to understand tester behavior and reproduce issues. However, the step-by-step results and screenshots (P1) deliver the most critical evidence. Recording adds a richer evidence layer but is not strictly required for the minimum viable testing workflow.

**Independent Test**: Can be fully tested by starting a test, verifying the recording indicator is active, executing several steps with pauses, submitting the test, and then confirming the recording is viewable via a signed URL. Delivers full-session video evidence of test execution.

**Acceptance Scenarios**:

1. **Given** a tester clicks "Start Test", **When** the test begins, **Then** browser-based screen recording starts automatically and a visible indicator confirms recording is active.
2. **Given** a recording is in progress, **When** the tester is executing steps, **Then** the recording uploads in chunks during execution so that partial recordings survive session interruptions.
3. **Given** a tester submits the completed test, **When** the recording stops, **Then** the full recording is available for playback.
4. **Given** a completed recording exists, **When** an authorized user requests to view it, **Then** a time-limited signed URL is generated for secure playback.
5. **Given** a recording is older than 90 days, **When** the retention policy is applied, **Then** the recording is deleted and no longer accessible.

---

### Edge Cases

- What happens when a tester's browser crashes or loses connectivity mid-test? Partial results and recording chunks uploaded so far MUST be preserved. The tester MUST be able to resume the test from where they left off.
- What happens when a tester attempts to submit a test with steps still in "Pending" status? The system MUST prevent submission until every step has an outcome (passed, failed, blocked, or skipped).
- What happens when the staging URL provided in the test becomes unreachable during execution? The tester MUST be able to mark remaining steps as "Blocked" with the reason and submit the test with a summary reflecting the environment issue.
- What happens when a tester attempts to mark a step as failed without providing a screenshot or severity? The system MUST enforce that all required failure evidence is attached before the failure is recorded.
- What happens when screen recording permission is denied by the browser? The system MUST notify the tester that recording is required and prevent test start until permission is granted.
- What happens when a tester is assigned a task but their availability is toggled off before they start? Already-assigned tasks MUST remain assigned. Only new task assignment is affected by availability status.
- What happens when two testers attempt to start the same task simultaneously? The system MUST ensure a task is locked to a single tester once started, and the second tester receives a clear notification that the task is no longer available.
- What happens when a recording chunk fails to upload? The system MUST retry the upload and queue chunks locally until connectivity is restored, without interrupting the tester's workflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a task list showing assigned and available tasks for the authenticated tester.
- **FR-002**: The system MUST display test header information (title, anonymized builder name, staging URL, environment requirements) when a tester opens a task.
- **FR-003**: The system MUST hide test credentials until the tester explicitly clicks "Start Test".
- **FR-004**: The system MUST begin screen recording when the tester clicks "Start Test" and stop recording when the test is submitted.
- **FR-005**: The system MUST present test steps as an ordered checklist with the current step visually highlighted.
- **FR-006**: The system MUST support four step outcomes: Passed, Failed, Blocked, and Skipped.
- **FR-007**: The system MUST record a timestamp for each step outcome.
- **FR-008**: When a step is marked as Failed, the system MUST require the tester to select a severity (critical, major, minor, or suggestion), describe the actual behavior, and attach a screenshot.
- **FR-009**: When a step is marked as Skipped, the system MUST require the tester to provide a reason.
- **FR-010**: The system MUST allow steps to be marked as Blocked either automatically (when a prior step fails) or manually with a reason.
- **FR-011**: The system MUST require the tester to write a summary of 1-3 sentences and select a verdict before submitting a completed test.
- **FR-012**: The system MUST prevent test submission until every step has a recorded outcome.
- **FR-013**: The system MUST upload screen recording in chunks during test execution to protect against session loss.
- **FR-014**: The system MUST retain screen recordings for 90 days, after which they are deleted.
- **FR-015**: The system MUST provide access to recordings via time-limited signed URLs.
- **FR-016**: The system MUST allow testers to upload screenshots as evidence for individual steps.
- **FR-017**: The system MUST allow testers to view and edit their profile.
- **FR-018**: The system MUST allow testers to toggle their availability, controlling whether new tasks are assigned to them.
- **FR-019**: The system MUST provide testers with visibility into their earnings and payout history.
- **FR-020**: The dashboard MUST be mobile-responsive and function as a progressive web application (installable, offline-aware).
- **FR-021**: The system MUST preserve partial test progress and uploaded recording chunks if the tester's session is interrupted, and allow the tester to resume.
- **FR-022**: The system MUST lock a task to a single tester once execution begins, preventing concurrent execution by another tester.
- **FR-023**: The system MUST anonymize the builder's identity from the tester's view to prevent bias.

### Key Entities

- **Tester Task**: A test case assigned to or claimed by a tester for execution. Contains reference to the originating test case, the assigned tester, execution status (not started, in progress, submitted), and timing information.
- **Step Result**: The outcome of a single test step within a task. Contains the step index, outcome (passed, failed, blocked, skipped), timestamp, optional screenshot reference, and for failures: severity and actual behavior description. For blocked and skipped: the reason.
- **Test Submission**: The completed result of a tester's execution of a task. Contains all step results, the tester's summary, verdict, screen recording reference, and submission timestamp.
- **Screen Recording**: A browser-captured video of the tester's session from start to submission. Composed of uploaded chunks, associated with a single task, and subject to the 90-day retention policy. Accessible via signed URLs.
- **Tester Profile**: The tester's identity and preferences within the platform. Includes availability status, which controls new task assignment eligibility.
- **Earnings Record**: A ledger entry linking a completed test submission to a payout amount and payment status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tester can complete a 10-step test case (start, execute all steps, attach evidence, submit verdict) within 30 minutes of active testing time, excluding time spent on the application under test.
- **SC-002**: 95% of test submissions include a recorded outcome for every step, a summary, a verdict, and a screen recording.
- **SC-003**: No test evidence (screenshots, step results, recording chunks) is lost due to session interruption, measured by zero data-loss incidents per 1,000 test executions.
- **SC-004**: Screen recordings are playable within 5 minutes of test submission for 99% of completed tests.
- **SC-005**: The dashboard is usable on mobile devices with screen widths down to 375px without horizontal scrolling or unusable controls.
- **SC-006**: Testers can toggle availability and see the change reflected in task assignment within 60 seconds.
- **SC-007**: 90% of testers successfully complete their first test case without requiring external support or guidance.
- **SC-008**: Screen recordings older than 90 days are fully removed within 24 hours of the retention deadline.

## Assumptions

- Testers have authenticated via the foundation auth system (dependency: 001-foundation-auth) and possess a valid tester role.
- Test cases are created and managed through the test case API (dependency: 002-test-case-api) before they appear as tasks for testers.
- Testers are using a modern browser that supports the screen capture and media recording browser APIs.
- Testers have a reasonably stable internet connection, though the system handles intermittent connectivity gracefully via chunk-based uploads and local queuing.
- The platform provides object storage with signed URL capability for screenshots and recordings.
- Builder identity anonymization is limited to the tester-facing dashboard; internal systems retain full attribution.
- Earnings amounts and payout rules are determined by business logic outside the scope of this feature; this feature only displays the resulting records.
- The "Start Test" action is the single trigger for both credential reveal and recording start, ensuring testers do not access credentials without an active recording.
