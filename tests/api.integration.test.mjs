import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';

async function getFreePort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

test('admin setup, settings, guest checkout, payment verification and protected downloads', { timeout: 60_000 }, async (t) => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'nusaklik-api-'));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const setupToken = randomBytes(48).toString('base64url');
  const serverEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    SESSION_SECRET: randomBytes(48).toString('base64url'),
    ADMIN_SETUP_TOKEN: setupToken,
    ADMIN_PASSCODE: '',
    DATA_DIR: path.join(tempDir, 'data'),
    STORAGE_DIR: path.join(tempDir, 'storage'),
    SEED_DEMO_DATA: '',
  };
  let serverOutput = '';
  const startServer = () => {
    const child = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: process.cwd(),
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
    child.stdout.setEncoding('utf8').on('data', (chunk) => { serverOutput += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { serverOutput += chunk; });
    return child;
  };
  let server = startServer();

  const waitForApi = async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (server.exitCode !== null) break;
      try {
        const response = await fetch(`${baseUrl}/api/admin/status`);
        if (response.ok) return;
      } catch {}
      await delay(200);
    }
    assert.fail(`API server did not start. ${serverOutput}`);
  };

  t.after(async () => {
    if (server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill();
      await exited;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  await waitForApi();

  const statusResponse = await fetch(`${baseUrl}/api/admin/status`);
  const status = await readJson(statusResponse);
  assert.equal(status.needsSetup, true);
  assert.equal(status.setupTokenRequired, true);

  const unguardedSetup = await fetch(`${baseUrl}/api/admin/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Owner', email: 'owner@example.test', password: 'strong-password-123' }),
  });
  assert.equal(unguardedSetup.status, 403);

  const setupResponse = await fetch(`${baseUrl}/api/admin/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Owner',
      email: 'owner@example.test',
      password: 'strong-password-123',
      setupToken,
    }),
  });
  assert.equal(setupResponse.status, 201);
  const { token: adminToken } = await readJson(setupResponse);
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const publicProducts = await readJson(await fetch(`${baseUrl}/api/products`));
  assert.equal(publicProducts.total, 0, 'fresh databases must not publish demo products');

  const secondSetup = await fetch(`${baseUrl}/api/admin/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Intruder',
      email: 'other@example.test',
      password: 'strong-password-123',
      setupToken,
    }),
  });
  assert.equal(secondSetup.status, 403);

  const settingsResponse = await fetch(`${baseUrl}/api/admin/settings`, {
    method: 'PUT',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: { bank_name: 'Bank Uji', bank_account_number: '000123' } }),
  });
  assert.equal(settingsResponse.status, 200);
  const publicSettings = await readJson(await fetch(`${baseUrl}/api/settings`));
  assert.equal(publicSettings.settings.bank_name, 'Bank Uji');

  const productUpload = new FormData();
  productUpload.set('file', new Blob(['private digital file'], { type: 'text/plain' }), 'guide.txt');
  const uploadResponse = await fetch(`${baseUrl}/api/admin/upload/digital-file`, {
    method: 'POST',
    headers: adminHeaders,
    body: productUpload,
  });
  assert.equal(uploadResponse.status, 200);
  const uploaded = await readJson(uploadResponse);

  const invalidPriceProduct = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Produk dengan Harga Tidak Valid',
      category_id: 1,
      price: 'bukan-harga',
      is_active: true,
      digital_file_key: uploaded.fileKey,
    }),
  });
  assert.equal(invalidPriceProduct.status, 400, 'invalid prices must not silently become free products');

  const missingFileProduct = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Produk Tanpa Berkas',
      category_id: 1,
      price: 1000,
      is_active: true,
    }),
  });
  assert.equal(missingFileProduct.status, 400, 'published products must have a private download file');

  const createProduct = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Panduan Uji Integrasi',
      category_id: 1,
      price: 1000,
      is_active: true,
      allow_quantity: false,
      file_format: 'TXT',
      digital_file_key: uploaded.fileKey,
      digital_file_name: uploaded.fileName,
    }),
  });
  assert.equal(createProduct.status, 201);
  const product = (await readJson(createProduct)).product;
  const publicCatalog = await readJson(await fetch(`${baseUrl}/api/products`));
  const publicProduct = publicCatalog.products.find((entry) => entry.id === product.id);
  assert.ok(publicProduct);
  assert.equal('digital_file_key' in publicProduct, false, 'public product API must not expose private file keys');

  const unavailableQrisOrder = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerName: 'Pembeli Uji',
      buyerEmail: 'buyer@example.test',
      buyerWhatsapp: '08123456789',
      paymentMethod: 'qris',
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  assert.equal(unavailableQrisOrder.status, 400, 'checkout rejects unconfigured payment methods');

  const checkoutResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerName: 'Pembeli Uji',
      buyerEmail: 'buyer@example.test',
      buyerWhatsapp: '08123456789',
      paymentMethod: 'transfer_bank',
      items: [{ productId: product.id, quantity: 5 }],
    }),
  });
  assert.equal(checkoutResponse.status, 201);
  const order = (await readJson(checkoutResponse)).order;
  assert.equal(order.total_amount, 1000);
  assert.equal(order.items[0].quantity, 1, 'server must enforce single-unit products');

  const unauthorizedOrder = await fetch(`${baseUrl}/api/orders/${order.order_number}`);
  assert.equal(unauthorizedOrder.status, 403);

  const prematureDownload = await fetch(
    `${baseUrl}/api/orders/${order.order_number}/download-token/${product.id}`,
    {
      method: 'POST',
      headers: { 'X-Order-Access-Token': order.access_token },
    }
  );
  assert.equal(prematureDownload.status, 403);

  const prematureApproval = await fetch(`${baseUrl}/api/admin/orders/${order.order_number}/status`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_status: 'lunas' }),
  });
  assert.equal(prematureApproval.status, 400, 'admin cannot approve an order without a proof');

  const registered = await readJson(await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pembeli Uji',
      email: 'buyer@example.test',
      whatsapp: '08123456789',
      password: 'customer-password',
    }),
  }));
  const claimedOrders = await readJson(await fetch(`${baseUrl}/api/customer/orders`, {
    headers: { Authorization: `Bearer ${registered.token}` },
  }));
  assert.equal(claimedOrders.orders.length, 0, 'unverified email registration must not claim guest orders');

  const proofUpload = new FormData();
  proofUpload.set(
    'proof',
    new Blob(['not a real png'], { type: 'image/png' }),
    'proof.png'
  );
  const invalidProof = await fetch(`${baseUrl}/api/orders/${order.order_number}/proof`, {
    method: 'POST',
    headers: { 'X-Order-Access-Token': order.access_token },
    body: proofUpload,
  });
  assert.equal(invalidProof.status, 400, 'proof MIME headers alone are not trusted');

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WTQAAAAASUVORK5CYII=',
    'base64'
  );
  const validProofUpload = new FormData();
  validProofUpload.set('proof', new Blob([png], { type: 'image/png' }), 'proof.png');
  const acceptedProof = await fetch(`${baseUrl}/api/orders/${order.order_number}/proof`, {
    method: 'POST',
    headers: { 'X-Order-Access-Token': order.access_token },
    body: validProofUpload,
  });
  assert.equal(acceptedProof.status, 200);
  const pendingOrder = (await readJson(acceptedProof)).order;
  assert.equal(pendingOrder.payment_status, 'menunggu_verifikasi');

  const rawProof = await fetch(
    `${baseUrl}/api/orders/${order.order_number}/proof/${pendingOrder.proofs[0].id}`,
    { headers: adminHeaders }
  );
  assert.equal(rawProof.status, 200);
  assert.equal(rawProof.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await rawProof.arrayBuffer()), png, 'payment proof bytes must remain unchanged');

  const duplicateProof = new FormData();
  duplicateProof.set('proof', new Blob([png], { type: 'image/png' }), 'second-proof.png');
  const blockedDuplicate = await fetch(`${baseUrl}/api/orders/${order.order_number}/proof`, {
    method: 'POST',
    headers: { 'X-Order-Access-Token': order.access_token },
    body: duplicateProof,
  });
  assert.equal(blockedDuplicate.status, 409);

  const rejection = await fetch(`${baseUrl}/api/admin/orders/${order.order_number}/status`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_status: 'ditolak', rejection_reason: 'Nominal belum sesuai' }),
  });
  assert.equal(rejection.status, 200);
  assert.equal((await readJson(rejection)).order.payment_status, 'ditolak');

  const retryProof = new FormData();
  retryProof.set('proof', new Blob([png], { type: 'image/png' }), 'corrected-proof.png');
  const acceptedRetry = await fetch(`${baseUrl}/api/orders/${order.order_number}/proof`, {
    method: 'POST',
    headers: { 'X-Order-Access-Token': order.access_token },
    body: retryProof,
  });
  assert.equal(acceptedRetry.status, 200, 'a rejected order may submit a corrected proof');
  assert.equal((await readJson(acceptedRetry)).order.payment_status, 'menunggu_verifikasi');

  const approval = await fetch(`${baseUrl}/api/admin/orders/${order.order_number}/status`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_status: 'lunas', admin_notes: 'Bukti diperiksa' }),
  });
  assert.equal(approval.status, 200);
  assert.equal((await readJson(approval)).order.payment_status, 'lunas');

  const downloadTokenResponse = await fetch(
    `${baseUrl}/api/orders/${order.order_number}/download-token/${product.id}`,
    {
      method: 'POST',
      headers: { 'X-Order-Access-Token': order.access_token },
    }
  );
  assert.equal(downloadTokenResponse.status, 200);
  const downloadInfo = await readJson(downloadTokenResponse);
  const downloadResponse = await fetch(`${baseUrl}${downloadInfo.downloadUrl}`);
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'private digital file');

  const historyResponse = await readJson(await fetch(
    `${baseUrl}/api/orders/${order.order_number}`,
    { headers: { 'X-Order-Access-Token': order.access_token } }
  ));
  assert.deepEqual(
    historyResponse.order.status_history.map((entry) => entry.status),
    ['lunas', 'menunggu_verifikasi', 'ditolak', 'menunggu_verifikasi', 'menunggu_pembayaran']
  );

  const logout = await fetch(`${baseUrl}/api/admin/logout`, { method: 'POST', headers: adminHeaders });
  assert.equal(logout.status, 200);
  const revokedSession = await fetch(`${baseUrl}/api/admin/summary`, { headers: adminHeaders });
  assert.equal(revokedSession.status, 401, 'logout must revoke the server-side admin session');

  const firstProcessExit = once(server, 'exit');
  server.kill();
  await firstProcessExit;
  server = startServer();
  await waitForApi();

  const persistedSettings = await readJson(await fetch(`${baseUrl}/api/settings`));
  assert.equal(persistedSettings.settings.bank_account_number, '000123');
  const persistedCatalog = await readJson(await fetch(`${baseUrl}/api/products`));
  assert.equal(persistedCatalog.total, 1, 'products remain available after restart');

  const adminLogin = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.test', password: 'strong-password-123' }),
  });
  assert.equal(adminLogin.status, 200, 'database-backed admin credentials persist across restart');
  const { token: renewedAdminToken } = await readJson(adminLogin);
  const persistedSummary = await readJson(await fetch(`${baseUrl}/api/admin/summary`, {
    headers: { Authorization: `Bearer ${renewedAdminToken}` },
  }));
  assert.equal(persistedSummary.summary.paid_orders, 1);

  const persistedOrder = await readJson(await fetch(
    `${baseUrl}/api/orders/${order.order_number}`,
    { headers: { 'X-Order-Access-Token': order.access_token } }
  ));
  assert.equal(persistedOrder.order.payment_status, 'lunas');
});
