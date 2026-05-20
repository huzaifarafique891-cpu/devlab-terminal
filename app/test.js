/**
 * Simple application tests for Jenkins "Run Application Test" stage
 */
const http = require('http');
const assert = require('assert');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: process.env.TEST_PORT || 3099,
        path,
        method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  process.env.PORT = process.env.TEST_PORT || '3099';
  process.env.DB_HOST = process.env.DB_HOST || 'skip';

  const { app } = require('./server');

  await new Promise((resolve) => {
    const server = app.listen(process.env.PORT, resolve);
    server.unref();
  });

  const health = await request('GET', '/api/health');
  assert.strictEqual(health.status, 503, 'Health should be 503 without DB in test mode');

  const index = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${process.env.PORT}/`, (res) => {
      let html = '';
      res.on('data', (c) => (html += c));
      res.on('end', () => resolve({ status: res.statusCode, html }));
    }).on('error', reject);
  });
  assert.strictEqual(index.status, 200);
  assert.ok(index.html.includes('my-webapp'), 'Home page should load');

  console.log('All tests passed');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Tests failed:', err.message);
  process.exit(1);
});
