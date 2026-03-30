# Implementation Plan: Tester Dashboard

**Branch**: `004-tester-dashboard` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-tester-dashboard/spec.md`

## Summary

Build a Next.js web dashboard for testers to execute test cases step-by-step with evidence capture, plus a backend Fastify API to power it. Testers view assigned tasks, start tests (revealing credentials and optionally beginning screen recording), mark each step as pass/fail/block/skip with required evidence, and submit completed tests with a summary and verdict. The dashboard also supports profile management, availability toggling, and earnings visibility. S3 presigned URLs enable direct-to-S3 uploads for screenshots and recordings.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify (backend API), Next.js 15 App Router (frontend), @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @tanstack/react-query, Tailwind CSS, vitest (testing)
**Storage**: PostgreSQL 15+ (Supabase, existing schema), AWS S3 (file uploads)
**Testing**: vitest + Fastify inject() for backend integration tests
**Target Platform**: Linux server (backend), browser (frontend PWA)
**Project Type**: web-application (backend API + frontend dashboard)
**Performance Goals**: <200ms p95 for API requests, <3s initial page load
**Constraints**: Mobile-responsive down to 375px, session-based auth (shared cookies), direct-to-S3 uploads via presigned URLs
**Scale/Scope**: Single backend, single Next.js app, ~10 pages/components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Contract-First | PASS | Tester API contracts defined in `/contracts/tester-api.md` before implementation. |
| II. Test-First | PASS | Integration tests written as placeholders. Backend tests use Fastify inject(). |
| III. Structured I/O | PASS | All API endpoints accept/return JSON. Errors use structured format (code + message + context). |
| IV. Managed Quality | PASS | Platform-controlled test execution workflow. No unstructured inputs. |
| V. Simplicity | PASS | Single Next.js app for dashboard. Backend extends existing Fastify server. S3 for file storage (no custom file server). No state management library beyond React Query. |

**Post-Phase 1 Re-check**: All gates remain PASS. Frontend uses App Router with server components where possible. No additional databases or services introduced.

## Project Structure

### Documentation (this feature)

```text
specs/004-tester-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── tester-api.md    # Tester-facing API endpoints
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── services/
│   └── s3.service.ts           # S3 presigned URL service
├── api/
│   └── tester.routes.ts        # Tester-facing API routes

dashboard/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   ├── page.tsx            # Redirect to /tasks
│   │   ├── tasks/
│   │   │   ├── page.tsx        # Task list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Task execution
│   │   ├── profile/
│   │   │   └── page.tsx        # Profile management
│   │   └── earnings/
│   │       └── page.tsx        # Earnings history
│   ├── components/
│   │   ├── StepResult.tsx      # Step outcome component
│   │   ├── ScreenshotUpload.tsx# Screenshot upload via S3
│   │   ├── TestSubmission.tsx  # Final submission form
│   │   └── AvailabilityToggle.tsx # Availability toggle
│   ├── hooks/
│   │   └── useScreenRecording.ts # MediaRecorder hook
│   └── lib/
│       ├── api.ts              # API client
│       └── recording.ts        # Recording upload helper

tests/
└── integration/
    └── tester-api.test.ts      # Tester API integration tests
```

**Structure Decision**: Backend extends the existing `src/` Fastify monolith. Frontend is a separate Next.js project in `dashboard/` with its own package.json and build tooling. The two share authentication via session cookies (same domain or proxy).
