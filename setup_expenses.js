require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log("Setting up Expense Heads and Expenditures...");

    // These tables might already exist? Let's check or create.
    const { error: error1 } = await supabase.rpc('run_sql', {
        sql_string: `
            CREATE TABLE IF NOT EXISTS hr_expense_heads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID NOT NULL,
                head_code VARCHAR(50) NOT NULL,
                head_name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );

            CREATE TABLE IF NOT EXISTS hr_expenditures (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID NOT NULL,
                branch_id UUID REFERENCES keil_branches(id),
                expense_head_id UUID REFERENCES hr_expense_heads(id),
                amount DECIMAL(10,2) NOT NULL,
                expenditure_date DATE NOT NULL,
                reference_no VARCHAR(100),
                description TEXT,
                status VARCHAR(50) DEFAULT 'Approved',
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );
        `
    });

    if (error1) {
        console.log("RPC standard query failed, might not have 'run_sql'. Error:", error1.message);
        console.log("Please run this DB script manually if needed. Or we fallback to the postgres connection.");
    } else {
        console.log("Successfully created tables.");
    }
}

setup();
