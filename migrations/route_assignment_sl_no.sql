-- The SL NO a facility has on its route sheet, kept as the sheet gives it: a row
-- the upload skips (no AFF NO) leaves a gap (13, 16, 17...) instead of
-- renumbering the rows after it. Empty for links added by hand; those show
-- their place in the list. Run in the Supabase SQL Editor.

ALTER TABLE keil_route_assignments ADD COLUMN IF NOT EXISTS sl_no integer;
