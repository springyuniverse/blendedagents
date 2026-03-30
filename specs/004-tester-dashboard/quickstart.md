# Quickstart: Tester Dashboard

**Feature**: 004-tester-dashboard
**Date**: 2026-03-30

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+ (Supabase or local)
- AWS S3 bucket (or LocalStack for development)
- Existing backend running (001-foundation-auth, 002-test-case-api)

## Backend Setup

1. Install S3 dependencies in the project root:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. Add S3 environment variables to `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=blendedagents-uploads
```

3. Start the backend:

```bash
npm run dev
```

The tester API is available at `http://localhost:3000/api/v1/tester/`.

## Frontend Setup

1. Navigate to the dashboard directory:

```bash
cd dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=/api/v1/tester
```

4. Start the development server:

```bash
npm run dev
```

The dashboard is available at `http://localhost:3001`.

## Development Workflow

- Backend API changes: edit files in `src/api/tester.routes.ts` and `src/services/s3.service.ts`
- Frontend changes: edit files in `dashboard/src/`
- API requests from the dashboard are proxied to the backend via Next.js rewrites (configured in `dashboard/next.config.ts`)

## Testing

### Backend Tests

```bash
# From project root
npm test -- tests/integration/tester-api.test.ts
```

### Frontend

```bash
# From dashboard/
npm run dev
# Open http://localhost:3001 and test manually
```

## S3 Local Development

For local development without AWS, use LocalStack:

```bash
docker run -d -p 4566:4566 localstack/localstack
```

Set environment variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET=blendedagents-uploads
S3_ENDPOINT=http://localhost:4566
```
