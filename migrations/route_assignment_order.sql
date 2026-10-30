-- Route order: each route lists its facilities in a fixed order (the route
-- sheet's SL NO), and a facility can be on a route more than once, e.g. Mon &
-- Thu at one place in the order and Tue & Fri at another.
--
-- 1. Drop the one-link-per-facility-per-route rule.
-- 2. Number the existing links 1, 2, 3... per route in the order they were
--    added. Every link was still at the default 1, so no order is lost, and
--    the order they were added in matches the Ernakulam route sheets.
--
-- Nothing references a link's id, so collection history is untouched.
-- Run in the Supabase SQL Editor of the KEIL project.

ALTER TABLE keil_route_assignments DROP CONSTRAINT IF EXISTS keil_route_assignments_route_id_hce_id_key;

UPDATE keil_route_assignments a
SET sequence_order = n.position
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY route_id ORDER BY created_at, id) AS position
    FROM keil_route_assignments
) n
WHERE a.id = n.id;
