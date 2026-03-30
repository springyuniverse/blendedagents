# Data Model: Foundation & Auth

**Feature**: 001-foundation-auth | **Date**: 2026-03-30

## Entity Relationship Overview

```
Builder
  ├── 1:N ApiKey
  ├── 1:N TestCase
  ├── 1:N TestTemplate
  ├── 1:N Transaction (as builder)
  └── 1:N WebhookDelivery

Tester
  ├── 0..1 TestCase (current assignment)
  ├── 1:N StepResult
  ├── 1:N Transaction (as tester)
  └── 1:N TestResult

TestTemplate
  └── 1:N TestCase (created from)

TestCase
  ├── 1:N StepResult
  └── 1:1 TestResult
```

## Entities

### Builder

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| display_name | TEXT | NOT NULL | Company or developer name |
| email | TEXT | NOT NULL, UNIQUE | Contact email |
| webhook_url | TEXT | NULL | URL for result delivery |
| webhook_secret | TEXT | NULL | HMAC secret for webhook signing |
| credits_balance | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Credit balance in credits |
| plan_tier | TEXT | NOT NULL, DEFAULT 'starter', CHECK IN ('starter','pro','team') | Subscription tier |
| metadata | JSONB | DEFAULT '{}' | Extensible metadata |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

### ApiKey

Separate table for API keys (a builder can have multiple keys).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| builder_id | UUID | FK → builders(id), NOT NULL | Owning builder |
| key_hash | CHAR(64) | NOT NULL, UNIQUE | SHA-256 hex hash of the full key |
| key_prefix | VARCHAR(12) | NOT NULL | First chars for display (e.g., ba_sk_a1b2) |
| label | TEXT | NULL | Human-readable name |
| revoked_at | TIMESTAMPTZ | NULL | NULL if active, timestamp if revoked |
| last_used_at | TIMESTAMPTZ | NULL | Periodically updated |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Key generation**: `ba_sk_` + `crypto.randomBytes(32).toString('hex')` (70 chars total)
**Hashing**: `SHA-256(full_key)` stored as hex (64 chars)

### Tester

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| display_name | TEXT | NOT NULL | Full name |
| email | TEXT | NOT NULL, UNIQUE | Login email (from OAuth) |
| avatar_url | TEXT | NULL | Profile image from OAuth provider |
| skills | JSONB | NOT NULL, DEFAULT '[]' | Array of skill strings |
| languages | JSONB | NOT NULL, DEFAULT '[]' | Array of language codes |
| region | TEXT | NOT NULL | Geographic region (egypt, mena, southeast_asia) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Can log in and receive work |
| is_available | BOOLEAN | NOT NULL, DEFAULT false | Currently accepting assignments |
| current_task_id | UUID | FK → test_cases(id), NULL | Currently assigned test |
| tasks_total | INTEGER | NOT NULL, DEFAULT 0 | Lifetime task count |
| tasks_completed | INTEGER | NOT NULL, DEFAULT 0 | Completed task count |
| avg_completion_minutes | NUMERIC(7,2) | NOT NULL, DEFAULT 0 | Average completion time |
| earnings_cents | INTEGER | NOT NULL, DEFAULT 0 | Lifetime earnings in USD cents |
| timezone | TEXT | NULL | IANA timezone |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

### TestCase

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| builder_id | UUID | FK → builders(id), NOT NULL | Submitting builder |
| template_id | UUID | FK → test_templates(id), NULL | Source template |
| title | TEXT | NOT NULL | Test case title |
| description | TEXT | NULL | Detailed description |
| url | TEXT | NULL | Target URL to test |
| steps | JSONB | NOT NULL, DEFAULT '[]' | Ordered array of step objects |
| credentials | JSONB | NULL | Encrypted staging credentials |
| status | TEXT | NOT NULL, DEFAULT 'queued', CHECK IN ('queued','assigned','in_progress','submitted','completed','expired','cancelled') | Lifecycle status |
| assigned_tester_id | UUID | FK → testers(id), NULL | Assigned tester |
| assigned_at | TIMESTAMPTZ | NULL | When assigned |
| completed_at | TIMESTAMPTZ | NULL | When completed |
| expires_at | TIMESTAMPTZ | NULL | Expiry deadline |
| external_id | TEXT | NULL | Builder's reference ID |
| metadata | JSONB | DEFAULT '{}' | Extensible metadata |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

**Steps JSONB structure**:
```json
[
  { "index": 0, "title": "Navigate to login", "action": "Go to /login", "expected": "Login form visible" },
  { "index": 1, "title": "Enter credentials", "action": "Enter test@example.com", "expected": "Form accepts input" }
]
```

