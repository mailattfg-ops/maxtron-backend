/**
 * Polybag split: copy MAXTRON (Polybag) data from the current shared project
 * into the new Polybag-only project.
 *
 * - Source  (READ-ONLY): connection string in maxtron-backend/.env.source
 * - Target  (written):   connection string in maxtron-backend/.env.polybag
 *
 * Re-runnable: truncates all target tables first, keeps original ids,
 * syncs sequence values from source. Refuses to run against the source ref.
 *
 * Run: npx ts-node src/scripts/split/copy-polybag.ts
 */
import path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

const root = path.resolve(__dirname, '../../..');
const SOURCE_REF = 'jylkzihuozugqfjqvhhe';
const MAX = '739f66c9-4f5a-428f-984e-ac9e2e689b59'; // MAXTRON (Polybag)

function envUrl(file: string): string {
  const parsed = dotenv.config({ path: path.join(root, file), processEnv: {} as any });
  const url = parsed.parsed?.SUPABASE_DB_URL;
  if (!url) { console.error(`SUPABASE_DB_URL missing in ${file}`); process.exit(1); }
  return url;
}

// WHERE clause per table (alias x). Tables not listed and not keil_* make the
// script fail, so a future table can't be silently skipped on switch-over day.
const WHOLE = `true`;
const BY_COMPANY = `(x.company_id = '${MAX}' or x.company_id is null)`;
const FILTERS: Record<string, string> = {
  companies: `x.id = '${MAX}'`,
  permissions: WHOLE,
  departments: WHOLE,
  announcements: WHOLE,
  inventory: WHOLE,

  users: BY_COMPANY,
  user_types: BY_COMPANY,
  employee_categories: BY_COMPANY,
  employee_payroll: BY_COMPANY,
  attendance: BY_COMPANY,
  customers: BY_COMPANY,
  finished_products: BY_COMPANY,
  raw_materials: BY_COMPANY,
  rm_type_codes: BY_COMPANY,
  supplier_master: BY_COMPANY,
  vendor_registry: BY_COMPANY,
  marketing_visits: BY_COMPANY,
  marketing_visit_outcomes: BY_COMPANY,
  marketing_offers: BY_COMPANY,
  customer_orders: BY_COMPANY,
  sales_invoices: BY_COMPANY,
  sales_returns: BY_COMPANY,
  deliveries: BY_COMPANY,
  production_batches: BY_COMPANY,
  production_conversions: BY_COMPANY,
  production_wastage: BY_COMPANY,
  production_expenses: BY_COMPANY,
  production_packing: BY_COMPANY,
  production_printing: BY_COMPANY,
  trading_goods_inward: BY_COMPANY,
  vehicles: BY_COMPANY,
  hr_expenditures: BY_COMPANY,
  hr_expense_heads: BY_COMPANY,
  petty_cash: BY_COMPANY,
  customer_collections: BY_COMPANY,
  customer_collection_allocations: BY_COMPANY,
  supplier_payments: BY_COMPANY,
  supplier_payment_allocations: BY_COMPANY,
  purchase_entries: BY_COMPANY,
  purchase_returns: BY_COMPANY,
  rm_orders: BY_COMPANY,
  material_consumptions: BY_COMPANY,

  customer_order_items: `exists (select 1 from customer_orders p where p.id = x.order_id and p.company_id = '${MAX}')`,
  sales_invoice_items: `exists (select 1 from sales_invoices p where p.id = x.invoice_id and p.company_id = '${MAX}')`,
  sales_return_items: `exists (select 1 from sales_returns p where p.id = x.return_id and p.company_id = '${MAX}')`,
  delivery_items: `exists (select 1 from deliveries p where p.id = x.delivery_id and p.company_id = '${MAX}')`,
  rm_order_items: `exists (select 1 from rm_orders p where p.id = x.order_id and p.company_id = '${MAX}')`,
  purchase_entry_items: `exists (select 1 from purchase_entries p where p.id = x.entry_id and p.company_id = '${MAX}')`,
  production_conversion_items: `exists (select 1 from production_conversions p where p.id = x.conversion_id and p.company_id = '${MAX}')`,
  production_batch_items: `exists (select 1 from production_batches p where p.id = x.batch_id and p.company_id = '${MAX}')`,
  supplier_materials: `exists (select 1 from supplier_master p where p.id = x.supplier_id and p.company_id = '${MAX}')`,
  role_permissions: `exists (select 1 from user_types p where p.id = x.role_id and (p.company_id = '${MAX}' or p.company_id is null))`,

  // employee children: only rows linked to a Polybag user (NULL employee_id rows
  // stay behind — owner-approved default, see supabase/SPLIT-MAPPING.md)
  employee_qualifications: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_experiences: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_certificates: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_licenses: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_passports: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_loans: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_suspenses: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_targets: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_incentive_slabs: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,
  employee_insurances: `exists (select 1 from users p where p.id = x.employee_id and p.company_id = '${MAX}')`,

  // owner/customer/company link, or referenced as a Polybag supplier/vendor address
  addresses: `(
       exists (select 1 from users p where p.id = x.user_id and p.company_id = '${MAX}')
    or exists (select 1 from customers p where p.id = x.customer_id and p.company_id = '${MAX}')
    or x.company_id = '${MAX}'
    or exists (select 1 from supplier_master p where (p.supplier_address_id = x.id or p.billing_address_id = x.id) and p.company_id = '${MAX}')
    or exists (select 1 from vendor_registry p where (p.office_address_id = x.id or p.billing_address_id = x.id) and p.company_id = '${MAX}')
  )`,
};

