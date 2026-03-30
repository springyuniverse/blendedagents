-- Migration: Add stripe_customer_id to builders table
-- Feature: 006-credit-billing
-- Depends on: builders table from 001-foundation-auth

ALTER TABLE builders
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
