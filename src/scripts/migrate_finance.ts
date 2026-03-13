import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrateFinance() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Starting Finance & Accounts Migration...');

        // 1. Sequences for Vouchers
        await client.query(`
      CREATE SEQUENCE IF NOT EXISTS collection_voucher_seq START 1;
      CREATE SEQUENCE IF NOT EXISTS payment_voucher_seq START 1;
      CREATE SEQUENCE IF NOT EXISTS petty_cash_voucher_seq START 1;
    `);

        // 2. Customer Collections
        await client.query(`
      CREATE TABLE IF NOT EXISTS customer_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_no VARCHAR(50) UNIQUE DEFAULT 'COL-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('collection_voucher_seq')::text, 4, '0'),
        collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(50) DEFAULT 'CASH', -- CASH, BANK, CHECK, UPI
        reference_no VARCHAR(100),
        remarks TEXT,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 3. Supplier Payments
        await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_no VARCHAR(50) UNIQUE DEFAULT 'PAY-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('payment_voucher_seq')::text, 4, '0'),
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        supplier_id UUID REFERENCES supplier_master(id) ON DELETE SET NULL,
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(50) DEFAULT 'CASH',
        reference_no VARCHAR(100),
        remarks TEXT,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 4. Petty Cash
        await client.query(`
      CREATE TABLE IF NOT EXISTS petty_cash (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_no VARCHAR(50) UNIQUE DEFAULT 'PC-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('petty_cash_voucher_seq')::text, 4, '0'),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        category VARCHAR(100), -- Tea/Snacks, Stationery, Travel, Others
        paid_to VARCHAR(255),
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        remarks TEXT,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 5. Supplier Payment Allocations (Bill-wise Payment)
        await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID REFERENCES supplier_payments(id) ON DELETE CASCADE,
        purchase_entry_id UUID REFERENCES purchase_entries(id) ON DELETE CASCADE,
        allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 6. View for Bill-wise Outstanding
        await client.query(`
      CREATE OR REPLACE VIEW v_purchase_entry_balances AS
      SELECT 
        pe.id,
        pe.entry_number,
        pe.entry_date,
        pe.supplier_id,
        pe.invoice_number,
        pe.invoice_date,
        pe.total_amount as bill_amount,
        COALESCE(SUM(spa.allocated_amount), 0) as paid_amount,
        (pe.total_amount - COALESCE(SUM(spa.allocated_amount), 0)) as pending_amount,
        pe.company_id
      FROM purchase_entries pe
      LEFT JOIN supplier_payment_allocations spa ON pe.id = spa.purchase_entry_id
      GROUP BY pe.id, pe.entry_number, pe.entry_date, pe.supplier_id, pe.invoice_number, pe.invoice_date, pe.total_amount, pe.company_id;
    `);

        // 7. Customer Collection Allocations
        await client.query(`
      CREATE TABLE IF NOT EXISTS customer_collection_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collection_id UUID REFERENCES customer_collections(id) ON DELETE CASCADE,
        invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
        allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 8. View for Sales Invoice Balances
        await client.query(`
      CREATE OR REPLACE VIEW v_sales_invoice_balances AS
      SELECT 
        si.id,
        si.invoice_number,
        si.invoice_date,
        si.customer_id,
        si.net_amount as bill_amount,
        COALESCE(SUM(cca.allocated_amount), 0) as received_amount,
        (si.net_amount - COALESCE(SUM(cca.allocated_amount), 0)) as pending_amount,
        si.company_id
      FROM sales_invoices si
      LEFT JOIN customer_collection_allocations cca ON si.id = cca.invoice_id
      GROUP BY si.id, si.invoice_number, si.invoice_date, si.customer_id, si.net_amount, si.company_id;
    `);

        console.log('🔟 Refreshing PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ Finance & Accounts Migration successful!');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

migrateFinance();
