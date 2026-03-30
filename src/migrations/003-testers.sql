-- 003: Testers table
CREATE TABLE IF NOT EXISTS testers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name           TEXT NOT NULL,
  email                  TEXT NOT NULL UNIQUE,
  avatar_url             TEXT NULL,
  skills                 JSONB NOT NULL DEFAULT '[]',
  languages              JSONB NOT NULL DEFAULT '[]',
  region                 TEXT NOT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  is_available           BOOLEAN NOT NULL DEFAULT false,
  current_task_id        UUID NULL,  -- FK added in 005 after test_cases exists
  tasks_total            INTEGER NOT NULL DEFAULT 0,
  tasks_completed        INTEGER NOT NULL DEFAULT 0,
  avg_completion_minutes NUMERIC(7,2) NOT NULL DEFAULT 0,
  earnings_cents         INTEGER NOT NULL DEFAULT 0,
  timezone               TEXT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_testers_updated_at
  BEFORE UPDATE ON testers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_testers_skills ON testers USING GIN (skills);
CREATE INDEX idx_testers_region_available ON testers (region, is_available) WHERE is_available = true;
