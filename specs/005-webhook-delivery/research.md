# Research: Webhook Delivery

**Feature**: 005-webhook-delivery | **Date**: 2026-03-30

## Research Decisions

### 1. HMAC-SHA256 Signing

**Decision**: Use Node.js built-in `crypto.createHmac('sha256', secret).update(payload).digest('hex')`.

**Rationale**:
- No external dependencies required; Node.js `crypto` module is stable and well-tested.
- HMAC-SHA256 is the industry standard for webhook signing (used by GitHub, Stripe, Slack).
- The signature is included in the `X-BlendedAgents-Signature` header with the format `sha256=<hex>`.
- Builders verify by computing the same HMAC over the raw request body using their stored secret.

**Alternatives considered**:
- Ed25519 asymmetric signing: More complex, requires key pair management, overkill for webhook verification.
- HMAC-SHA512: Slightly more secure but SHA-256 is sufficient and more widely supported.

### 2. Retry Strategy

**Decision**: pg-boss jobs with `startAfter` delays. 3 retries maximum.

**Schedule**:
| Attempt | Delay | startAfter |
|---------|-------|------------|
| 1 (initial) | Immediate | 0 |
| 2 (retry 1) | 1 minute | 60s |
| 3 (retry 2) | 5 minutes | 300s |
| 4 (retry 3) | 30 minutes | 1800s |

**Rationale**:
- pg-boss is already used for payout scheduling; no new infrastructure needed.
- Exponential-ish backoff gives transient failures time to resolve without excessive delay.
- 3 retries is standard practice (GitHub uses 3, Stripe uses up to 7 but that's excessive for test results).
- Each attempt is recorded as an update to the WebhookDelivery row (attempt_count, response_status, response_body).
- After final failure, the delivery is marked with `next_retry_at = null` and no further attempts.

**Failure criteria**: HTTP status >= 400 or network error (timeout after 10s).
**Success criteria**: HTTP status 2xx.

### 3. Machine Summary Confidence Score

**Decision**: Start at 1.0, subtract penalties per failed/blocked step.

**Penalty schedule**:
| Severity | Penalty |
|----------|---------|
| critical | -0.40 |
| major | -0.20 |
| minor | -0.10 |
| suggestion | -0.05 |
| blocked | -0.15 |

**Rationale**:
- Simple, deterministic formula. No ML or heuristics.
- A single critical failure drops confidence to 0.6, which is meaningful but not zero (other steps may still provide useful signal).
- Multiple failures accumulate: 2 critical failures = 0.2 confidence.
- Floor at 0.0 (no negative confidence).
- Rounding to 2 decimal places for clean output.

**Verdict derivation**: Uses the test_result verdict directly (pass/fail/partial/blocked). The confidence score adds granularity beyond the binary verdict.

### 4. Payload Assembly

**Decision**: Build payload at delivery time from live database state.

**Components loaded**:
1. `test_cases` table: id, external_id, template_id, steps
2. `step_results` table: per-step status, severity, actual_behavior, screenshots
3. `test_results` table: verdict, summary, step counts, recording_url
4. `builders` table: webhook_url, webhook_secret

**Rationale**:
- Building at delivery time ensures the payload reflects the latest data (e.g., if a recording URL is added after initial completion).
- The payload is stored in the webhook_deliveries row for debugging/replay.
- Sensitive fields (credentials, API keys) are explicitly excluded from the payload.

**Payload size**: Estimated 2-10 KB per delivery. Well within typical webhook size limits.
