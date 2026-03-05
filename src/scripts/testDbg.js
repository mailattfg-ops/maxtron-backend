const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/maxtron/suppliers/dbg',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + 'dummy_token' // Dbg might fail on auth but if route exists it's 401 not 404
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
