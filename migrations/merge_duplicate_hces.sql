-- One hospital registered more than once: the same AFF NO and the same name,
-- ignoring case, spaces, punctuation and vowels ("Cherthala Thaluk" is
-- "CHERTHALA TALUK"), in any branches. The route sheet upload made such copies
-- when a route's branch was not the one its hospitals are registered under.
-- AFF NOs are numbered per branch, so the same number with a different name is
-- a different hospital and is left alone.
--
-- The oldest record of each hospital is kept; the copies' route links and
-- collections move to it, then the copies go. Run in the Supabase SQL Editor.

-- STEP 1 (only reads): highlight this query and Run it to see what step 2 would do.
WITH h AS (
    SELECT h.*, b.branch_name,
           regexp_replace(trim(h.hce_code), '^0+(?=\d)|\.0+$', '', 'g') AS aff_no,
           regexp_replace(lower(h.hce_name), '[^a-z0-9]|[aeiouhy]', '', 'g') AS name_key
    FROM keil_hces h
    LEFT JOIN keil_branches b ON b.id = h.branch_id
)
SELECT aff_no, hce_name, hce_place, branch_name, created_at::date AS added,
       (SELECT count(*) FROM keil_route_assignments a WHERE a.hce_id = h.id) AS route_links,
       (SELECT count(*) FROM keil_collection_entries e WHERE e.hce_id = h.id) AS collections,
       CASE WHEN row_number() OVER (PARTITION BY company_id, aff_no, name_key ORDER BY created_at, id) = 1
            THEN 'KEEP' ELSE 'merge into KEEP' END AS step_2
FROM h
WHERE (company_id, aff_no, name_key) IN (
    SELECT company_id, aff_no, name_key FROM h GROUP BY 1, 2, 3 HAVING count(*) > 1)
ORDER BY aff_no, name_key, created_at, id;

-- STEP 2 (changes data): run this block after checking step 1.
BEGIN;

CREATE TEMP TABLE hce_merge ON COMMIT DROP AS
SELECT id AS dup_id, keep_id FROM (
    SELECT id, first_value(id) OVER (
        PARTITION BY company_id,
                     regexp_replace(trim(hce_code), '^0+(?=\d)|\.0+$', '', 'g'),
                     regexp_replace(lower(hce_name), '[^a-z0-9]|[aeiouhy]', '', 'g')
        ORDER BY created_at, id) AS keep_id
    FROM keil_hces
) g
WHERE id <> keep_id;

UPDATE keil_route_assignments a SET hce_id = m.keep_id
FROM hce_merge m WHERE a.hce_id = m.dup_id;

-- A collection moves unless the kept record already has an entry in that day's batch
UPDATE keil_collection_entries e SET hce_id = m.keep_id
FROM hce_merge m
WHERE e.hce_id = m.dup_id
  AND NOT EXISTS (SELECT 1 FROM keil_collection_entries k WHERE k.header_id = e.header_id AND k.hce_id = m.keep_id);

-- A copy still named by a collection entry stays (step 1 lists it again)
DELETE FROM keil_hces h
USING hce_merge m
WHERE h.id = m.dup_id
  AND NOT EXISTS (SELECT 1 FROM keil_collection_entries e WHERE e.hce_id = h.id);

COMMIT;
