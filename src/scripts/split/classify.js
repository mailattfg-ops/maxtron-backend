// Step 1b: read-only checks that classify child tables by parent company and
// hunt for cross-company references. Prints a compact report, writes nothing.
const path = require('path');
const { Client } = require('pg');
const root = path.resolve(__dirname, '../../..');
require('dotenv').config({ path: path.join(root, '.env.source') });

const MAX = '739f66c9-4f5a-428f-984e-ac9e2e689b59'; // MAXTRON (Polybag)
const KEIL = '5be36c2a-c42e-4469-8551-115ede9ca728';

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  const q = async (label, sql) => {
    const r = await c.query(sql);
    console.log(`== ${label}`);
    console.table ? console.log(JSON.stringify(r.rows)) : null;
  };

  await q('addresses by owner', `
    select case
      when a.user_id is not null then 'user:' || coalesce(u.company_id::text,'none')
      when a.customer_id is not null then 'cust:' || coalesce(cu.company_id::text,'none')
      when a.company_id is not null then 'direct:' || a.company_id::text
      else 'unlinked' end as owner, count(*)::int n
    from addresses a
    left join users u on u.id=a.user_id
    left join customers cu on cu.id=a.customer_id
    group by 1 order by 1`);

  const parentSplits = [
    ['customer_order_items', 'customer_orders', 'order_id'],
    ['sales_invoice_items', 'sales_invoices', 'invoice_id'],
    ['delivery_items', 'deliveries', 'delivery_id'],
    ['sales_return_items', 'sales_returns', 'return_id'],
    ['rm_order_items', 'rm_orders', 'order_id'],
    ['purchase_entry_items', 'purchase_entries', 'entry_id'],
    ['production_conversion_items', 'production_conversions', 'conversion_id'],
    ['production_batch_items', 'production_batches', 'batch_id'],
    ['customer_collection_allocations', 'customer_collections', 'collection_id'],
    ['supplier_payment_allocations', 'supplier_payments', 'payment_id'],
  ];
  for (const [child, parent, fk] of parentSplits) {
    await q(`${child} via ${parent}`, `
      select coalesce(p.company_id::text,'NULL') company, count(*)::int n
      from "${child}" ch left join "${parent}" p on p.id=ch."${fk}"
      group by 1 order by 1`);
  }

  await q('employee children summed', `
    select tbl, coalesce(u.company_id::text,'orphan') company, sum(n)::int total from (
      select 'employee_qualifications' tbl, employee_id, count(*) n from employee_qualifications group by 2
      union all select 'employee_experiences', employee_id, count(*) from employee_experiences group by 2
      union all select 'employee_certificates', employee_id, count(*) from employee_certificates group by 2
      union all select 'employee_licenses', employee_id, count(*) from employee_licenses group by 2
      union all select 'employee_loans', employee_id, count(*) from employee_loans group by 2
      union all select 'employee_suspenses', employee_id, count(*) from employee_suspenses group by 2
      union all select 'employee_targets', employee_id, count(*) from employee_targets group by 2
      union all select 'employee_incentive_slabs', employee_id, count(*) from employee_incentive_slabs group by 2
      union all select 'employee_insurances', employee_id, count(*) from employee_insurances group by 2
    ) raw left join users u on u.id=raw.employee_id
    group by 1,2 order by 1,2`);

  await q('role_permissions via user_types', `
    select coalesce(ut.company_id::text,'NULL') company, count(*)::int n
    from role_permissions rp left join user_types ut on ut.id=rp.role_id
    group by 1 order by 1`);

  await q('supplier_materials via supplier', `
    select coalesce(sm.company_id::text,'NULL') company, count(*)::int n
    from supplier_materials s left join supplier_master sm on sm.id=s.supplier_id
    group by 1 order by 1`);

  await q('keil_collection_entries via header', `
    select coalesce(h.company_id::text,'NULL') company, count(*)::int n
    from keil_collection_entries e left join keil_collection_headers h on h.id=e.header_id
    group by 1 order by 1`);

  await q('marketing_visit_outcomes rows', `
    select coalesce(company_id::text,'NULL') company, name from marketing_visit_outcomes order by 1,2`);

  await q('polybag users with keil branch refs', `
    select count(*) filter (where branch_id is not null)::int branch_id_set,
           count(*) filter (where branch_ids is not null and array_length(branch_ids,1) > 0)::int branch_ids_set,
           count(*)::int total
    from users where company_id='${MAX}'`);

  await q('polybag users type/category sanity', `
    select
      count(*) filter (where ut.company_id is distinct from u.company_id)::int type_other_company,
      count(*) filter (where ec.company_id is not null and ec.company_id <> u.company_id)::int cat_other_company,
      count(*) filter (where u.type is null)::int no_type
    from users u
    left join user_types ut on ut.id=u.type
    left join employee_categories ec on ec.id=u.category_id
    where u.company_id='${MAX}'`);

  await q('cross-company product refs in polybag chains', `
    select 'order_items' src, count(*)::int n from customer_order_items i
      join customer_orders o on o.id=i.order_id and o.company_id='${MAX}'
      join finished_products fp on fp.id=i.product_id and fp.company_id='${KEIL}'
    union all
    select 'invoice_items', count(*) from sales_invoice_items i
      join sales_invoices s on s.id=i.invoice_id and s.company_id='${MAX}'
      join finished_products fp on fp.id=i.product_id and fp.company_id='${KEIL}'
    union all
    select 'batch_items', count(*) from production_batch_items i
      join production_batches b on b.id=i.batch_id and b.company_id='${MAX}'
      join finished_products fp on fp.id=i.product_id and fp.company_id='${KEIL}'
    union all
    select 'return_items', count(*) from sales_return_items i
      join sales_returns r on r.id=i.return_id and r.company_id='${MAX}'
      join finished_products fp on fp.id=i.product_id and fp.company_id='${KEIL}'
    union all
    select 'trading_goods_product', count(*) from trading_goods_inward t
      join finished_products fp on fp.id=t.product_id and fp.company_id='${KEIL}'
      where t.company_id='${MAX}'`);

  await q('marketing_visits cross-company customers', `
    select count(*)::int n from marketing_visits mv
    join customers cu on cu.id=mv.customer_id
    where mv.company_id='${MAX}' and cu.company_id<>'${MAX}'`);

  await q('polybag money totals (source of truth for verify step)', `
    select 'sales_invoices' t, coalesce(sum(net_amount),0)::text total from sales_invoices where company_id='${MAX}'
    union all select 'purchase_entries', coalesce(sum(total_amount),0)::text from purchase_entries where company_id='${MAX}'
    union all select 'customer_collections', coalesce(sum(amount),0)::text from customer_collections where company_id='${MAX}'
    union all select 'supplier_payments', coalesce(sum(amount),0)::text from supplier_payments where company_id='${MAX}'
    union all select 'customer_orders', coalesce(sum(net_amount),0)::text from customer_orders where company_id='${MAX}'`);

  await c.end();
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
