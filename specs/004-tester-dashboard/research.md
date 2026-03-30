# Research: Tester Dashboard

**Feature**: 004-tester-dashboard
**Date**: 2026-03-30

## Key Technical Decisions

### 1. Screen Recording: MediaRecorder API with Chunked Upload

**Decision**: Use the browser's `getDisplayMedia()` + `MediaRecorder` API for screen recording. Upload chunks to S3 every 10 seconds via presigned PUT URLs to protect against session loss.

**Why**: Native browser API requires no plugins or extensions. Chunked upload means partial recordings survive browser crashes. S3 multipart upload is overkill for 10-second video chunks -- individual presigned PUTs per chunk are simpler.

**Trade-offs**: Recording quality and codec support vary by browser. Chrome supports VP9/WebM, Safari prefers H.264/MP4. We normalize to WebM and accept Safari limitations. Users on unsupported browsers can still complete tests without recording (P3 feature).

### 2. File Uploads: S3 Presigned URLs

**Decision**: Backend generates presigned PUT URLs. Frontend uploads directly to S3, bypassing the API server entirely for file transfer.

**Why**: Eliminates backend as a bottleneck for file uploads. No need to handle multipart form data on the server. S3 handles storage, durability, and CDN integration. Presigned URLs expire after 1 hour for security.

**Key pattern**:
1. Frontend requests presigned URL: `POST /api/v1/tester/upload/presign`
2. Backend generates URL with S3 key: `screenshots/2026-03-30/{testCaseId}/{filename}`
3. Frontend PUTs file directly to S3 using the presigned URL
4. Frontend sends the S3 key back to backend in step result submission

### 3. Session Authentication: Shared Cookies

**Decision**: The Next.js dashboard shares session cookies with the Fastify backend. In development, Next.js rewrites API requests to the backend via `next.config.ts` rewrites. In production, both run behind the same domain (reverse proxy or subdomain).

**Why**: Reuses existing `@fastify/session` + `connect-pg-simple` infrastructure from 001-foundation-auth. No need for a separate JWT system or OAuth flow for the dashboard.

**Configuration**: Next.js `next.config.ts` includes a rewrite rule: `/api/v1/tester/**` -> `http://localhost:3000/api/v1/tester/**`.

### 4. PWA: next-pwa for Installability

**Decision**: Use `next-pwa` package for service worker generation and PWA manifest. This makes the dashboard installable on mobile devices and provides basic offline awareness.

**Why**: Testers may work from tablets or phones. PWA installability removes browser chrome and provides a native-like experience. Offline support is limited to showing cached pages -- actual test execution requires connectivity.

### 5. State Management: TanStack Query (React Query)

**Decision**: Use `@tanstack/react-query` for all server state management. No global state library (Redux, Zustand, etc.).

**Why**: All dashboard state is server-derived (task list, task details, profile, earnings). React Query handles caching, background refetching, loading/error states, and optimistic updates. Client-only state (form inputs, UI toggles) uses React `useState`.

**Patterns**:
- `useQuery` for data fetching (tasks, profile, earnings)
- `useMutation` for write operations (step submission, profile update)
- Invalidate queries on mutation success for automatic UI refresh

### 6. Design System: Linear/Notion-Inspired Minimal UI

**Decision**: Clean, minimal Tailwind CSS styling. Neutral gray palette with a single accent color. No component library -- all components are hand-crafted with Tailwind.

**Why**: Keeps bundle size small. Matches the platform's professional, tool-oriented aesthetic. Avoids dependency on UI library release cycles.

**Key design tokens**:
- Background: `gray-50` (page), `white` (cards)
- Text: `gray-900` (primary), `gray-500` (secondary)
- Accent: `blue-600` (actions), `green-600` (pass), `red-600` (fail), `yellow-600` (block), `gray-400` (skip)
- Border: `gray-200`
- Border radius: `rounded-lg` (cards), `rounded-md` (buttons/inputs)
- Font: system font stack via Tailwind defaults

## Dependencies Added

### Backend (root package.json)
- `@aws-sdk/client-s3` -- S3 client for presigned URL generation
- `@aws-sdk/s3-request-presigner` -- Presigned URL utility

### Frontend (dashboard/package.json)
- `next` 15.x -- React framework
- `react` 19.x, `react-dom` 19.x -- UI library
- `typescript` 5.x -- Type safety
- `tailwindcss` 4.x -- Utility-first CSS
- `@tanstack/react-query` 5.x -- Server state management
- `next-pwa` -- PWA support (Phase 5)

## Environment Variables

### Backend (existing .env)
- `AWS_REGION` -- S3 region (default: `us-east-1`)
- `AWS_ACCESS_KEY_ID` -- S3 credentials
- `AWS_SECRET_ACCESS_KEY` -- S3 credentials
- `S3_BUCKET` -- Bucket name (default: `blendedagents-uploads`)

### Frontend (dashboard/.env.local)
- `NEXT_PUBLIC_API_URL` -- Backend API base URL (default: `/api/v1/tester` via rewrite)
