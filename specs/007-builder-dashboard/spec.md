# 007 — Builder Dashboard

## Overview

A Next.js dashboard for builders (paying customers) of the BlendedAgents platform. Provides test case management, template management, credit/billing operations, webhook configuration, and API key management. Consumes the existing builder-facing API endpoints.

## User Stories

### US1 (P1): Test Case Management
- **As a builder**, I can view all my submitted test cases in a filterable list with status badges, step counts, and cost.
- **As a builder**, I can create a new test case with a title, staging URL, steps, and optional metadata.
- **As a builder**, I can view test case details including status timeline, step progress, and results (verdict, screenshots, per-step results).
- **As a builder**, I can cancel a queued/assigned test case.

### US2 (P1): Credits & Billing
- **As a builder**, I can view my current credit balance (available + reserved).
- **As a builder**, I can purchase credit packs via Stripe Checkout.
- **As a builder**, I can view my transaction history (top-ups, charges, refunds).

### US3 (P2): Template Management
- **As a builder**, I can create, edit, and delete reusable test templates.
- **As a builder**, I can instantiate a test case from a template (pre-fills the create form).

### US4 (P2): Account Settings
- **As a builder**, I can view my profile information.
- **As a builder**, I can configure a webhook URL and secret, send a test ping, and view delivery history.
- **As a builder**, I can view my API keys (prefix + label) — create new keys and revoke existing ones.

## Non-Functional Requirements
- Clean, professional UI (Linear/Notion-inspired design)
- Responsive layout
- API key authentication via httpOnly cookie
- All data fetched from existing backend API endpoints (no new backend work)
