# Contract: Tester API

**Feature**: 004-tester-dashboard
**Date**: 2026-03-30
**Base Path**: `/api/v1/tester`

## Authentication

All endpoints require tester session authentication via `@fastify/session` cookies. The `testerAuthPlugin` middleware validates the session and attaches the tester to `request.tester`.

## Endpoints

### GET /api/v1/tester/tasks

List assigned tasks for the authenticated tester.

**Response** `200 OK`:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Test login flow on staging",
      "description": "Verify the login flow works correctly...",
      "url": "https://staging.example.com",
      "status": "assigned",
      "step_count": 5,
      "environment": "Chrome 120, macOS",
      "assigned_at": "2026-03-30T10:00:00Z"
    }
  ]
}
```

**Notes**: Never includes credentials in list view. Only returns tasks with status `assigned` or `in_progress`.

---

### GET /api/v1/tester/tasks/:id

Get full task details. Credentials are only included if the test has been started (status is `in_progress`).

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "title": "Test login flow on staging",
  "description": "Verify the login flow works correctly...",
  "url": "https://staging.example.com",
  "status": "assigned",
  "steps": [
    { "instruction": "Navigate to the login page", "expected": "Login form is displayed" },
    { "instruction": "Enter valid credentials", "expected": "Credentials are accepted" }
  ],
  "expected_behavior": "User should be able to log in successfully",
  "environment": "Chrome 120, macOS",
  "has_credentials": true,
  "credentials": null,
  "assigned_at": "2026-03-30T10:00:00Z",
  "step_results": []
}
```

**Notes**: `credentials` is `null` until the test is started. `step_results` contains any previously submitted step results (for resume support).

**Errors**:
- `403 FORBIDDEN` -- Task is not assigned to this tester
- `404 NOT_FOUND` -- Task does not exist

---

### POST /api/v1/tester/tasks/:id/start

Start test execution. Transitions task from `assigned` to `in_progress`.

**Response** `200 OK`:
```json
{
  "status": "in_progress",
  "credentials": {
    "username": "test@example.com",
    "password": "secret123"
  }
}
```

**Notes**: Uses `AssignmentService.acceptAssignment()` internally. Returns decrypted credentials on success.

**Errors**:
- `403 FORBIDDEN` -- Task is not assigned to this tester
- `409 CANNOT_ACCEPT` -- Task is not in `assigned` status

---

### POST /api/v1/tester/tasks/:id/steps/:index

Submit a result for a single step.

**Request Body**:
```json
{
  "status": "failed",
  "severity": "major",
  "actual_behavior": "Login button does not respond to clicks",
  "screenshot_url": "screenshots/2026-03-30/uuid/step-2-failure.png",
  "notes": "Tried multiple browsers"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| status | string | Yes | `passed`, `failed`, `blocked`, `skipped` |
| severity | string | If failed | `critical`, `major`, `minor`, `cosmetic` |
| actual_behavior | string | If failed | Description of what happened |
| screenshot_url | string | If failed | S3 key from presigned upload |
| notes | string | No | Additional context |

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "step_index": 2,
  "status": "failed",
  "severity": "major",
  "created_at": "2026-03-30T10:15:00Z"
}
```

**Errors**:
- `400 BAD_REQUEST` -- Invalid step index, missing required fields for failure
- `403 FORBIDDEN` -- Task is not assigned to this tester
- `409 CONFLICT` -- Task is not in `in_progress` status

---

### POST /api/v1/tester/tasks/:id/submit

Submit the completed test with summary and verdict.

**Request Body**:
```json
{
  "verdict": "fail",
  "summary": "Login flow has a critical bug where the submit button is unresponsive on Chrome.",
  "recording_url": "recordings/2026-03-30/uuid/chunk-0.webm"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| verdict | string | Yes | `pass`, `fail`, `partial`, `blocked` |
| summary | string | Yes | 1-3 sentences |
| recording_url | string | No | S3 key for screen recording |

**Response** `200 OK`:
```json
{
  "status": "completed"
}
```

**Notes**: Validates that all steps have submitted results before allowing submission. Uses `AssignmentService.submitResults()` internally.

**Errors**:
- `400 BAD_REQUEST` -- Not all steps have results, missing summary/verdict
- `403 FORBIDDEN` -- Task is not assigned to this tester
- `409 CANNOT_SUBMIT` -- Task is not in `in_progress` status

---

### POST /api/v1/tester/upload/presign

Get a presigned S3 URL for direct file upload.

**Request Body**:
```json
{
  "type": "screenshot",
  "test_case_id": "uuid",
  "filename": "step-2-failure.png",
  "content_type": "image/png"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | string | Yes | `screenshot` or `recording` |
| test_case_id | string | Yes | Associated test case |
| filename | string | Yes | Original filename |
| content_type | string | Yes | MIME type |

**Response** `200 OK`:
```json
{
  "upload_url": "https://s3.amazonaws.com/blendedagents-uploads/screenshots/...",
  "key": "screenshots/2026-03-30/uuid/step-2-failure.png",
  "expires_in": 3600
}
```

---

### GET /api/v1/tester/profile

Get the authenticated tester's profile.

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "display_name": "Jane Tester",
  "email": "jane@example.com",
  "avatar_url": null,
  "skills": ["web", "mobile"],
  "languages": ["en", "es"],
  "region": "us-west",
  "is_available": true,
  "timezone": "America/Los_Angeles",
  "tasks_total": 42,
  "tasks_completed": 38,
  "avg_completion_minutes": 22,
  "earnings_cents": 95000,
  "created_at": "2026-01-15T08:00:00Z"
}
```

---

### PUT /api/v1/tester/profile

Update profile fields.

**Request Body**:
```json
{
  "display_name": "Jane Q. Tester",
  "timezone": "America/New_York"
}
```

| Field | Type | Required |
|-------|------|----------|
| display_name | string | No |
| timezone | string | No |

**Response** `200 OK`: Updated profile object (same shape as GET).

---

### PUT /api/v1/tester/availability

Toggle tester availability.

**Request Body**:
```json
{
  "is_available": false
}
```

**Response** `200 OK`:
```json
{
  "is_available": false
}
```

---

### GET /api/v1/tester/earnings

Get earnings history for the authenticated tester.

**Response** `200 OK`:
```json
{
  "total_earnings_cents": 95000,
  "earnings": [
    {
      "id": "uuid",
      "test_case_id": "uuid",
      "amount_cents": 250,
      "status": "completed",
      "created_at": "2026-03-28T14:00:00Z"
    }
  ]
}
```
