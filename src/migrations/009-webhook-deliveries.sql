-- 009: Webhook deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      UUID NOT NULL REFERENCES builders(id),
  test_case_id    UUID NOT NULL REFERENCES test_cases(id),
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  url             TEXT NOT NULL,
  response_status INTEGER NULL,
  response_body   TEXT NULL,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ NULL,
  delivered_at    TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_builder_created ON webhook_deliveries (builder_id, created_at DESC);