**Status transitions**:
```
queued → assigned → in_progress → submitted → completed
queued → expired
queued → cancelled
assigned → cancelled
in_progress → cancelled
```

### TestTemplate

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| builder_id | UUID | FK → builders(id), NOT NULL | Owner builder |
| title | TEXT | NOT NULL | Template title |
| description | TEXT | NULL | Template description |
| steps | JSONB | NOT NULL, DEFAULT '[]' | Default step definitions |
| metadata | JSONB | DEFAULT '{}' | Extensible metadata |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

### StepResult

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| test_case_id | UUID | FK → test_cases(id), NOT NULL | Parent test case |
| tester_id | UUID | FK → testers(id), NOT NULL | Executing tester |
| step_index | INTEGER | NOT NULL | Which step (0-based) |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','passed','failed','blocked','skipped') | Step outcome |
| severity | TEXT | NULL, CHECK IN ('critical','major','minor','suggestion') | Issue severity (if failed) |
| actual_behavior | TEXT | NULL | What actually happened |
| screenshot_url | TEXT | NULL | Evidence screenshot |
| notes | TEXT | NULL | Tester's notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated via trigger |

**Unique constraint**: `(test_case_id, step_index)` — one result per step per test case.

### TestResult

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| test_case_id | UUID | FK → test_cases(id), NOT NULL, UNIQUE | One result per test case |
| tester_id | UUID | FK → testers(id), NOT NULL | Tester who completed |
| verdict | TEXT | NOT NULL, CHECK IN ('pass','fail','partial','blocked') | Aggregate outcome |
| summary | TEXT | NULL | Summary description |
| steps_passed | INTEGER | NOT NULL, DEFAULT 0 | Count of passed steps |
| steps_failed | INTEGER | NOT NULL, DEFAULT 0 | Count of failed steps |
| steps_blocked | INTEGER | NOT NULL, DEFAULT 0 | Count of blocked steps |
| steps_total | INTEGER | NOT NULL, DEFAULT 0 | Total step count |
| recording_url | TEXT | NULL | Session recording URL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

### Transaction

(Defined here for schema completeness; billing logic in 006-credit-billing)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| type | TEXT | NOT NULL, CHECK IN ('topup','charge','payout','commission','refund') | Transaction type |
| builder_id | UUID | FK → builders(id), NOT NULL | Builder involved |
| tester_id | UUID | FK → testers(id), NULL | Tester involved |
| test_case_id | UUID | FK → test_cases(id), NULL | Related test case |
| credit_amount | INTEGER | NOT NULL | Credits affected |
| currency_amount_cents | INTEGER | NOT NULL | USD amount in cents |
| commission_pct | NUMERIC(5,2) | NULL | Commission percentage |
| commission_amount_cents | INTEGER | NULL | Commission in cents |
| description | TEXT | NOT NULL | Human-readable description |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Immutable timestamp |

**Immutability**: DB trigger rejects UPDATE and DELETE.

### WebhookDelivery

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| builder_id | UUID | FK → builders(id), NOT NULL | Target builder |
| test_case_id | UUID | FK → test_cases(id), NOT NULL | Related test case |
| event_type | TEXT | NOT NULL | Event name (e.g., test.completed) |
| payload | JSONB | NOT NULL | Delivered payload |
| url | TEXT | NOT NULL | Target URL |
| response_status | INTEGER | NULL | HTTP response code |
| response_body | TEXT | NULL | Response body (truncated) |
| attempt_count | INTEGER | NOT NULL, DEFAULT 0 | Delivery attempts |
| next_retry_at | TIMESTAMPTZ | NULL | Next retry time |
| delivered_at | TIMESTAMPTZ | NULL | Successful delivery time |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

## RLS Policy Summary

| Table | Builder access | Tester access |
|-------|---------------|---------------|
| builders | Own row only (SELECT, UPDATE) | No access |
| api_keys | Own keys only | No access |
| testers | No direct access | Own row only (SELECT, UPDATE) |
| test_cases | Own test cases (CRUD) | Assigned test cases (SELECT) |
| test_templates | Own templates (CRUD) | No access |
| step_results | Own test cases' results (SELECT) | Own results (SELECT, INSERT, UPDATE) |
| test_results | Own test cases' results (SELECT) | Own results (SELECT, INSERT) |
| transactions | Own transactions (SELECT) | Own payouts (SELECT) |
| webhook_deliveries | Own deliveries (SELECT) | No access |
