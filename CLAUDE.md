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
<!-- MANUAL ADDITIONS END -->
