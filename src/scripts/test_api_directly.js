const axios = require('axios');

async function testApi() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin@maxtron.com',
      password: 'admin' // Generic password
    });
    
    const token = loginRes.data.token;
    console.log("Logged in successfully.");

    const companiesRes = await axios.get('http://localhost:5000/api/maxtron/companies', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Companies:", JSON.stringify(companiesRes.data.data, null, 2));
    const maxtron = companiesRes.data.data.find(c => c.company_name.toUpperCase() === 'MAXTRON');
    
    if (maxtron) {
      console.log("Found MAXTRON ID:", maxtron.id);
      const batchesRes = await axios.get(`http://localhost:5000/api/maxtron/production/batches?company_id=${maxtron.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Batches:", JSON.stringify(batchesRes.data.data, null, 2));
    } else {
      console.log("MAXTRON company not found via API.");
    }
  } catch (err) {
    console.error("API Error:", err.message);
    if (err.response) console.log("Response data:", err.response.data);
  }
}

testApi();
