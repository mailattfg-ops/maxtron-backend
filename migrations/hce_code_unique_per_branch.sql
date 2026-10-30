-- HCE codes are numbered per branch: Ernakulam, Thiruvalla and Perinthalmanna
-- each keep their own series (all running from 1 to about 2380), so the same
-- number belongs to a different hospital in each branch. The old rule allowed a
-- code once per company, which refused a branch its own numbers whenever another
-- branch already had them ("keil_hces_hce_code_company_id_key").
--
-- Every link to an HCE uses its id, never its code, so nothing looks HCEs up
-- by code. Existing data already meets the new rule. Run in the Supabase SQL Editor.

ALTER TABLE keil_hces DROP CONSTRAINT IF EXISTS keil_hces_hce_code_company_id_key;
ALTER TABLE keil_hces ADD CONSTRAINT keil_hces_hce_code_branch_key UNIQUE (company_id, branch_id, hce_code);
