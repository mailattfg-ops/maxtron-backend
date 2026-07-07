import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const secret = process.env.JWT_SECRET || 'super_secret_dev_key_12345';

// User info for demo1 (MAXTRON)
const payload = {
  id: 'b2bb6f64-ef94-4312-bdc8-aa87c2d045e3',
  username: 'demo1@gmail.com',
  company_id: '739f66c9-4f5a-428f-984e-ac9e2e689b59'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

async function callApi() {
  try {
    const res = await fetch('http://localhost:5004/api/maxtron/employees', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log("API STATUS:", res.status);
    console.log("API SUCCESS:", data.success);
    console.log("COUNT:", data.count);
    if (data.data && data.data.length > 0) {
      console.log("First item:", JSON.stringify(data.data[0], null, 2));
    }
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

callApi();
