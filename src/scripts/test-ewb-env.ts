import { EwbService } from '../modules/maxtron/services/ewbService';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const mockOrder = {
  order_number: "ORD-2026-0001",
  order_date: "2026-06-24",
  total_value: 45000,
  tax_amount: 8100,
  net_amount: 53100,
  trans_distance: 120,
  trans_mode: "1",
  vehicle_no: "MH-12-AB-1234",
  vehicle_type: "R",
  transporter_id: "27AAAAA1111A1Z1",
  transporter_name: "Blue Dart Logistics"
};

const mockCustomer = {
  customer_name: "Test Customer Ltd",
  gst_no: "27BBBBB2222B2Z2",
  addresses: [
    { street: "123 Business Park", city: "Pune", zip_code: "411001" }
  ]
};

const mockItems = [
  { product_name: "Film Rolls", quantity: 50, rate: 900, gst_percent: 18, total_value: 45000 }
];

async function runTests() {
  console.log("🧪 Testing Dynamic Environment Configurations for E-Way Bill...");
  
  // Save original env values
  const originalEnv = { ...process.env };

  try {
    // ----------------------------------------------------
    // Scenario 1: EWB_ENV=sandbox, No Credentials (Mock Fallback)
    // ----------------------------------------------------
    console.log("\n--- Scenario 1: Sandbox with No Credentials (Mock Staging) ---");
    process.env.EWB_ENV = 'sandbox';
    delete process.env.EWB_SANDBOX_CLIENT_ID;
    delete process.env.EWB_SANDBOX_USERNAME;
    delete process.env.EWB_SANDBOX_PASSWORD;
    delete process.env.EWB_SANDBOX_GSTIN;
    delete process.env.EWB_CLIENT_ID;
    delete process.env.EWB_USERNAME;
    
    console.log("Mock mode status:", EwbService.isMockMode() ? "✅ MOCK MODE" : "❌ LIVE MODE");
    let res = await EwbService.generateEwb(mockOrder, mockCustomer, mockItems);
    console.log("EWB Status:", res.ewb_status);
    console.log("EWB Number:", res.ewb_no);

    // ----------------------------------------------------
    // Scenario 2: EWB_ENV=production, No Credentials (Mock Fallback)
    // ----------------------------------------------------
    console.log("\n--- Scenario 2: Production with No Credentials (Mock Staging) ---");
    process.env.EWB_ENV = 'production';
    delete process.env.EWB_PROD_CLIENT_ID;
    delete process.env.EWB_PROD_USERNAME;
    delete process.env.EWB_PROD_PASSWORD;
    delete process.env.EWB_PROD_GSTIN;
    delete process.env.EWB_CLIENT_ID;
    delete process.env.EWB_USERNAME;
    
    console.log("Mock mode status:", EwbService.isMockMode() ? "✅ MOCK MODE" : "❌ LIVE MODE");
    res = await EwbService.generateEwb(mockOrder, mockCustomer, mockItems);
    console.log("EWB Status:", res.ewb_status);
    console.log("EWB Number:", res.ewb_no);

    // ----------------------------------------------------
    // Scenario 3: EWB_ENV=sandbox, Sandbox Credentials Provided (Live Sandbox Route)
    // ----------------------------------------------------
    console.log("\n--- Scenario 3: Sandbox Environment with Sandbox Credentials ---");
    process.env.EWB_ENV = 'sandbox';
    process.env.EWB_SANDBOX_CLIENT_ID = 'sb_client_123';
    process.env.EWB_SANDBOX_CLIENT_SECRET = 'sb_secret_456';
    process.env.EWB_SANDBOX_USERNAME = 'sb_user';
    process.env.EWB_SANDBOX_PASSWORD = 'sb_password';
    process.env.EWB_SANDBOX_GSTIN = '27AAAAA1111A1Z1';
    process.env.EWB_SANDBOX_BASE_URL = 'https://sandbox.gsp.ewb.gov.in/api/v1.03';
    
    console.log("Mock mode status:", EwbService.isMockMode() ? "❌ MOCK MODE" : "✅ LIVE MODE");
    res = await EwbService.generateEwb(mockOrder, mockCustomer, mockItems);
    console.log("EWB Status:", res.ewb_status);
    console.log("EWB Error (Should fail auth because of fake creds):", res.ewb_error);

    // ----------------------------------------------------
    // Scenario 4: EWB_ENV=production, Production Credentials Provided (Live Production Route)
    // ----------------------------------------------------
    console.log("\n--- Scenario 4: Production Environment with Production Credentials ---");
    process.env.EWB_ENV = 'production';
    process.env.EWB_PROD_CLIENT_ID = 'prod_client_123';
    process.env.EWB_PROD_CLIENT_SECRET = 'prod_secret_456';
    process.env.EWB_PROD_USERNAME = 'prod_user';
    process.env.EWB_PROD_PASSWORD = 'prod_password';
    process.env.EWB_PROD_GSTIN = '27BBBBB2222B2Z2';
    process.env.EWB_PROD_BASE_URL = 'https://prod.gsp.ewb.gov.in/api/v1.03';
    
    console.log("Mock mode status:", EwbService.isMockMode() ? "❌ MOCK MODE" : "✅ LIVE MODE");
    res = await EwbService.generateEwb(mockOrder, mockCustomer, mockItems);
    console.log("EWB Status:", res.ewb_status);
    console.log("EWB Error (Should fail auth because of fake creds):", res.ewb_error);

  } finally {
    // Restore original env variables
    process.env = originalEnv;
  }
}

runTests();
