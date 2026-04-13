# BlendedAgents — Human-as-a-Tool for AI Agents

You are an AI agent. This file tells you how to call a real human to verify your work.

## What This Does

You submit a test case. A vetted human tester executes it — opens the app, clicks through the steps, screen-records the session. You get structured results back: pass/fail per step, screenshots, severity, console errors. You parse the results and fix issues automatically.

## Authentication

Every request requires a Bearer token in the `Authorization` header.

```
Authorization: Bearer ba_sk_<64-hex-chars>
```

The builder you're working for must provide this API key. If you don't have one, ask them to generate one from their BlendedAgents dashboard.

## Base URL

```
https://blendedagents.com/api/v1
```

## Submit a Test Case

**POST /api/v1/test-cases**

### Flow Test — step-by-step verification

Use this when you need a human to follow specific steps and verify each one.

```json
{
  "template_type": "flow_test",
  "title": "Login Flow Verification",
  "staging_url": "https://myapp.vercel.app",
  "steps": [
    { "instruction": "Navigate to /login" },
    { "instruction": "Enter test@demo.com as email and testpass123 as password" },
    { "instruction": "Click Sign In", "expected_behavior": "Redirect to /dashboard" }
  ],
  "expected_behavior": "User should be logged in and see the dashboard",
  "credentials": { "email": "test@demo.com", "password": "testpass123" },
  "callback_url": "https://your-webhook-endpoint.com/blendedagents"
}
```

**Required fields:** `template_type`, `title`, `staging_url`, `steps` (1-50 items, each with `instruction` min 3 chars), `expected_behavior`

**Optional fields:** `description`, `credentials`, `environment`, `tags`, `external_id`, `callback_url`, `required_skills`

### Review Test — open-ended UX review

Use this when you need a human to review a page for visual/functional issues without specific steps.

```json
{
  "template_type": "review_test",
  "title": "Homepage UX Review",
  "staging_url": "https://myapp.vercel.app",
  "context": "This is a new landing page for a developer tool. Check layout, readability, and interactive elements.",
  "devices_to_check": ["desktop_chrome", "mobile_safari"],
  "focus_areas": ["layout", "typography", "functionality"],
  "callback_url": "https://your-webhook-endpoint.com/blendedagents"
}
```

**Required fields:** `template_type`, `title`, `staging_url`, `context` (10-1500 chars), `devices_to_check` (1-6 items)

**Allowed devices:** `desktop_chrome`, `desktop_firefox`, `desktop_safari`, `mobile_safari`, `mobile_android`, `tablet`

**Allowed focus areas:** `layout`, `typography`, `forms`, `images`, `content`, `functionality`

### Response (201 Created)

```json
{
  "id": "BA-1234",
  "short_id": "BA-1234",
  "status": "queued",
  "template_type": "flow_test",
  "credit_cost": 9,
  "created_at": "2026-04-13T10:00:00.000Z"
}
```

## Check Results

**GET /api/v1/test-cases/:id/results**

Returns partial results while in progress, full results when completed.

```json
{
  "test_case_id": "BA-1234",
  "status": "completed",
  "verdict": "fail",
  "summary": "2 of 3 steps passed. Sign In button unresponsive below 768px.",
  "steps_passed": 2,
  "steps_failed": 1,
  "steps_total": 3,
  "per_step_results": [
    {
      "step_index": 0,
      "instruction": "Navigate to /login",
      "status": "passed"
    },
    {
      "step_index": 1,
      "instruction": "Enter credentials",
      "status": "passed"
    },
    {
      "step_index": 2,
      "instruction": "Click Sign In",
      "status": "failed",
      "severity": "critical",
      "actual_behavior": "Button unresponsive below 768px. Console: TypeError at LoginButton.tsx:42",
      "screenshot_url": "https://..."
    }
  ],
  "recording_url": "https://..."
}
```

**Verdict values:** `pass`, `fail`, `partial`, `blocked`

**Severity values:** `critical`, `major`, `minor`, `cosmetic`

## Webhook (Recommended)

If you provide a `callback_url`, results are sent automatically when the test completes. No polling needed.

The webhook POST body has the same structure as the results endpoint, plus:

```json
{
  "event": "test.completed",
  "machine_summary": {
    "verdict": "fail",
    "confidence": 0.92,
    "passed_steps": [0, 1],
    "failed_steps": [
      {
        "index": 2,
        "severity": "critical",
        "actual_behavior": "Button unresponsive below 768px",
        "evidence": ["https://...screenshot.png"]
      }
    ],
    "recording_url": "https://...",
    "execution_minutes": 4.5
  },
  "credits_charged": 9
}
```

Use `machine_summary` for programmatic parsing. Use `summary` for human-readable context.

## Other Endpoints

**GET /api/v1/test-cases** — List all test cases. Supports `status`, `search`, `limit`, `cursor` query params.

**GET /api/v1/test-cases/:id** — Get test case details.

**DELETE /api/v1/test-cases/:id** — Cancel a queued or assigned test. Credits are refunded.

**GET /api/v1/credits/balance** — Check available credits.

## Credit Cost

**Flow test:** 3 + (number of steps x 2) credits. A 3-step test costs 9 credits.

**Review test:** 5 base + bonus per finding at completion. Critical: 5, Major: 3, Minor: 1.

## Rate Limits

100 requests per minute per API key. Check `X-RateLimit-Remaining` header.

## Error Handling

All errors return:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "context": { "field": "steps" }
  }
}
```

Common codes: `VALIDATION_ERROR`, `INSUFFICIENT_CREDITS`, `UNAUTHORIZED`, `RATE_LIMIT_EXCEEDED`, `CANNOT_CANCEL`

## Quick Start

1. Get an API key from the builder's dashboard
2. Submit a test case with the POST endpoint above
3. Either poll GET /results or set a `callback_url` for webhook delivery
4. Parse the structured results and fix issues
5. Resubmit if needed

The typical loop: **build a feature** -> **submit test** -> **parse results** -> **fix issues** -> **resubmit** -> **ship**
