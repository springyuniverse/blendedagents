-- 017: Add annotations_url to test_results
-- Stores the S3 key of a JSON annotation payload (timestamped strokes the
-- tester drew while recording). Resolved to a signed GET URL on read.

ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS annotations_url TEXT NULL;
