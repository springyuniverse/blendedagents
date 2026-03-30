# Data Model: Test Case API

**Feature**: 002-test-case-api | **Date**: 2026-03-31

## Overview

This feature **reuses** all entities from 001-foundation-auth (test_cases, test_templates, step_results, test_results tables already exist). The additions are column-level enhancements and a new credential encryption pattern.

## Modifications to Existing Entities

### TestCase (add columns)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| required_skills | JSONB | NOT NULL, DEFAULT '[]' | Skills needed for tester matching |
| environment | TEXT | NULL | Deployment environment info |
| tags | JSONB | NOT NULL, DEFAULT '[]' | Filterable tags array |
| callback_url | TEXT | NULL | Webhook URL for result delivery |
| expected_behavior | TEXT | NULL | What tester should verify |
| status_history | JSONB | NOT NULL, DEFAULT '[]' | Array of {status, timestamp} for audit |

**Credential encryption**: The existing `credentials` JSONB column stores encrypted data in format:
```json
{
  "encrypted": "<base64(iv + ciphertext + authTag)>",
  "key_version": 1
}
```

### TestTemplate (add columns)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| environment | TEXT | NULL | Default environment |
| tags | JSONB | NOT NULL, DEFAULT '[]' | Default tags |
| expected_behavior | TEXT | NULL | Default expected behavior |

## State Machine: Test Case Lifecycle

```
                    ┌──────────┐
                    │  queued   │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
         ┌─────────┐ ┌────────┐ ┌─────────┐
         │cancelled│ │assigned│ │ expired  │
         └─────────┘ └───┬────┘ └─────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
         ┌─────────┐ ┌───────────┐ ┌────────┐
         │cancelled│ │in_progress│ │ queued  │
         └─────────┘ └─────┬─────┘ │(reassign)
                            │       └────────┘
                            ▼
                      ┌───────────┐
                      │ submitted │
                      └─────┬─────┘
                            ▼
                      ┌───────────┐
                      │ completed │
                      └───────────┘
```

**Transitions**:
- `queued → assigned`: Assignment engine finds a tester
- `queued → cancelled`: Builder cancels (credits refunded)
- `queued → expired`: 2-hour window elapsed (credits refunded)
- `assigned → in_progress`: Tester accepts within 30 min
- `assigned → cancelled`: Builder cancels (credits refunded)
- `assigned → queued`: Tester timeout (30 min), reassign
- `assigned → expired`: 2-hour window elapsed (credits refunded)
- `in_progress → submitted`: Tester submits all step results
- `submitted → completed`: System validates and finalizes

**Status history format** (stored in status_history JSONB):
```json
[
  { "status": "queued", "at": "2026-03-31T10:00:00Z" },
  { "status": "assigned", "at": "2026-03-31T10:02:30Z", "tester_id": "..." },
  { "status": "in_progress", "at": "2026-03-31T10:05:00Z" },
  { "status": "submitted", "at": "2026-03-31T10:35:00Z" },
  { "status": "completed", "at": "2026-03-31T10:35:01Z" }
]
```

## Credit Integration

| Event | Credit Operation | Transaction Type |
|-------|-----------------|-----------------|
| Test case created | Reserve: available -= cost, reserved += cost | (reservation, no txn record yet) |
| Test case cancelled | Refund: reserved -= cost, available += cost | refund |
| Test case expired | Refund: reserved -= cost, available += cost | refund |
| Test case completed | Deduct + Payout + Commission (3 atomic txns) | charge + payout + commission |

## Indexes (additions)

- `test_cases (builder_id, tags)` — GIN index for tag filtering
- `test_cases (required_skills)` — GIN index for assignment engine
