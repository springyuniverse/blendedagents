# Contract: Health API

**Version**: 1.0.0 | **Feature**: 001-foundation-auth

---

## GET /health

Public endpoint (no authentication required). Returns service health status.

**Response 200** — Healthy:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime_seconds": 3600
}
```

**Response 503** — Unhealthy:
```json
{
  "status": "error",
  "database": "disconnected",
  "uptime_seconds": 3600
}
```

**SLA**: Must respond within 10 seconds of application start.
