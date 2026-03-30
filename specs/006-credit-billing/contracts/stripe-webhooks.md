# Contract: Stripe Webhook Handling

**Version**: 1.0.0 | **Feature**: 006-credit-billing

## POST /webhooks/stripe

Receives Stripe webhook events. This endpoint is NOT authenticated via API key — it uses Stripe signature verification.

**Authentication**: Stripe webhook signature verification via `stripe-signature` header and webhook endpoint secret.

---

## Supported Events

### checkout.session.completed

Triggered when a builder completes a credit pack purchase via Stripe Checkout.

**Processing Flow**:
1. Verify webhook signature using `stripe.webhooks.constructEvent()`
2. Extract `session.id` and `session.metadata.builder_id`
3. Look up credit pack by `session.metadata.pack_id`
4. In a single database transaction:
   a. INSERT transaction record (type: `topup`) with `stripe_session_id` = `session.id`
   b. UPDATE credit balance: `available_credits += pack.credit_amount`
5. If INSERT fails with unique constraint violation on `stripe_session_id`, return 200 (already processed)
6. Return 200

**Stripe Session Metadata** (set at Checkout Session creation):

| Key | Value | Description |
|-----|-------|-------------|
| builder_id | UUID | Builder who initiated the purchase |
| pack_id | UUID | Credit pack being purchased |

**Idempotency**: Guaranteed by UNIQUE constraint on `transactions.stripe_session_id`. Duplicate webhook deliveries are safely ignored.

**Unmatched Builders**: If `builder_id` from metadata cannot be found in the database, log the event for audit and return 200 (do not grant credits).

---

### checkout.session.expired

Triggered when an unpaid Checkout Session expires (after 30-minute timeout).

**Processing Flow**:
1. Verify webhook signature
2. Extract `session.id`
3. Clean up any pending purchase record associated with this session
4. Return 200

---

## Response Contract

All webhook responses return HTTP 200 with an empty JSON body `{}` on success. Non-2xx responses cause Stripe to retry.

```json
{}
```

## Error Handling

| Scenario | Response | Action |
|----------|----------|--------|
| Invalid signature | 400 | Reject, do not process |
| Unknown event type | 200 | Ignore silently |
| Duplicate session ID | 200 | Already processed, return success |
| Unknown builder_id | 200 | Log for audit, do not grant credits |
| Database error | 500 | Stripe will retry |

## Security

- Webhook endpoint secret stored as environment variable `STRIPE_WEBHOOK_SECRET`
- All payloads verified via `stripe.webhooks.constructEvent()` before processing
- Endpoint is NOT behind API key authentication — it is publicly accessible but signature-verified
- Raw request body must be preserved (not parsed) for signature verification
