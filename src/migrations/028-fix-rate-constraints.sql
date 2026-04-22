-- 028: Remove restrictive CHECK constraints on regional_rates so admin can freely set rates
ALTER TABLE regional_rates DROP CONSTRAINT IF EXISTS regional_rates_base_pay_cents_min_base_cents_max_base_cents_check;
ALTER TABLE regional_rates DROP CONSTRAINT IF EXISTS regional_rates_check;
ALTER TABLE regional_rates DROP CONSTRAINT IF EXISTS regional_rates_check1;
ALTER TABLE regional_rates DROP CONSTRAINT IF EXISTS regional_rates_check2;
ALTER TABLE regional_rates ADD CONSTRAINT regional_rates_step_positive CHECK (per_step_rate_cents >= 0);
ALTER TABLE regional_rates ADD CONSTRAINT regional_rates_base_positive CHECK (base_pay_cents >= 0);
