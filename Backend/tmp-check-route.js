const http = require('http');
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/enseignants',
  method: 'GET',
  headers: {
    Authorization: 'Bearer dummy'
  }
};

const req = http.request(options, res => {
  console.log('status', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('body', data));
});

req.on('error', error => console.error('err', error));
req.end();
