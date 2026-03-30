# Contract: Webhook API

**Feature**: 005-webhook-delivery | **Date**: 2026-03-30

## Builder-Facing Endpoints

All endpoints require builder authentication via `Authorization: Bearer ba_sk_...` header.

---

### PUT /api/v1/webhook

Set or update the builder's webhook configuration.

**Request**:
```json
{
  "webhook_url": "https://example.com/webhook",
  "webhook_secret": "whsec_my_secret_key"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| webhook_url | string | yes | Must be a valid HTTPS URL |
| webhook_secret | string | yes | Min 16 characters |

**Response 200**:
```json
{
  "webhook_url": "https://example.com/webhook",
  "updated_at": "2026-03-30T12:00:00.000Z"
}
```

**Response 400**: Invalid URL or secret too short.
**Response 401**: Missing or invalid API key.

---

### POST /api/v1/webhook/ping

Send a test webhook to the configured URL. Uses the builder's stored webhook_url and webhook_secret.

**Request**: Empty body (no payload required).

**Response 200** (webhook delivered successfully):
```json
{
  "success": true,
  "status_code": 200,
  "response_time_ms": 150
}
```

**Response 200** (webhook delivery failed):
```json
{
  "success": false,
  "status_code": 500,
  "error": "Connection timeout"
}
```

**Response 400**: No webhook URL configured.
**Response 401**: Missing or invalid API key.

---

### GET /api/v1/webhook/history

List webhook delivery attempts for the authenticated builder.

**Query Parameters**:
| Param | Type | Default | Constraints |
|-------|------|---------|-------------|
| cursor | string (ISO8601) | null | Keyset pagination cursor |
| limit | integer | 20 | 1-100 |

**Response 200**:
```json
{
  "deliveries": [
    {
      "id": "uuid",
      "test_case_id": "uuid",
      "event_type": "test.completed",
      "url": "https://example.com/webhook",
      "response_status": 200,
      "attempt_count": 1,
      "delivered_at": "2026-03-30T12:00:00.000Z",
      "created_at": "2026-03-30T12:00:00.000Z"
    }
  ],
  "next_cursor": "2026-03-30T11:59:00.000Z",
  "has_more": true
}
```

**Response 401**: Missing or invalid API key.

---

## Webhook Payload Format

Delivered to the builder's configured `webhook_url` via HTTP POST.

**Headers**:
```
Content-Type: application/json
X-BlendedAgents-Signature: sha256=<hex_hmac>
X-BlendedAgents-Event: test.completed
X-BlendedAgents-Delivery: <delivery_id>
```

**Body**:
```json
{
  "event": "test.completed",
  "test_case_id": "uuid",
  "external_id": "string",
  "template_id": "uuid|null",
  "verdict": "pass|fail|partial|blocked",
  "summary": "string",
  "machine_summary": {
    "verdict": "fail",
    "confidence": 0.6,
    "passed_steps": [0, 1],
    "failed_steps": [
      {
        "index": 2,
        "severity": "critical",
        "actual_behavior": "Button did not respond to click",
        "evidence": ["https://storage.example.com/screenshot.png"]
      }
    ],
    "blocked_steps": [],
    "environment": { "browser": "Chrome 120", "os": "macOS 14" },
    "recording_url": "https://storage.example.com/recording.mp4",
    "execution_minutes": 12.5
  },
  "steps_passed": 2,
  "steps_failed": 1,
  "steps_blocked": 0,
  "steps_total": 3,
  "per_step_results": [
    {
      "step_index": 0,
      "status": "passed",
      "severity": null,
      "actual_behavior": null,
      "screenshot_url": null,
      "notes": null
    },
    {
      "step_index": 1,
      "status": "passed",
      "severity": null,
      "actual_behavior": null,
      "screenshot_url": null,
      "notes": null
    },
    {
      "step_index": 2,
      "status": "failed",
      "severity": "critical",
      "actual_behavior": "Button did not respond to click",
      "screenshot_url": "https://storage.example.com/screenshot.png",
      "notes": "Tried 3 times, button remains unresponsive"
    }
  ],
  "recording_url": "string|null",
  "environment": {},
  "credits_charged": 5,
  "result_url": "https://app.blendedagents.com/results/uuid",
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**Signature verification** (builder-side):
```javascript
const crypto = require('crypto');
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');
const isValid = expectedSignature === request.headers['x-blendedagents-signature'];
```

**Security**: The payload never includes builder credentials, API keys, test case credentials, or webhook secrets.
