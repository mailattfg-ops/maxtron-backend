import http from 'http';

const data = JSON.stringify({
  supplier_code: 'TEST-02',
  supplier_name: 'TEST SUPPLIER 2'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/maxtron/suppliers',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let responseBody = '';
  res.on('data', (chunk) => responseBody += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', responseBody));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
