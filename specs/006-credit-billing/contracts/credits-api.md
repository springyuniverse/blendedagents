# Contract: Credits API

**Version**: 1.0.0 | **Feature**: 006-credit-billing

All endpoints require builder authentication via `Authorization: Bearer ba_sk_<key>` (from 001-foundation-auth).

---

## GET /api/v1/credits/balance

Retrieve the authenticated builder's current credit balance and usage summary.

**Request**: No body. No query parameters.

**Response 200**:
```json
{
  "available_credits": 93,
  "reserved_credits": 7,
  "total_credits_used": 150,
  "per_credit_rate": 0.49,
  "per_credit_rate_cents": 49
}
```

| Field | Type | Description |
|-------|------|-------------|
| available_credits | integer | Credits available to spend |
| reserved_credits | integer | Credits locked for in-progress tests |
| total_credits_used | integer | Lifetime credits consumed |
| per_credit_rate | number | Current per-credit rate in USD |
| per_credit_rate_cents | integer | Current per-credit rate in cents |

**Error Responses**:
- `401 Unauthorized` — Missing or invalid API key

---

## GET /api/v1/credits/transactions

List the authenticated builder's transaction history with filtering and pagination.

**Query Parameters**:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | string | No | all | Filter by type: `topup`, `charge`, `payout`, `commission`, `refund` |
| cursor | string | No | null | Keyset pagination cursor (ISO 8601 timestamp) |
| limit | integer | No | 20 | Page size (max 100) |

**Response 200**:
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "charge",
      "credit_amount": -7,
      "currency_amount": 3.43,
      "currency_amount_cents": 343,
      "description": "Test charge: 5-step test #abc123",
      "test_case_id": "660e8400-e29b-41d4-a716-446655440001",
      "created_at": "2026-03-30T14:22:00.000Z"
    }
  ],
  "next_cursor": "2026-03-29T10:00:00.000Z",
  "has_more": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| transactions | array | List of transaction objects |
| transactions[].id | string (UUID) | Transaction ID |
| transactions[].type | string | One of: topup, charge, payout, commission, refund |
| transactions[].credit_amount | integer | Credits affected (positive = granted, negative = consumed) |
| transactions[].currency_amount | number | USD amount |
| transactions[].currency_amount_cents | integer | USD amount in cents |
| transactions[].description | string | Human-readable description |
| transactions[].test_case_id | string (UUID) \| null | Related test case, if applicable |
| transactions[].created_at | string (ISO 8601) | Timestamp |
| next_cursor | string \| null | Cursor for next page, null if no more |
| has_more | boolean | Whether more results exist |

**Error Responses**:
- `401 Unauthorized` — Missing or invalid API key
- `400 Bad Request` — Invalid type filter or limit out of range

**Error Format**:
```json
{
  "error": {
    "code": "INVALID_FILTER",
    "message": "Invalid transaction type: 'foo'. Must be one of: topup, charge, payout, commission, refund.",
    "context": { "field": "type", "value": "foo" }
  }
}
```

---

## POST /api/v1/credits/topup

Initiate a credit purchase via Stripe Checkout. Returns a Stripe Checkout URL for the builder to complete payment.

**Request Body**:
```json
{
  "pack_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pack_id | string (UUID) | Yes | ID of the credit pack to purchase |

**Response 200**:
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_live_abc123...",
  "session_id": "cs_live_abc123",
  "pack": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "50 Credit Pack",
    "credit_amount": 50,
    "price": 24.50,
    "price_cents": 2450
  }
}
```

**Error Responses**:
- `401 Unauthorized` — Missing or invalid API key
- `400 Bad Request` — Invalid or inactive pack_id
- `409 Conflict` — Builder already has a pending purchase

**Error Format (409)**:
```json
{
  "error": {
    "code": "PURCHASE_PENDING",
    "message": "You already have a pending credit purchase. Please complete or wait for it to expire before starting a new one.",
    "context": { "existing_session_id": "cs_live_xyz789" }
  }
}
```

---

## GET /api/v1/credits/packs

List available credit packs for purchase.

**Request**: No body. No query parameters.

**Response 200**:
```json
{
  "packs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "10 Credit Pack",
      "credit_amount": 10,
      "price": 4.90,
      "price_cents": 490
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "50 Credit Pack",
      "credit_amount": 50,
      "price": 24.50,
      "price_cents": 2450
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "100 Credit Pack",
      "credit_amount": 100,
      "price": 49.00,
      "price_cents": 4900
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized` — Missing or invalid API key
