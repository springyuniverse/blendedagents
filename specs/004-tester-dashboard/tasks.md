# Tasks: Tester Dashboard

**Input**: Design documents from `/specs/004-tester-dashboard/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included -- Constitution Principle II (Test-First) is NON-NEGOTIABLE.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create project scaffolding

- [x] T001 Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner dependencies in root package.json
- [x] T002 [P] Create S3 presigned URL service in src/services/s3.service.ts with getUploadUrl, getDownloadUrl, and generateKey methods
- [x] T003 [P] Initialize Next.js project in dashboard/ with TypeScript, Tailwind CSS, App Router, and src directory

---

## Phase 2: User Story 1 -- Test Execution (Priority: P1) MVP

**Goal**: Testers view assigned tasks, start tests (revealing credentials), execute steps with evidence, and submit completed tests. This is the core value proposition.

**Independent Test**: Assign a multi-step test case to a tester and verify they can start, execute each step with varied outcomes (pass, fail, block, skip), attach evidence, and submit a final verdict.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] [US1] Integration test for GET /api/v1/tester/tasks listing assigned tasks (only assigned/in_progress, no credentials in list) in tests/integration/tester-api.test.ts
- [x] T005 [P] [US1] Integration test for GET /api/v1/tester/tasks/:id showing task detail (credentials hidden until started) in tests/integration/tester-api.test.ts
- [x] T006 [P] [US1] Integration test for POST /api/v1/tester/tasks/:id/start transitioning to in_progress and returning credentials in tests/integration/tester-api.test.ts
- [x] T007 [P] [US1] Integration test for POST /api/v1/tester/tasks/:id/steps/:index submitting step results (pass, fail with required fields) in tests/integration/tester-api.test.ts
- [x] T008 [P] [US1] Integration test for POST /api/v1/tester/tasks/:id/submit validating all steps addressed before submission in tests/integration/tester-api.test.ts

### Implementation for User Story 1 (Backend)

- [x] T009 [US1] Implement tester API routes in src/api/tester.routes.ts: GET /tasks, GET /tasks/:id, POST /tasks/:id/start, POST /tasks/:id/steps/:index, POST /tasks/:id/submit, POST /upload/presign
- [x] T010 [US1] Register tester routes with prefix /api/v1/tester and tester auth middleware in src/server.ts

### Implementation for User Story 1 (Frontend)

- [x] T011 [P] [US1] Create dashboard layout with sidebar navigation (Tasks, Profile, Earnings links) in dashboard/src/app/layout.tsx
- [x] T012 [P] [US1] Create tasks list page showing assigned tasks with title, status, step count, assigned time in dashboard/src/app/tasks/page.tsx
- [x] T013 [US1] Create task detail/execution page with step-by-step checklist, "Start Test" button, credential reveal, step controls in dashboard/src/app/tasks/[id]/page.tsx
- [x] T014 [P] [US1] Create step result component with pass/fail/block/skip controls and fail evidence form in dashboard/src/components/StepResult.tsx
- [x] T015 [P] [US1] Create screenshot upload component using S3 presigned URLs in dashboard/src/components/ScreenshotUpload.tsx
- [x] T016 [P] [US1] Create test submission form with summary textarea, verdict selector, and submit button in dashboard/src/components/TestSubmission.tsx
- [x] T017 [P] [US1] Create API client module for backend communication with session cookie support in dashboard/src/lib/api.ts

---

## Phase 3: User Story 2 -- Profile & Availability (Priority: P2)

**Goal**: Testers view/edit profile, toggle availability, and review earnings.

**Independent Test**: Tester logs in, updates profile, toggles availability off (no new tasks assigned), toggles back on, views earnings.

### Implementation for User Story 2

- [x] T018 [US2] Create profile page with editable display_name, timezone, and stats display in dashboard/src/app/profile/page.tsx
- [x] T019 [US2] Create earnings page with earnings history table in dashboard/src/app/earnings/page.tsx
- [x] T020 [P] [US2] Implement availability toggle component in dashboard/src/components/AvailabilityToggle.tsx

---

## Phase 4: User Story 3 -- Screen Recording (Priority: P3)

**Goal**: Automatic screen recording during test execution with chunked upload to S3.

**Independent Test**: Start a test, verify recording indicator, execute steps, submit, confirm recording is viewable.

### Implementation for User Story 3

- [x] T021 [P] [US3] Create screen recording hook using MediaRecorder API with getDisplayMedia() in dashboard/src/hooks/useScreenRecording.ts
- [x] T022 [P] [US3] Implement chunked recording upload to S3 with presigned URLs in dashboard/src/lib/recording.ts
- [x] T023 [US3] Integrate recording into test execution page: auto-start on "Start Test", stop on submit, recording indicator in dashboard/src/app/tasks/[id]/page.tsx

---

## Phase 5: Polish

**Purpose**: PWA support and responsive design refinement

- [x] T024 Add PWA manifest and service worker configuration in dashboard/
- [x] T025 Ensure mobile responsiveness down to 375px across all pages and components
