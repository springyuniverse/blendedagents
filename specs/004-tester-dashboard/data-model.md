# Data Model: Tester Dashboard

**Feature**: 004-tester-dashboard
**Date**: 2026-03-30

## Overview

No new tables are required. The tester dashboard feature operates on existing entities from 001-foundation-auth and 002-test-case-api. S3 is used for file storage (screenshots, recordings) -- S3 keys are stored in existing columns.

## Existing Entities Used

### testers (from 001-foundation-auth)
Used for: profile display, availability toggle, earnings lookup.

| Column | Type | Usage in Dashboard |
|--------|------|--------------------|
| id | UUID | Primary identifier |
| display_name | TEXT | Editable in profile |
| email | TEXT | Displayed in profile (read-only) |
| avatar_url | TEXT | Profile avatar |
| skills | JSONB | Profile display |
| languages | JSONB | Profile display |
| region | TEXT | Profile display |
| is_active | BOOLEAN | Auth check |
| is_available | BOOLEAN | Availability toggle |
| current_task_id | UUID | Active task reference |
| tasks_total | INTEGER | Profile stats |
| tasks_completed | INTEGER | Profile stats |
| avg_completion_minutes | NUMERIC | Profile stats |
| earnings_cents | INTEGER | Earnings display |
| timezone | TEXT | Editable in profile |

### test_cases (from 002-test-case-api)
Used for: task list, task detail, step execution.

| Column | Type | Usage in Dashboard |
|--------|------|--------------------|
| id | UUID | Task identifier |
| title | TEXT | Task card + header |
| description | TEXT | Task detail |
| url | TEXT | Staging URL in task header |
| steps | JSONB | Step checklist |
| credentials | JSONB | Revealed on "Start Test" (decrypted) |
| status | TEXT | Task state (assigned, in_progress) |
| assigned_tester_id | UUID | Ownership check |
| assigned_at | TIMESTAMPTZ | Display in task card |
| environment | TEXT | Environment info |
| expected_behavior | TEXT | Context for tester |
| builder_id | UUID | Used internally (anonymized from tester) |

### step_results (from 002-test-case-api)
Used for: recording individual step outcomes during test execution.

| Column | Type | Usage in Dashboard |
|--------|------|--------------------|
| id | UUID | Step result identifier |
| test_case_id | UUID | FK to test_cases |
| tester_id | UUID | FK to testers |
| step_index | INTEGER | Which step |
| status | TEXT | passed/failed/blocked/skipped |
| severity | TEXT | For failed steps: critical/major/minor/cosmetic |
| actual_behavior | TEXT | For failed steps: description |
| screenshot_url | TEXT | S3 key for screenshot evidence |
| notes | TEXT | Additional notes |

### test_results (from 002-test-case-api)
Used for: final test submission.

| Column | Type | Usage in Dashboard |
|--------|------|--------------------|
| id | UUID | Result identifier |
| test_case_id | UUID | FK to test_cases |
| tester_id | UUID | FK to testers |
| verdict | TEXT | pass/fail/partial/blocked |
| summary | TEXT | 1-3 sentence summary |
| steps_passed | INTEGER | Aggregation |
| steps_failed | INTEGER | Aggregation |
| steps_blocked | INTEGER | Aggregation |
| steps_total | INTEGER | Aggregation |
| recording_url | TEXT | S3 key for screen recording |

### tester_payout_records (from 006-credit-billing)
Used for: earnings history display.

## S3 Storage Structure

```
{bucket}/
├── screenshots/
│   └── {date}/
│       └── {testCaseId}/
│           └── {filename}          # e.g., step-3-failure.png
└── recordings/
    └── {date}/
        └── {testCaseId}/
            ├── chunk-0.webm        # 10-second chunks
            ├── chunk-1.webm
            └── chunk-N.webm
```

No database schema changes are needed. The `screenshot_url` column in `step_results` and `recording_url` column in `test_results` store S3 keys.
