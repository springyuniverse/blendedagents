# Data Model: Webhook Delivery

**Feature**: 005-webhook-delivery | **Date**: 2026-03-30

## Existing Tables (No Changes)

### webhook_deliveries (from 009-webhook-deliveries.sql)

Already exists with all required columns:
- `id` UUID PK
- `builder_id` UUID FK -> builders
- `test_case_id` UUID FK -> test_cases
- `event_type` TEXT
- `payload` JSONB
- `url` TEXT
- `response_status` INT (nullable)
- `response_body` TEXT (nullable)
- `attempt_count` INT DEFAULT 0
- `next_retry_at` TIMESTAMPTZ (nullable)
- `delivered_at` TIMESTAMPTZ (nullable)
- `created_at` TIMESTAMPTZ DEFAULT now()

### builders (from 001-builders.sql)

Already has webhook configuration columns:
- `webhook_url` TEXT (nullable)
- `webhook_secret` TEXT (nullable)

## New Column

### test_results.machine_summary (Migration 013)

**Decision**: Add `machine_summary JSONB` column to the existing `test_results` table rather than creating a separate `machine_summaries` table.

**Rationale**:
- 1:1 relationship between test_results and machine summaries.
- Avoids an unnecessary JOIN for a field that is always read with the test result.
- JSONB allows flexible schema evolution without migrations.
- The summary is generated once at test completion and stored alongside the result.

**Migration**: `src/migrations/013-machine-summary.sql`

```sql
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS machine_summary JSONB;
```

**JSONB Schema** (application-enforced, not DB-enforced):

```json
{
  "verdict": "fail",
  "confidence": 0.6,
  "passed_steps": [0, 1],
  "failed_steps": [
    {
      "index": 2,
      "severity": "critical",
      "actual_behavior": "Button did not respond to click",
      "evidence": ["https://storage.example.com/screenshot-abc.png"]
    }
  ],
  "blocked_steps": [],
  "environment": { "browser": "Chrome 120", "os": "macOS 14" },
  "recording_url": "https://storage.example.com/recording-xyz.mp4",
  "execution_minutes": 12.5
}
```

## Entity Relationships

```
builders (1) ---> (*) webhook_deliveries
test_cases (1) ---> (*) webhook_deliveries
test_cases (1) ---> (1) test_results ---> (1) machine_summary (JSONB column)
test_cases (1) ---> (*) step_results
```
