/**
 * ShipSplit API smoke-test suite (v2)
 * Usage:  node test.js
 * Requires server running on port 5000 with MongoDB connected.
 *
 * Covers: health, auth, orders, labels, platforms, subscription, reports, settings
 */

'use strict';

const http  = require('http');
const https = require('https');

const BASE    = 'http://localhost:5000/api';
let   token   = '';
let   passed  = 0;
let   failed  = 0;

/* ── tiny HTTP helper ────────────────────────────────────────────── */
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts    = {
      method,
      headers: {
        'Content-Type':  'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    const url  = new URL(BASE + path);
    const req  = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/* ── assertion helper ────────────────────────────────────────────── */
function assert(name, condition, details = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${details ? ' — ' + details : ''}`);
    failed++;
  }
}

/* ── test runner ─────────────────────────────────────────────────── */
async function run() {
  console.log('\n── ShipSplit API smoke tests ──────────────────────\n');

  /* 1. Health check */
  console.log('Health');
  const health = await request('GET', '/health');
  assert('GET /health returns 200',    health.status === 200);
  assert('/health has status:ok',      health.body?.status === 'ok');

  /* 2. Auth — register */
  console.log('\nAuth');
  const email = `test_${Date.now()}@shipsplit.dev`;
  const reg   = await request('POST', '/auth/register', {
    name: 'Test User', email, password: 'Test1234!', phone: '9876543210',
  });
  assert('POST /auth/register → 201', reg.status === 201);
  assert('register returns user.name', reg.body?.data?.user?.name === 'Test User');
  assert('register returns accessToken', !!reg.body?.data?.accessToken);
  token = reg.body?.data?.accessToken || '';

  /* 3. Auth — duplicate register */
  const dup = await request('POST', '/auth/register', {
    name: 'Test User', email, password: 'Test1234!',
  });
  assert('duplicate register → 409', dup.status === 409);

  /* 4. Auth — login */
  const login = await request('POST', '/auth/login', { email, password: 'Test1234!' });
  assert('POST /auth/login → 200',    login.status === 200);
  assert('login returns user',        !!login.body?.data?.user);
  token = login.body?.data?.accessToken || token;

  /* 5. Auth — wrong password */
  const badLogin = await request('POST', '/auth/login', { email, password: 'WrongPass!' });
  assert('wrong password → 401',      badLogin.status === 401);

  /* 6. Auth — get me */
  const me = await request('GET', '/auth/me');
  assert('GET /auth/me → 200',        me.status === 200);
  assert('/me returns correct email', me.body?.data?.user?.email === email);

  /* 7. Validation — bad register */
  console.log('\nValidation');
  const badReg = await request('POST', '/auth/register', {
    name: 'X', email: 'not-valid', password: 'weak',
  });
  assert('bad register → 422',        badReg.status === 422);
  assert('422 includes errors array', Array.isArray(badReg.body?.errors));

  /* 8. Auth guard — unauthenticated */
  console.log('\nAuth guard');
  const savedToken = token;
  token = '';
  const noAuth = await request('GET', '/orders');
  assert('unauthenticated orders → 401', noAuth.status === 401);
  token = savedToken;

  /* 9. Orders */
  console.log('\nOrders');
  const orders = await request('GET', '/orders?page=1&limit=10');
  assert('GET /orders → 200',         orders.status === 200);
  assert('/orders returns meta.total', typeof orders.body?.meta?.total === 'number');

  /* 10. Labels */
  console.log('\nLabels');
  const labels = await request('GET', '/labels?page=1&limit=10');
  assert('GET /labels → 200',         labels.status === 200);
  assert('/labels returns meta',      typeof labels.body?.meta?.total === 'number');

  /* 11. Generate labels — no orders */
  const genEmpty = await request('POST', '/labels/generate', {
    orderIds: ['000000000000000000000000'],
    splitType: 'courier',
  });
  assert('generate with no matching orders → 400/404', [400, 404].includes(genEmpty.status));

  /* 12. Settings */
  console.log('\nSettings');
  const settings = await request('GET', '/settings');
  assert('GET /settings → 200',       settings.status === 200);
  assert('settings has labelDefaults', !!settings.body?.data?.labelDefaults);
  assert('settings has notifications', !!settings.body?.data?.notifications);

  /* 13. Update label defaults */
  const updDef = await request('PUT', '/settings/label-defaults', { pageSize: 'A6', labelsPerPage: 2 });
  assert('PUT /settings/label-defaults → 200', updDef.status === 200);
  assert('labelDefaults.pageSize updated',      updDef.body?.data?.labelDefaults?.pageSize === 'A6');

  /* 14. Subscription */
  console.log('\nSubscription');
  const sub = await request('GET', '/subscription');
  assert('GET /subscription → 200',   sub.status === 200);
  assert('subscription has plan',     !!sub.body?.data?.subscription?.plan);

  /* 15. Reports */
  console.log('\nReports');
  const dash = await request('GET', '/reports/dashboard');
  assert('GET /reports/dashboard → 200',  dash.status === 200);
  assert('dashboard has totalOrders',     typeof dash.body?.data?.totalOrders === 'number');

  const summary = await request('GET', '/reports/summary?range=30d');
  assert('GET /reports/summary → 200',    summary.status === 200);

  const daily = await request('GET', '/reports/orders-by-day?range=7d');
  assert('GET /reports/orders-by-day → 200', daily.status === 200);
  assert('orders-by-day returns array', Array.isArray(daily.body?.data?.data));

  /* 16. 404 */
  console.log('\nError handling');
  const notFound = await request('GET', '/nonexistent-route');
  assert('unknown route → 404',       notFound.status === 404);

  /* ── Summary ─────────────────────────────────────────────────── */
  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\nTest runner error (is the server running?):', err.message);
  process.exit(1);
});
