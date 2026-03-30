# Implementation Plan: Test Case API

**Branch**: `002-test-case-api` | **Date**: 2026-03-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-test-case-api/spec.md`

## Summary

Implement the core product loop: builders create test cases via REST API, credits are reserved, the assignment engine finds and assigns qualified testers via pg-boss jobs, testers execute steps and submit results, and builders retrieve structured results. Includes template management and credential encryption (AES-256-GCM) at rest.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify, postgres.js, pg-boss (assignment jobs), vitest
**Storage**: Supabase (PostgreSQL 15+ with RLS) — existing schema from 001-foundation-auth
**Testing**: vitest + Fastify inject() for integration tests, real PostgreSQL for DB tests
**Target Platform**: Linux server (containerized)
**Project Type**: web-service (monolith)
**Performance Goals**: <3s round-trip for create+retrieve, <1s for list endpoints with 10k test cases
**Constraints**: Atomic credit reservation, deterministic race condition resolution, credentials encrypted at rest (AES-256-GCM)
**Scale/Scope**: Initial launch scale; single Supabase instance

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Contract-First | PASS | API contracts for test-cases and templates defined in `/contracts/` before implementation |
| II. Test-First | PASS | TDD mandatory. Integration tests hit real PostgreSQL. Mocks only for external services |
| III. Structured I/O | PASS | All endpoints return JSON. All errors use structured format (code + message + context) |
| IV. Managed Quality | PASS | Assignment is algorithmic (availability + skill match + workload). No marketplace dynamics |
| V. Simplicity | PASS | Builds on existing models from 001. pg-boss for async jobs (already in project). AES-256-GCM via Node.js crypto (no external libs) |

## Project Structure

### Documentation (this feature)

```text
specs/002-test-case-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── test-cases-api.md
│   └── templates-api.md
└── tasks.md
```

### Source Code (additions to existing structure)

```text
src/
├── services/
│   ├── test-case.service.ts      # Create, cancel, retrieve, list test cases
│   ├── template.service.ts       # Template CRUD + instantiate
│   ├── assignment.service.ts     # Tester matching + assignment logic
│   └── credential.service.ts     # AES-256-GCM encrypt/decrypt
├── api/
│   ├── test-cases.routes.ts      # /api/v1/test-cases endpoints
│   └── templates.routes.ts       # /api/v1/templates endpoints
└── lib/
    └── jobs.ts                   # Shared pg-boss instance

tests/
├── integration/
│   ├── test-case-crud.test.ts
│   ├── test-case-cancel.test.ts
│   ├── template-crud.test.ts
│   ├── assignment.test.ts
│   └── credential-encryption.test.ts
├── contract/
│   ├── test-cases.test.ts
│   └── templates.test.ts
└── unit/
    └── credential.test.ts
```

**Structure Decision**: Adds to existing monolith. Reuses models from 001 (test-case.ts, test-template.ts, step-result.ts, test-result.ts). New services for business logic, new routes for API endpoints.

## Complexity Tracking

> No constitution violations to justify. All gates pass.
