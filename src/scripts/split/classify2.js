// Step 1c: read-only follow-ups — unlinked addresses and employee-child orphans.
const path = require('path');
const { Client } = require('pg');
const root = path.resolve(__dirname, '../../..');
require('dotenv').config({ path: path.join(root, '.env.source') });

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  const q = async (label, sql) => {
    const r = await c.query(sql);
    console.log(`== ${label}`);
    console.log(JSON.stringify(r.rows));
  };

  await q('unlinked addresses referenced by suppliers', `
    with unlinked as (
      select id from addresses where user_id is null and customer_id is null and company_id is null
    )
    select coalesce(sm.company_id::text,'not-referenced') ref_by, count(distinct ul.id)::int n
    from unlinked ul
    left join supplier_master sm
      on sm.supplier_address_id = ul.id or sm.billing_address_id = ul.id
    group by 1 order by 1`);

  await q('employee child rows: null vs dangling employee_id', `
    select tbl,
      count(*) filter (where employee_id is null)::int null_emp,
      count(*) filter (where employee_id is not null and u.id is null)::int dangling,
      count(*) filter (where u.id is not null)::int linked
    from (
      select 'employee_qualifications' tbl, employee_id from employee_qualifications
      union all select 'employee_experiences', employee_id from employee_experiences
      union all select 'employee_certificates', employee_id from employee_certificates
      union all select 'employee_licenses', employee_id from employee_licenses
      union all select 'employee_loans', employee_id from employee_loans
      union all select 'employee_suspenses', employee_id from employee_suspenses
      union all select 'employee_targets', employee_id from employee_targets
      union all select 'employee_incentive_slabs', employee_id from employee_incentive_slabs
      union all select 'employee_insurances', employee_id from employee_insurances
    ) raw left join users u on u.id = raw.employee_id
    group by 1 order by 1`);

  await c.end();
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
