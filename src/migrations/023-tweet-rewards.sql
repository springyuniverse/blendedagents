-- Migration: Tweet-for-credits reward tracking
-- Feature: tweet-rewards

CREATE TABLE IF NOT EXISTS tweet_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id UUID NOT NULL REFERENCES builders(id),
  tweet_url TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One reward per builder
CREATE UNIQUE INDEX idx_tweet_rewards_builder_unique
  ON tweet_rewards (builder_id) WHERE status = 'credited';

CREATE INDEX idx_tweet_rewards_created
  ON tweet_rewards (created_at DESC);

ALTER TABLE tweet_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY tweet_rewards_builder_select ON tweet_rewards
  FOR SELECT
  USING (builder_id = current_setting('app.current_builder_id', true)::uuid);
