# Contract: Templates API

**Version**: 1.0.0 | **Feature**: 002-test-case-api

All endpoints require builder authentication via `Authorization: Bearer ba_sk_<key>`.

---

## POST /api/v1/templates

Create a reusable test template.

**Request Body**:
```json
{
  "title": "Login Flow Template",
  "description": "Standard login flow verification",
  "staging_url": "https://staging.example.com/login",
  "steps": [
    { "instruction": "Navigate to login page", "expected": "Login form visible" },
    { "instruction": "Enter credentials", "expected": "Form accepts input" },
    { "instruction": "Submit login", "expected": "Redirect to dashboard" }
  ],
  "expected_behavior": "User can log in with valid credentials",
  "environment": "staging",
  "tags": ["auth", "login"]
}
```

**Response 201**:
```json
{
  "id": "770e8400-...",
  "title": "Login Flow Template",
  "steps_count": 3,
  "created_at": "2026-03-31T10:00:00.000Z"
}
```

---

## GET /api/v1/templates

List builder's templates.

**Response 200**:
```json
{
  "templates": [
    {
      "id": "770e8400-...",
      "title": "Login Flow Template",
      "description": "Standard login flow verification",
      "steps_count": 3,
      "created_at": "2026-03-31T10:00:00.000Z",
      "updated_at": "2026-03-31T10:00:00.000Z"
    }
  ]
}
```

---

## GET /api/v1/templates/:id

Get full template details.

**Response 200**: Full template object with all fields.

---

## PUT /api/v1/templates/:id

Update a template.

**Request Body**: Any subset of template fields (title, description, staging_url, steps, expected_behavior, environment, tags).

**Response 200**: Updated template object.

---

## DELETE /api/v1/templates/:id

Delete a template. Previously created test cases are unaffected.

**Response 200**:
```json
{
  "message": "Template deleted successfully"
}
```

---

## POST /api/v1/templates/:id/use

Create a test case from a template with optional overrides. Reserves credits.

**Request Body** (all fields optional — override template values):
```json
{
  "title": "Login Flow - Sprint 42",
  "staging_url": "https://staging-v42.example.com/login",
  "credentials": { "username": "test@example.com", "password": "pass123" },
  "external_id": "SPRINT-42-LOGIN"
}
```

**Response 201**: Same shape as POST /api/v1/test-cases response.

**Validation**: Same rules as direct test case creation apply (must have at least 1 step after merge, etc.).

**Error 400**: INSUFFICIENT_CREDITS if builder can't afford the merged test case.
