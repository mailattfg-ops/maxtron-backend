-- Update production_conversions table
ALTER TABLE production_conversions ADD COLUMN IF NOT EXISTS conversion_number VARCHAR(100) UNIQUE;
ALTER TABLE production_conversions ADD COLUMN IF NOT EXISTS shift VARCHAR(50);
ALTER TABLE production_conversions ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create production_conversion_items for multiple finished product entries
CREATE TABLE IF NOT EXISTS production_conversion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id UUID REFERENCES production_conversions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES finished_products(id),
    quantity NUMERIC(15, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_conversion_items_conv_id ON production_conversion_items(conversion_id);

-- Add Cutting & Sealing Category
INSERT INTO employee_categories (category_name) VALUES ('Cutting & Sealing') ON CONFLICT DO NOTHING;

-- Sequence for Cutting No (Manual generation if needed, or we can use a trigger)
-- For now, we will handle it in the model/controller or use a simple default.
ALTER TABLE production_conversions ALTER COLUMN conversion_number SET DEFAULT 'CUT-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval(pg_get_serial_sequence('production_conversions', 'id'))::text, 4, '0');
-- Wait, 'id' is UUID. We need a separate sequence.

CREATE SEQUENCE IF NOT EXISTS cutting_no_seq;
ALTER TABLE production_conversions ALTER COLUMN conversion_number SET DEFAULT 'CUT-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('cutting_no_seq')::text, 4, '0');
