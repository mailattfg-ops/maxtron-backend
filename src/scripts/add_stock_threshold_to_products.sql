-- Migration to add stock_threshold to finished_products
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS stock_threshold NUMERIC DEFAULT 50;
