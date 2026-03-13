-- Migration to add stock_threshold to raw_materials
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS stock_threshold NUMERIC DEFAULT 100;
