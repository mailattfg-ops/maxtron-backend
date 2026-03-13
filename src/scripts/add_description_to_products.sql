-- Migration to add description to finished_products
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS description TEXT;
