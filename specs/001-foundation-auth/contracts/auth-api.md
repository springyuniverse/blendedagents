# Contract: Auth API

**Version**: 1.0.0 | **Feature**: 001-foundation-auth

---

## Builder Authentication (API Key)

All builder-facing API endpoints (in other features) use this authentication scheme.

### Authentication Scheme

- **Header**: `Authorization: Bearer ba_sk_<64-hex-chars>`
- **Lookup**: SHA-256 hash of full key, query by `key_hash` (indexed)
- **Result**: `request.builder` is decorated with `{ id, display_name, email }`

### Error Responses

**401 Unauthorized** — Missing or invalid API key:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid API key",
    "context": {}
  }
}
```

**401 Unauthorized** — Revoked API key:
```json
{
  "error": {
    "code": "KEY_REVOKED",
    "message": "This API key has been revoked",
    "context": { "key_prefix": "ba_sk_a1b2" }
  }
}
```

**429 Too Many Requests** — Rate limit exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after the rate limit window resets.",
    "context": { "retry_after_seconds": 42 }
  }
}
```

**Headers on 429**:
- `Retry-After: <seconds>`
- `X-RateLimit-Limit: 100`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: <unix-timestamp>`

---

## Tester Authentication (Google OAuth2)

### GET /auth/google

Initiates Google OAuth2 login flow. Redirects to Google consent screen.

**Response**: `302 Redirect` to Google authorization URL

### GET /auth/google/callback

OAuth2 callback from Google. Exchanges code for access token, looks up/validates tester, creates session.

**Success Response**: `302 Redirect` to tester dashboard (`/dashboard`)

**Error Responses**:

**403 Forbidden** — Tester not found (not pre-vetted):
```json
{
  "error": {
    "code": "TESTER_NOT_FOUND",
    "message": "No account found for this email. Contact your administrator.",
    "context": {}
  }
}
```

**403 Forbidden** — Tester deactivated:
```json
{
  "error": {
    "code": "TESTER_DEACTIVATED",
    "message": "Your account has been deactivated. Contact your administrator.",
    "context": {}
  }
}
```

### GET /auth/me

Returns the authenticated tester's profile. Requires active session.

**Response 200**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "Ahmed Hassan",
  "email": "ahmed@example.com",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "region": "egypt",
  "is_available": true
}
```

**Error**: `401 Unauthorized` if session expired or missing.

### POST /auth/logout

Destroys the tester's session.

**Response 200**:
```json
{
  "message": "Logged out successfully"
}
```

---

## CORS Configuration

**Allowed Origins**: Configured via `ALLOWED_ORIGINS` env var (comma-separated).

**Rejected Origin Response** (403):
```json
{
  "error": {
    "code": "CORS_REJECTED",
    "message": "Origin not allowed",
    "context": { "origin": "https://unknown-site.com" }
  }
}
```
