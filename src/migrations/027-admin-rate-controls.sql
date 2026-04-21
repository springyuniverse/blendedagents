-- 027: Admin rate controls + platform commission
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS platform_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 50.00;
ALTER TABLE regional_rates ADD COLUMN IF NOT EXISTS label TEXT;
UPDATE regional_rates SET label = INITCAP(REPLACE(region, '_', ' ')) WHERE label IS NULL;
