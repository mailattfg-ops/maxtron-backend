// Step 1 of the Polybag split: read-only inventory of the CURRENT project.
// Reads the connection string from maxtron-backend/.env.source, forces the
// session read-only, and writes supabase/inventory.json. Prints a summary.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '../../..');
require('dotenv').config({ path: path.join(root, '.env.source') });

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  await client.query('SET default_transaction_read_only = on');
  await client.query("SET statement_timeout = '120s'");

  const inv = {};
  const q = async (sql, params) => (await client.query(sql, params)).rows;

  inv.version = (await q('select version()'))[0].version;

  inv.companies = await q('select id, company_code, company_name from companies order by company_name');

  const tables = (await q(
    "select tablename from pg_tables where schemaname='public' order by tablename"
  )).map(r => r.tablename);

  const companyCols = new Set((await q(
    "select table_name from information_schema.columns where table_schema='public' and column_name='company_id'"
  )).map(r => r.table_name));

  inv.tables = {};
  for (const t of tables) {
    const total = Number((await q(`select count(*) n from "${t}"`))[0].n);
    const entry = { total };
    if (companyCols.has(t)) {
      entry.by_company = await q(
        `select company_id::text, count(*)::int n from "${t}" group by 1 order by 1 nulls first`
      );
    }
    inv.tables[t] = entry;
  }

  inv.foreign_keys = await q(`
    select
      con.conname,
      src.relname as src_table,
      (select string_agg(a.attname, ',') from unnest(con.conkey) k join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k) as src_cols,
      tgt.relname as tgt_table,
      (select string_agg(a.attname, ',') from unnest(con.confkey) k join pg_attribute a on a.attrelid=con.confrelid and a.attnum=k) as tgt_cols
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_class tgt on tgt.oid = con.confrelid
    join pg_namespace n on n.oid = src.relnamespace
    where con.contype='f' and n.nspname='public'
    order by src.relname, con.conname
  `);

  inv.views = await q("select viewname from pg_views where schemaname='public' order by viewname");
  inv.functions = await q(`
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' order by p.proname
  `);
  inv.triggers = await q(`
    select trigger_name, event_object_table, action_timing, event_manipulation
    from information_schema.triggers where trigger_schema='public'
    order by event_object_table, trigger_name
  `);
  inv.sequences = await q(`
    select sequencename, last_value from pg_sequences where schemaname='public' order by sequencename
  `);
  inv.extensions = await q('select extname, extversion from pg_extension order by extname');
  inv.rls_enabled = await q(
    "select tablename from pg_tables where schemaname='public' and rowsecurity order by tablename"
  );
  inv.policies = await q(
    "select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname='public' order by tablename, policyname"
  );
  inv.grants = await q(`
    select grantee, privilege_type, count(*)::int tables
    from information_schema.role_table_grants
    where table_schema='public' and grantee in ('anon','authenticated','service_role','postgres','PUBLIC')
    group by 1,2 order by 1,2
  `);
  // columns without company_id, used to trace split-by-parent chains
  inv.columns = await q(`
    select table_name, column_name, data_type, is_nullable, column_default is not null as has_default
    from information_schema.columns where table_schema='public'
    order by table_name, ordinal_position
  `);

  for (const [k, sql] of [
    ['auth_users', 'select count(*) n from auth.users'],
    ['storage_objects', 'select count(*) n from storage.objects'],
  ]) {
    try { inv[k] = Number((await q(sql))[0].n); } catch (e) { inv[k] = `error: ${e.message}`; }
  }

  await client.end();

  const outDir = path.join(root, 'supabase');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'inventory.json'), JSON.stringify(inv, null, 2));

  console.log(`tables: ${tables.length}, views: ${inv.views.length}, fks: ${inv.foreign_keys.length}`);
  console.log(`auth.users: ${inv.auth_users}, storage.objects: ${inv.storage_objects}`);
  console.log('companies:', inv.companies.map(c => `${c.company_name}=${c.id}`).join(' | '));
  for (const t of tables) {
    const e = inv.tables[t];
    const by = e.by_company ? ' [' + e.by_company.map(b => `${b.company_id ?? 'NULL'}:${b.n}`).join(' ') + ']' : '';
    console.log(`${t}: ${e.total}${by}`);
  }
  console.log('wrote supabase/inventory.json');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