async function main() {
  const srcUrl = envUrl('.env.source');
  const tgtUrl = envUrl('.env.polybag');
  if (tgtUrl.includes(SOURCE_REF)) {
    console.error('SAFETY STOP: .env.polybag points at the SOURCE project. Aborting.');
    process.exit(1);
  }

  const src = new Client({ connectionString: srcUrl, ssl: { rejectUnauthorized: false } });
  const tgt = new Client({ connectionString: tgtUrl, ssl: { rejectUnauthorized: false } });
  await src.connect();
  await tgt.connect();
  await src.query('SET default_transaction_read_only = on');
  await src.query("SET statement_timeout = '300s'");
  await tgt.query("SET statement_timeout = '300s'");

  const tables: string[] = (await src.query(
    "select tablename from pg_tables where schemaname='public' order by tablename"
  )).rows.map(r => r.tablename);

  const unknown = tables.filter(t => !FILTERS[t] && !t.startsWith('keil_'));
  if (unknown.length) {
    console.error('Unclassified tables (add them to FILTERS first):', unknown.join(', '));
    process.exit(1);
  }
  const tgtTables: string[] = (await tgt.query(
    "select tablename from pg_tables where schemaname='public' order by tablename"
  )).rows.map(r => r.tablename);
  const missing = tables.filter(t => !tgtTables.includes(t));
  if (missing.length) {
    console.error('Target is missing tables (apply schema.sql first):', missing.join(', '));
    process.exit(1);
  }

  // FK handling on target: replica mode if allowed, else disable triggers per table
  let replicaMode = true;
  try { await tgt.query("SET session_replication_role = 'replica'"); }
  catch { replicaMode = false; console.log('replica mode unavailable; falling back to DISABLE TRIGGER ALL'); }

  console.log(`truncating ${tgtTables.length} target tables...`);
  await tgt.query(`TRUNCATE ${tgtTables.map(t => `"${t}"`).join(', ')} CASCADE`);

  const report: Array<{ table: string; src: number; copied: number; tgt: number }> = [];
  let failed = false;

  for (const t of tables) {
    const filter = t.startsWith('keil_') ? 'false' : FILTERS[t];
    const srcCount = Number((await src.query(
      `select count(*) n from "${t}" x where ${filter}`
    )).rows[0].n);

    let copied = 0;
    if (srcCount > 0) {
      // non-generated columns on the target
      const cols: string[] = (await tgt.query(`
        select a.attname from pg_attribute a
        join pg_class c on c.oid = a.attrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname='public' and c.relname=$1
          and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
        order by a.attnum`, [t])).rows.map(r => `"${r.attname}"`);

      const rows = (await src.query(
        `select to_jsonb(x)::text j from "${t}" x where ${filter}`
      )).rows.map(r => r.j);

      if (!replicaMode) await tgt.query(`ALTER TABLE "${t}" DISABLE TRIGGER ALL`);
      for (let i = 0; i < rows.length; i += 1000) {
        const batch = `[${rows.slice(i, i + 1000).join(',')}]`;
        const res = await tgt.query(
          `insert into "${t}" (${cols.join(',')})
           select ${cols.join(',')} from jsonb_populate_recordset(null::"${t}", $1::jsonb)`,
          [batch]
        );
        copied += res.rowCount ?? 0;
      }
      if (!replicaMode) await tgt.query(`ALTER TABLE "${t}" ENABLE TRIGGER ALL`);
    }

    const tgtCount = Number((await tgt.query(`select count(*) n from "${t}"`)).rows[0].n);
    report.push({ table: t, src: srcCount, copied, tgt: tgtCount });
    if (tgtCount !== srcCount) failed = true;
    console.log(`${t}: source=${srcCount} copied=${copied} target=${tgtCount}${tgtCount !== srcCount ? '  << MISMATCH' : ''}`);
  }

  console.log('syncing sequences...');
  const seqs = (await src.query(
    'select sequencename, last_value from pg_sequences where schemaname=$1 and last_value is not null',
    ['public']
  )).rows;
  for (const s of seqs) {
    await tgt.query(`select setval($1, $2, true)`, [`public.${s.sequencename}`, s.last_value]);
    console.log(`  ${s.sequencename} -> ${s.last_value}`);
  }

  await src.end();
  await tgt.end();

  const total = report.reduce((a, r) => a + r.tgt, 0);
  console.log(`\ndone: ${total} rows on target across ${report.length} tables.`);
  if (failed) { console.error('ONE OR MORE TABLES MISMATCHED.'); process.exit(1); }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
