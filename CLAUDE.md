# blendedagents Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-31

## Active Technologies
- TypeScript 5.x (Node.js 20 LTS) + Fastify, postgres.js, @fastify/oauth2, @fastify/session, @fastify/cookie, @fastify/cors, @fastify/rate-limit, connect-pg-simple, vites (001-foundation-auth)
- PostgreSQL 15+ (RLS, UUID, CHECK constraints, JSONB) (001-foundation-auth)
- TypeScript 5.x (Node.js 20 LTS) + Fastify, postgres.js, pg-boss (assignment jobs), vites (002-test-case-api)
- Supabase (PostgreSQL 15+ with RLS) — existing schema from 001-foundation-auth (002-test-case-api)

- TypeScript 5.x (Node.js 20 LTS) + Fastify (web framework), postgres.js (PostgreSQL driver), Stripe SDK, @modelcontextprotocol/sdk, vitest (testing) (006-credit-billing)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (Node.js 20 LTS): Follow standard conventions

## Recent Changes
- 002-test-case-api: Added TypeScript 5.x (Node.js 20 LTS) + Fastify, postgres.js, pg-boss (assignment jobs), vites
- 001-foundation-auth: Added TypeScript 5.x (Node.js 20 LTS) + Fastify, postgres.js, @fastify/oauth2, @fastify/session, @fastify/cookie, @fastify/cors, @fastify/rate-limit, connect-pg-simple, vites

- 006-credit-billing: Added TypeScript 5.x (Node.js 20 LTS) + Fastify (web framework), postgres.js (PostgreSQL driver), Stripe SDK, @modelcontextprotocol/sdk, vitest (testing)

<!-- MANUAL ADDITIONS START -->

## Deployment

Coolify does NOT auto-deploy on push. After `git push origin main`, you MUST trigger deployments manually.

### Coolify API

- **URL:** `http://213.210.20.151:8000`
- **Auth header:** `Authorization: Bearer 3|TZ7qM4Ox5WmlltxPTJZMlYyLt76SwDZFXQEwwHKoaca8250a`
- **Deploy endpoint:** `GET /api/v1/applications/{uuid}/restart`
- **Check deployment:** `GET /api/v1/deployments/{deployment_uuid}`

### Application UUIDs

| App | UUID | Domain |
|-----|------|--------|
| Backend | `xrg1cgvo95mv1c13z72r2n4g` | api.blendedagents.com |
| Frontend | `wmnb23be6sjxh78rx7b3dk0u` | blendedagents.com |

### Deploy commands

```bash
# Backend
curl -s -X GET "http://213.210.20.151:8000/api/v1/applications/xrg1cgvo95mv1c13z72r2n4g/restart" \
  -H "Authorization: Bearer 3|TZ7qM4Ox5WmlltxPTJZMlYyLt76SwDZFXQEwwHKoaca8250a" \
  -H "Accept: application/json"

# Frontend
curl -s -X GET "http://213.210.20.151:8000/api/v1/applications/wmnb23be6sjxh78rx7b3dk0u/restart" \
  -H "Authorization: Bearer 3|TZ7qM4Ox5WmlltxPTJZMlYyLt76SwDZFXQEwwHKoaca8250a" \
  -H "Accept: application/json"
```

### Checking deployment status

After triggering, the response includes a `deployment_uuid`. Check status with:

```bash
curl -s -X GET "http://213.210.20.151:8000/api/v1/deployments/{deployment_uuid}" \
  -H "Authorization: Bearer 3|TZ7qM4Ox5WmlltxPTJZMlYyLt76SwDZFXQEwwHKoaca8250a" \
  -H "Accept: application/json"
```

Look for `"status": "finished"` (success) or `"status": "failed"` (check logs in response).

### Known issues

- Both apps use PAT-embedded git URLs, NOT GithubApp source. If a Coolify app fails with "GitHub API call failed: Not Found", the fix is to set `source_type = NULL, source_id = NULL` in the Coolify DB:
  ```bash
  ssh root@213.210.20.151 "docker exec coolify-db psql -U coolify -c \"UPDATE applications SET source_type = NULL, source_id = NULL WHERE uuid = 'THE_APP_UUID';\""
  ```
- Backend Dockerfile must use `NODE_ENV=development npm ci` (tsx is a devDep needed at runtime)
- Frontend Dockerfile needs `NEXT_PUBLIC_*` vars as build args (Coolify injects them)
<!-- MANUAL ADDITIONS END -->
