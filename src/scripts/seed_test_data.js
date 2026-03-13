const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // 1. Ensure MAXTRON exists
    let res = await pool.query("SELECT id FROM companies WHERE company_name = 'MAXTRON'");
    let coId;
    if (res.rows.length === 0) {
      const co = await pool.query(
        "INSERT INTO companies (company_code, company_name, email, phone) VALUES ('MAXTRON-01', 'MAXTRON', 'admin@maxtron.com', '1234567890') RETURNING id"
      );
      coId = co.rows[0].id;
      console.log("Created MAXTRON Company.");
    } else {
      coId = res.rows[0].id;
      console.log("MAXTRON Company exists.");
    }

    // 2. Ensure Admin User (and it will be the operator)
    res = await pool.query("SELECT id FROM users WHERE username = 'admin@maxtron.com' LIMIT 1");
    let adminId;
    if (res.rows.length === 0) {
       const ut = await pool.query("SELECT id FROM user_types WHERE name = 'admin' LIMIT 1");
       const admin = await pool.query(
         "INSERT INTO users (type, name, username, password, company_id, employee_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
         [ut.rows[0].id, 'System Admin', 'admin@maxtron.com', 'password', coId, 'SYS-001']
       );
       adminId = admin.rows[0].id;
       console.log("Created Admin User.");
    } else {
      adminId = res.rows[0].id;
      await pool.query("UPDATE users SET company_id = $1 WHERE id = $2", [coId, adminId]);
      console.log("Admin User verified.");
    }

    // 2.5 Create a Customer
    res = await pool.query("SELECT id FROM customers WHERE customer_name = 'Ideal Solutions' LIMIT 1");
    let custId;
    if (res.rows.length === 0) {
      const cust = await pool.query(
        "INSERT INTO customers (customer_name, customer_code, company_id, opening_balance, credit_limit, gst_no) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        ['Ideal Solutions', 'CUST-IDL-001', coId, 25000, 100000, '29ABCDE1234F1Z5']
      );
      custId = cust.rows[0].id;
      console.log("Created Test Customer.");
    } else {
      custId = res.rows[0].id;
      console.log("Test Customer exists.");
    }

    // 3. Create a Finished Product
    res = await pool.query("SELECT id FROM finished_products WHERE product_name = 'Test Product' LIMIT 1");
    let prodId;
    if (res.rows.length === 0) {
      const prod = await pool.query(
        "INSERT INTO finished_products (product_code, product_name, company_id) VALUES ('PROD-01', 'Test Product', $1) RETURNING id",
        [coId]
      );
      prodId = prod.rows[0].id;
      console.log("Created Test Product.");
    } else {
      prodId = res.rows[0].id;
      console.log("Test Product exists.");
    }

    // 4. Create a Batch
    await pool.query(
      "INSERT INTO production_batches (batch_number, product_id, shift, operator_id, company_id, extrusion_output_qty) VALUES ($1, $2, $3, $4, $5, $6)",
      ['BAT-001', prodId, 'Morning', adminId, coId, 150]
    );
    console.log("Created Test Batch.");

    // 5. Create a Raw Material
    res = await pool.query("INSERT INTO raw_materials (rm_code, rm_name, company_id) VALUES ('RM-001', 'LLDPE', $1) RETURNING id", [coId]);
    const rmId = res.rows[0].id;
    console.log("Created Test RM.");

    // 6. Create a Wastage Record
    await pool.query(
      "INSERT INTO production_wastage (stage, material_id, wastage_qty, company_id, date) VALUES ($1, $2, $3, $4, $5)",
      ['Extrusion', rmId, 5.5, coId, new Date()]
    );
    console.log("Created Test Wastage Record.");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
