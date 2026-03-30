# Contract: Test Cases API

**Version**: 1.0.0 | **Feature**: 002-test-case-api

All endpoints require builder authentication via `Authorization: Bearer ba_sk_<key>`.

---

## POST /api/v1/test-cases

Create a new test case. Reserves credits automatically.

**Request Body**:
```json
{
  "title": "Verify checkout flow",
  "description": "Test the complete checkout process on staging",
  "staging_url": "https://staging.example.com",
  "steps": [
    { "instruction": "Navigate to product page", "expected": "Product details visible" },
    { "instruction": "Click Add to Cart", "expected": "Item added, cart count updates" },
    { "instruction": "Complete checkout", "expected": "Order confirmation shown" }
  ],
  "expected_behavior": "User can complete a purchase end-to-end",
  "credentials": { "username": "test@example.com", "password": "staging123" },
  "environment": "staging",
  "tags": ["checkout", "e-commerce"],
  "external_id": "TICKET-123",
  "callback_url": "https://api.example.com/webhooks/blendedagents",
  "required_skills": ["web", "e-commerce"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Test case title |
| description | string | Yes | Detailed description |
| staging_url | string | Yes | URL to test |
| steps | array | Yes (min 1) | Ordered step objects with instruction + expected |
| expected_behavior | string | Yes | Overall expected behavior |
| credentials | object | No | Staging credentials (encrypted at rest) |
| environment | string | No | Environment info |
| tags | string[] | No | Filterable tags |
| external_id | string | No | Builder's reference ID |
| callback_url | string | No | URL for result delivery |
| required_skills | string[] | No | Skills needed for assignment |

**Response 201**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "credit_cost": 5,
  "has_credentials": true,
  "created_at": "2026-03-31T10:00:00.000Z"
}
```

**Error 400** — Validation error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "steps array must contain at least one step",
    "context": { "field": "steps" }
  }
}
```

**Error 400** — Insufficient credits:
```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credits for this operation",
    "context": { "available": 3, "required": 5 }
  }
}
```

---

## GET /api/v1/test-cases

List builder's test cases with pagination and filtering.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter by status |
| cursor | string | null | Keyset pagination cursor |
| limit | integer | 20 | Page size (max 100) |
| tags | string | null | Comma-separated tag filter |

**Response 200**:
```json
{
  "test_cases": [
    {
      "id": "550e8400-...",
      "title": "Verify checkout flow",
      "status": "queued",
      "credit_cost": 5,
      "steps_count": 3,
      "external_id": "TICKET-123",
      "created_at": "2026-03-31T10:00:00.000Z"
    }
  ],
  "next_cursor": "2026-03-30T...",
  "has_more": true
}
```

---

## GET /api/v1/test-cases/:id

Get full test case details.

**Response 200**:
```json
{
  "id": "550e8400-...",
  "title": "Verify checkout flow",
  "description": "Test the complete checkout process",
  "staging_url": "https://staging.example.com",
  "steps": [...],
  "expected_behavior": "User can complete a purchase",
  "has_credentials": true,
  "environment": "staging",
  "tags": ["checkout", "e-commerce"],
  "status": "in_progress",
  "credit_cost": 5,
  "external_id": "TICKET-123",
  "assigned_tester_id": "660e8400-...",
  "assigned_at": "2026-03-31T10:02:30.000Z",
  "status_history": [
    { "status": "queued", "at": "2026-03-31T10:00:00.000Z" },
    { "status": "assigned", "at": "2026-03-31T10:02:30.000Z" }
  ],
  "created_at": "2026-03-31T10:00:00.000Z",
  "updated_at": "2026-03-31T10:02:30.000Z"
}
```

Note: `credentials` is NEVER returned. Only `has_credentials: boolean`.

---

## DELETE /api/v1/test-cases/:id

Cancel a test case. Only allowed for `queued` or `assigned` status. Refunds credits.

**Response 200**:
```json
{
  "id": "550e8400-...",
  "status": "cancelled",
  "credits_refunded": 5
}
```

**Error 409** — Cannot cancel:
```json
{
  "error": {
    "code": "CANNOT_CANCEL",
    "message": "Test case cannot be cancelled because it is already in progress",
    "context": { "current_status": "in_progress" }
  }
}
```

---

## GET /api/v1/test-cases/:id/results

Get test results (partial or complete).

**Response 200** (completed):
```json
{
  "test_case_id": "550e8400-...",
  "status": "completed",
  "verdict": "fail",
  "summary": "2 of 3 steps passed. Checkout button unresponsive.",
  "steps_passed": 2,
  "steps_failed": 1,
  "steps_total": 3,
  "per_step_results": [
    {
      "step_index": 0,
      "instruction": "Navigate to product page",
      "status": "passed",
      "actual_behavior": "Product page loaded correctly",
      "screenshot_url": "https://s3.../screenshot-0.png",
      "notes": null
    },
    {
      "step_index": 1,
      "instruction": "Click Add to Cart",
      "status": "passed",
      "actual_behavior": "Item added to cart",
      "screenshot_url": null,
      "notes": null
    },
    {
      "step_index": 2,
      "instruction": "Complete checkout",
      "status": "failed",
      "severity": "critical",
      "actual_behavior": "Checkout button did not respond to click",
      "screenshot_url": "https://s3.../screenshot-2.png",
      "notes": "Tried on Chrome and Firefox, same result"
    }
  ],
  "recording_url": "https://s3.../recording.mp4",
  "completed_at": "2026-03-31T10:35:01.000Z"
}
```

**Response 200** (in progress — partial results):
```json
{
  "test_case_id": "550e8400-...",
  "status": "in_progress",
  "verdict": null,
  "summary": null,
  "steps_passed": 1,
  "steps_failed": 0,
  "steps_total": 3,
  "per_step_results": [
    { "step_index": 0, "status": "passed", "..." : "..." }
  ],
  "completed_at": null
}
```

**Error 404**: Test case not found or no results yet.
