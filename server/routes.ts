import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  db,
  getStoreSettings,
  PAYMENT_PROOFS_DIR,
  PRIVATE_PRODUCTS_DIR,
  PUBLIC_UPLOADS_DIR,
} from './db.ts';
import {
  generateRandomToken,
  hashPassword,
  isValidEmail,
  isValidWhatsApp,
  safeResolvePath,
  sanitizeText,
  sha256Hex,
  signToken,
  slugify,
  verifyPassword,
  verifyToken,
} from './security.ts';

interface AuthedRequest extends Request {
  auth?: {
    sub: number | string;
    role: 'customer' | 'admin' | 'download';
    email?: string;
  };
  proofOrder?: {
    id: number;
    customer_id: number | null;
    access_token_hash: string;
    payment_status: string;
  };
}

function matchesSecret(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

const authAttempts = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

function limitAuthenticationAttempts(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = `${req.ip || 'unknown'}:${req.path}`;
  let entry = authAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + AUTH_RATE_WINDOW_MS };
    authAttempts.set(key, entry);
  }
  if (entry.count >= AUTH_RATE_LIMIT) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Terlalu banyak percobaan. Silakan coba kembali beberapa menit lagi.' });
    return;
  }
  entry.count += 1;
  if (authAttempts.size > 5000) {
    for (const [attemptKey, attempt] of authAttempts) {
      if (attempt.resetAt <= now) authAttempts.delete(attemptKey);
    }
  }
  next();
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload && (payload.role === 'customer' || payload.role === 'admin')) {
      req.auth = { sub: payload.sub, role: payload.role, email: payload.email };
    }
  }
  next();
}

function requireCustomer(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'customer') {
    res.status(401).json({ error: 'Silakan masuk ke akun pelanggan terlebih dahulu.' });
    return;
  }
  req.auth = { sub: payload.sub, role: 'customer', email: payload.email };
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    res.status(401).json({ error: 'Akses ditolak. Autentikasi admin diperlukan.' });
    return;
  }
  const session = db
    .prepare('SELECT expires_at, revoked_at FROM admin_sessions WHERE token_hash = ?')
    .get(sha256Hex(token!)) as { expires_at: string; revoked_at: string | null } | undefined;
  if (!session || session.revoked_at || session.expires_at <= new Date().toISOString()) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir. Silakan masuk kembali.' });
    return;
  }
  req.auth = { sub: payload.sub, role: 'admin', email: payload.email };
  next();
}

function runInTransaction<T>(callback: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function createAdminSession(adminId: number | null, email: string): string {
  const token = signToken({ sub: adminId ?? 0, role: 'admin', email });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256Hex(token), adminId, expiresAt);
  return token;
}

function hasExpectedImageSignature(filePath: string, mimeType: string): boolean {
  const file = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const bytesRead = fs.readSync(file, header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    return false;
  } finally {
    fs.closeSync(file);
  }
}

function storedProductFileExists(fileKey: string): boolean {
  const resolved = safeResolvePath(PRIVATE_PRODUCTS_DIR, fileKey);
  return Boolean(resolved && fs.existsSync(resolved) && fs.statSync(resolved).isFile());
}

// Multer setups with strict limits and MIME validation
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PUBLIC_UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/webp' ? '.webp' : '.png';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(null, ok);
  },
});

const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PAYMENT_PROOFS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      const safeExt = allowed.includes(ext) ? ext : '.jpg';
      cb(null, `proof-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(null, ok);
  },
});

const digitalProductUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_PRODUCTS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      const base = slugify(path.basename(file.originalname, path.extname(file.originalname))) || 'produk';
      cb(null, `${base}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext || '.bin'}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function verifyOrderAccess(req: AuthedRequest, order: { customer_id: number | null; access_token_hash: string }): boolean {
  if (req.auth?.role === 'admin') return true;
  if (req.auth?.role === 'customer' && order.customer_id && Number(req.auth.sub) === order.customer_id) {
    return true;
  }
  const rawAccess =
    (typeof req.headers['x-order-access-token'] === 'string' && req.headers['x-order-access-token']) ||
    (typeof req.query.access === 'string' && req.query.access) ||
    '';
  if (rawAccess && order.access_token_hash) {
    const hashed = sha256Hex(rawAccess);
    const a = Buffer.from(hashed, 'utf8');
    const b = Buffer.from(order.access_token_hash, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }
  return false;
}

function authorizeProofUpload(req: AuthedRequest, res: Response, next: NextFunction) {
  const orderNumber = sanitizeText(req.params.orderNumber, 50);
  const order = db.prepare('SELECT id, customer_id, access_token_hash, payment_status FROM orders WHERE order_number = ?')
    .get(orderNumber) as AuthedRequest['proofOrder'] | undefined;
  if (!order || !verifyOrderAccess(req, order)) {
    res.status(403).json({ error: 'Akses pesanan tidak sah.' });
    return;
  }
  if (order.payment_status === 'lunas') {
    res.status(400).json({ error: 'Pesanan ini sudah berstatus Lunas.' });
    return;
  }
  if (order.payment_status === 'menunggu_verifikasi') {
    res.status(409).json({ error: 'Bukti pembayaran sedang diperiksa. Tunggu hasil verifikasi sebelum mengunggah ulang.' });
    return;
  }
  req.proofOrder = order;
  next();
}

function hydrateOrder(orderRow: Record<string, unknown>) {
  const items = db
    .prepare(
      `SELECT oi.*, p.cover_url
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(orderRow.id as number);
  const proofs = db
    .prepare(
      `SELECT id, order_id, original_filename, mime_type, file_size, uploaded_at
       FROM payment_proofs
       WHERE order_id = ?
       ORDER BY uploaded_at DESC`
    )
    .all(orderRow.id as number);
  const payment = db
    .prepare(
      `SELECT status, rejection_reason, verified_at
       FROM payments
       WHERE order_id = ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(orderRow.id as number) as { rejection_reason?: string } | undefined;

  const status_history = db
    .prepare(
      `SELECT id, order_id, status, note, changed_by, created_at
       FROM order_status_history
       WHERE order_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(orderRow.id as number);

  const safeOrder = { ...orderRow };
  delete safeOrder.access_token_hash;
  return {
    ...safeOrder,
    items,
    proofs,
    status_history,
    rejection_reason: payment?.rejection_reason || '',
  };
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  // Safe static serving for public uploads
  router.get('/uploads/:filename', (req, res) => {
    const resolved = safeResolvePath(PUBLIC_UPLOADS_DIR, req.params.filename);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Berkas tidak ditemukan.' });
      return;
    }
    res.set('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  });

  // ─── PUBLIC STOREFRONT ───────────────────────────────────────────────────────
  router.get('/settings', (_req, res) => {
    res.json({ settings: getStoreSettings() });
  });

  router.get('/categories', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
         FROM categories c
         ORDER BY c.sort_order ASC, c.id ASC`
      )
      .all();
    res.json({ categories: rows });
  });

  router.get('/products', (req, res) => {
    const q = sanitizeText(req.query.q, 100);
    const category = sanitizeText(req.query.category, 80);
    const filter = sanitizeText(req.query.filter, 30);
    const sort = sanitizeText(req.query.sort, 30) || 'terbaru';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
    const offset = (page - 1) * limit;

    const where: string[] = ['p.is_active = 1'];
    const params: Array<string | number> = [];

    if (q) {
      where.push('(p.title LIKE ? OR p.summary LIKE ? OR p.description LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (filter === 'gratis') where.push('p.is_free = 1');
    else if (filter === 'promo') where.push('(p.is_promo = 1 OR (p.discount_price IS NOT NULL AND p.discount_price < p.price))');
    else if (filter === 'unggulan') where.push('p.is_featured = 1');
    else if (filter === 'populer') where.push('p.is_popular = 1');

    let orderBy = 'p.created_at DESC, p.id DESC';
    if (sort === 'populer') orderBy = 'p.is_popular DESC, p.download_count DESC, p.id DESC';
    else if (sort === 'harga_terendah') orderBy = 'COALESCE(p.discount_price, p.price) ASC, p.id DESC';
    else if (sort === 'harga_tertinggi') orderBy = 'COALESCE(p.discount_price, p.price) DESC, p.id DESC';

    const whereSql = where.join(' AND ');
    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${whereSql}`
      )
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT
          p.id, p.category_id, c.name as category_name, c.slug as category_slug, c.is_book_format,
          p.title, p.slug, p.summary, p.description, p.benefits,
          p.price, p.discount_price, p.is_free, p.allow_public_free_download,
          p.is_featured, p.is_popular, p.is_promo, p.is_active, p.allow_quantity,
          p.file_format, p.file_size_label, p.license_type, p.cover_url, p.cover_aspect_type,
          p.digital_file_name, (p.digital_file_key != '') as has_digital_file,
          p.download_count, p.created_at, p.updated_at
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    res.json({
      products: rows,
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    });
  });

  router.get('/products/:slug', (req, res) => {
    const slug = sanitizeText(req.params.slug, 100);
    const product = db
      .prepare(
        `SELECT
          p.id, p.category_id, c.name as category_name, c.slug as category_slug, c.is_book_format,
          p.title, p.slug, p.summary, p.description, p.benefits,
          p.price, p.discount_price, p.is_free, p.allow_public_free_download,
          p.is_featured, p.is_popular, p.is_promo, p.is_active, p.allow_quantity,
          p.file_format, p.file_size_label, p.license_type, p.cover_url, p.cover_aspect_type,
          p.digital_file_name, (p.digital_file_key != '') as has_digital_file,
          p.download_count, p.created_at, p.updated_at
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.slug = ? AND p.is_active = 1`
      )
      .get(slug) as Record<string, unknown> | undefined;

    if (!product) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }

    const related = db
      .prepare(
        `SELECT
          p.id, p.category_id, c.name as category_name, c.slug as category_slug, c.is_book_format,
          p.title, p.slug, p.summary, p.price, p.discount_price, p.is_free,
          p.allow_public_free_download, p.is_featured, p.is_popular, p.is_promo,
          p.file_format, p.file_size_label, p.cover_url, p.cover_aspect_type,
          p.download_count, p.created_at, p.updated_at
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 AND p.id != ? AND p.category_id = ?
         ORDER BY p.is_popular DESC, p.id DESC
         LIMIT 4`
      )
      .all(product.id as number, product.category_id as number);

    res.json({ product, related });
  });

  // Public free download (only when is_free = 1 AND allow_public_free_download = 1)
  router.get('/products/:id/free-download', (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      res.status(400).json({ error: 'ID produk tidak valid.' });
      return;
    }
    const product = db
      .prepare(
        `SELECT id, is_free, allow_public_free_download, is_active, digital_file_key, digital_file_name
         FROM products WHERE id = ?`
      )
      .get(productId) as
      | {
          id: number;
          is_free: number;
          allow_public_free_download: number;
          is_active: number;
          digital_file_key: string;
          digital_file_name: string;
        }
      | undefined;

    if (!product || !product.is_active || !product.is_free || !product.allow_public_free_download) {
      res.status(403).json({ error: 'Produk ini tidak tersedia untuk unduhan publik gratis.' });
      return;
    }

    const resolved = safeResolvePath(PRIVATE_PRODUCTS_DIR, product.digital_file_key);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Berkas produk belum tersedia di server.' });
      return;
    }

    db.prepare('UPDATE products SET download_count = download_count + 1 WHERE id = ?').run(product.id);
    db.prepare(
      'INSERT INTO download_logs (order_id, product_id, customer_id, ip_address, user_agent) VALUES (NULL, ?, NULL, ?, ?)'
    ).run(product.id, req.ip || '', sanitizeText(req.headers['user-agent'], 200));

    res.download(resolved, product.digital_file_name || path.basename(resolved));
  });

  router.post('/contact', (req, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const whatsapp = sanitizeText(req.body?.whatsapp, 30);
    const subject = sanitizeText(req.body?.subject, 160);
    const message = sanitizeText(req.body?.message, 2000);

    if (!name || !isValidEmail(email) || !subject || message.length < 10) {
      res.status(400).json({ error: 'Mohon lengkapi nama, email valid, subjek, dan pesan minimal 10 karakter.' });
      return;
    }

    db.prepare(
      'INSERT INTO contact_messages (name, email, whatsapp, subject, message) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, whatsapp, subject, message);

    res.status(201).json({ ok: true, message: 'Pesan Anda telah diterima oleh tim NusaKlik.' });
  });

  // ─── CUSTOMER AUTHENTICATION ─────────────────────────────────────────────────
  router.post('/auth/register', limitAuthenticationAttempts, (req, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const whatsapp = sanitizeText(req.body?.whatsapp, 30);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !isValidEmail(email) || !isValidWhatsApp(whatsapp) || password.length < 8) {
      res.status(400).json({
        error: 'Nama, email valid, nomor WhatsApp aktif, dan kata sandi minimal 8 karakter wajib diisi.',
      });
      return;
    }

    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Email tersebut sudah terdaftar. Silakan masuk ke akun Anda.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const info = db
      .prepare('INSERT INTO customers (name, email, whatsapp, password_hash) VALUES (?, ?, ?, ?)')
      .run(name, email, whatsapp, passwordHash);

    const customerId = Number(info.lastInsertRowid);
    const customer = db
      .prepare('SELECT id, name, email, whatsapp, created_at FROM customers WHERE id = ?')
      .get(customerId);
    const token = signToken({ sub: customerId, role: 'customer', email });

    res.status(201).json({ token, customer });
  });

  router.post('/auth/login', limitAuthenticationAttempts, (req, res) => {
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Masukkan email dan kata sandi Anda.' });
      return;
    }

    const row = db
      .prepare('SELECT id, name, email, whatsapp, password_hash, created_at FROM customers WHERE email = ?')
      .get(email) as
      | { id: number; name: string; email: string; whatsapp: string; password_hash: string; created_at: string }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
      return;
    }

    const token = signToken({ sub: row.id, role: 'customer', email: row.email });
    res.json({
      token,
      customer: {
        id: row.id,
        name: row.name,
        email: row.email,
        whatsapp: row.whatsapp,
        created_at: row.created_at,
      },
    });
  });

  router.get('/auth/me', requireCustomer, (req: AuthedRequest, res) => {
    const customer = db
      .prepare('SELECT id, name, email, whatsapp, created_at FROM customers WHERE id = ?')
      .get(Number(req.auth!.sub));
    if (!customer) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }
    res.json({ customer });
  });

  router.put('/auth/me', requireCustomer, (req: AuthedRequest, res) => {
    const name = sanitizeText(req.body?.name, 100);
    const whatsapp = sanitizeText(req.body?.whatsapp, 30);
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!name || !isValidWhatsApp(whatsapp)) {
      res.status(400).json({ error: 'Nama dan nomor WhatsApp wajib valid.' });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter.' });
      return;
    }

    if (newPassword) {
      db.prepare(
        "UPDATE customers SET name = ?, whatsapp = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(name, whatsapp, hashPassword(newPassword), Number(req.auth!.sub));
    } else {
      db.prepare(
        "UPDATE customers SET name = ?, whatsapp = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(name, whatsapp, Number(req.auth!.sub));
    }

    const customer = db
      .prepare('SELECT id, name, email, whatsapp, created_at FROM customers WHERE id = ?')
      .get(Number(req.auth!.sub));
    res.json({ customer });
  });

  router.get('/customer/orders', requireCustomer, (req: AuthedRequest, res) => {
    const rows = db
      .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC, id DESC')
      .all(Number(req.auth!.sub)) as Array<Record<string, unknown>>;
    res.json({ orders: rows.map(hydrateOrder) });
  });

  router.get('/customer/library', requireCustomer, (req: AuthedRequest, res) => {
    const rows = db
      .prepare(
        `SELECT DISTINCT
          p.id, p.title, p.slug, p.file_format, p.file_size_label, p.cover_url, p.cover_aspect_type,
          p.license_type, o.order_number, o.created_at as purchased_at
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE o.customer_id = ? AND o.payment_status = 'lunas'
         ORDER BY o.created_at DESC`
      )
      .all(Number(req.auth!.sub));
    res.json({ items: rows });
  });

  // ─── CHECKOUT, ORDERS & PROTECTED DOWNLOADS ──────────────────────────────────
  router.post('/orders', optionalAuth, (req: AuthedRequest, res) => {
    const buyerName = sanitizeText(req.body?.buyerName, 100);
    const buyerEmail = sanitizeText(req.body?.buyerEmail, 160).toLowerCase();
    const buyerWhatsapp = sanitizeText(req.body?.buyerWhatsapp, 30);
    const requestedPaymentMethod = req.body?.paymentMethod;
    if (requestedPaymentMethod !== 'qris' && requestedPaymentMethod !== 'transfer_bank') {
      res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
      return;
    }
    const paymentMethod = requestedPaymentMethod;
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!buyerName || !isValidEmail(buyerEmail) || !isValidWhatsApp(buyerWhatsapp)) {
      res.status(400).json({ error: 'Mohon isi nama lengkap, email aktif, dan nomor WhatsApp yang valid.' });
      return;
    }
    if (rawItems.length === 0 || rawItems.length > 30) {
      res.status(400).json({ error: 'Keranjang belanja kosong atau melebihi batas item.' });
      return;
    }

    // Re-calculate prices strictly on backend
    const verifiedItems: Array<{
      productId: number;
      title: string;
      slug: string;
      fileFormat: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }> = [];

    const seenIds = new Set<number>();
    let totalAmount = 0;

    for (const entry of rawItems) {
      const productId = Number(entry?.productId);
      if (!Number.isInteger(productId) || productId <= 0 || seenIds.has(productId)) {
        res.status(400).json({ error: 'Daftar produk di keranjang tidak valid.' });
        return;
      }
      seenIds.add(productId);

      const prod = db
        .prepare(
          'SELECT id, title, slug, file_format, price, discount_price, is_free, is_active, allow_quantity FROM products WHERE id = ?'
        )
        .get(productId) as
        | {
            id: number;
            title: string;
            slug: string;
            file_format: string;
            price: number;
            discount_price: number | null;
            is_free: number;
            is_active: number;
            allow_quantity: number;
          }
        | undefined;

      if (!prod || !prod.is_active) {
        res.status(400).json({ error: 'Salah satu produk dalam keranjang sudah tidak tersedia.' });
        return;
      }

      const requestedQuantity = Number(entry?.quantity);
      if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
        res.status(400).json({ error: 'Jumlah produk tidak valid.' });
        return;
      }
      const qty = prod.allow_quantity
        ? Math.min(20, Math.max(1, Math.round(requestedQuantity)))
        : 1;
      const unitPrice = prod.is_free
        ? 0
        : prod.discount_price !== null && prod.discount_price < prod.price
          ? prod.discount_price
          : prod.price;
      const subtotal = unitPrice * qty;
      if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(totalAmount + subtotal)) {
        res.status(400).json({ error: 'Total pesanan melebihi batas yang dapat diproses.' });
        return;
      }
      totalAmount += subtotal;

      verifiedItems.push({
        productId: prod.id,
        title: prod.title,
        slug: prod.slug,
        fileFormat: prod.file_format,
        unitPrice,
        quantity: qty,
        subtotal,
      });
    }

    if (verifiedItems.length === 0) {
      res.status(400).json({ error: 'Tidak ada produk valid untuk diproses.' });
      return;
    }

    if (totalAmount > 0) {
      const settings = getStoreSettings();
      const methodConfigured = paymentMethod === 'qris'
        ? Boolean(settings.qris_image_url)
        : Boolean(settings.bank_name && settings.bank_account_number);
      if (!methodConfigured) {
        res.status(400).json({
          error: paymentMethod === 'qris'
            ? 'Pembayaran QRIS belum dikonfigurasi oleh pengelola toko.'
            : 'Rekening bank belum dikonfigurasi oleh pengelola toko.',
        });
        return;
      }
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(8).toString('hex').toUpperCase();
    const orderNumber = `NK-${datePart}-${randPart}`;
    const rawAccessToken = generateRandomToken(20);
    const accessTokenHash = sha256Hex(rawAccessToken);
    const customerId = req.auth?.role === 'customer' ? Number(req.auth.sub) : null;

    const initialPaymentStatus = totalAmount === 0 ? 'lunas' : 'menunggu_pembayaran';
    const initialOrderStatus = totalAmount === 0 ? 'lunas' : 'menunggu_pembayaran';

    const orderId = runInTransaction(() => {
      const orderRes = db.prepare(`
        INSERT INTO orders (
          order_number, customer_id, buyer_name, buyer_email, buyer_whatsapp,
          total_amount, payment_method, payment_status, order_status, access_token_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber,
        customerId,
        buyerName,
        buyerEmail,
        buyerWhatsapp,
        totalAmount,
        paymentMethod,
        initialPaymentStatus,
        initialOrderStatus,
        accessTokenHash
      );
      const id = Number(orderRes.lastInsertRowid);
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_title, product_slug, file_format, unit_price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of verifiedItems) {
        insertItem.run(
          id,
          item.productId,
          item.title,
          item.slug,
          item.fileFormat,
          item.unitPrice,
          item.quantity,
          item.subtotal
        );
      }
      db.prepare(
        'INSERT INTO payments (order_id, method, amount, status) VALUES (?, ?, ?, ?)'
      ).run(id, paymentMethod, totalAmount, initialPaymentStatus);
      db.prepare(
        'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)'
      ).run(
        id,
        initialPaymentStatus,
        totalAmount === 0
          ? 'Pesanan gratis otomatis selesai.'
          : 'Pesanan dibuat. Menunggu pembayaran dari pembeli.',
        'pembeli'
      );
      return id;
    });

    const createdRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>;
    res.status(201).json({
      order: {
        ...hydrateOrder(createdRow),
        access_token: rawAccessToken,
      },
    });
  });

  router.get('/orders/:orderNumber', optionalAuth, (req: AuthedRequest, res) => {
    const orderNumber = sanitizeText(req.params.orderNumber, 50);
    const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as
      | (Record<string, unknown> & { customer_id: number | null; access_token_hash: string })
      | undefined;

    if (!orderRow) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }

    if (!verifyOrderAccess(req, orderRow)) {
      res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengakses detail pesanan ini.' });
      return;
    }

    res.json({ order: hydrateOrder(orderRow) });
  });

  router.post(
    '/orders/:orderNumber/proof',
    optionalAuth,
    authorizeProofUpload,
    proofUpload.single('proof'),
    (req: AuthedRequest, res) => {
      const orderRow = req.proofOrder!;

      if (!req.file) {
        res.status(400).json({ error: 'Unggah gambar bukti transfer yang valid (JPG, PNG, atau WebP, maks. 5MB).' });
        return;
      }

      const uploadedFile = req.file;
      if (!hasExpectedImageSignature(uploadedFile.path, uploadedFile.mimetype)) {
        fs.unlinkSync(uploadedFile.path);
        res.status(400).json({ error: 'Isi berkas tidak sesuai dengan format gambar yang diizinkan.' });
        return;
      }

      // Store raw original uploaded proof without any alteration or watermark
      runInTransaction(() => {
        db.prepare(
          'INSERT INTO payment_proofs (order_id, file_key, original_filename, mime_type, file_size) VALUES (?, ?, ?, ?, ?)'
        ).run(
          orderRow.id,
          path.basename(uploadedFile.path),
          sanitizeText(uploadedFile.originalname, 200),
          uploadedFile.mimetype,
          uploadedFile.size
        );
        db.prepare(
          "UPDATE orders SET payment_status = 'menunggu_verifikasi', order_status = 'menunggu_verifikasi', updated_at = datetime('now') WHERE id = ?"
        ).run(orderRow.id);
        db.prepare("UPDATE payments SET status = 'menunggu_verifikasi', rejection_reason = '' WHERE order_id = ?").run(
          orderRow.id
        );
        db.prepare(
          'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)'
        ).run(
          orderRow.id,
          'menunggu_verifikasi',
          `Pembeli mengunggah bukti pembayaran (${sanitizeText(uploadedFile.originalname, 120)}).`,
          'pembeli'
        );
      });

      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderRow.id) as Record<string, unknown>;
      res.json({
        message: 'Bukti pembayaran diterima. Tim NusaKlik akan memverifikasi pembayaran Anda.',
        order: hydrateOrder(updated),
      });
    }
  );

  router.get('/orders/:orderNumber/proof/:proofId', optionalAuth, (req: AuthedRequest, res) => {
    const orderNumber = sanitizeText(req.params.orderNumber, 50);
    const proofId = Number(req.params.proofId);
    const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as
      | (Record<string, unknown> & { id: number; customer_id: number | null; access_token_hash: string })
      | undefined;

    if (!orderRow || !verifyOrderAccess(req, orderRow)) {
      res.status(403).json({ error: 'Akses bukti pembayaran ditolak.' });
      return;
    }

    const proof = db
      .prepare('SELECT file_key, mime_type FROM payment_proofs WHERE id = ? AND order_id = ?')
      .get(proofId, orderRow.id) as { file_key: string; mime_type: string } | undefined;

    if (!proof) {
      res.status(404).json({ error: 'Bukti pembayaran tidak ditemukan.' });
      return;
    }

    const resolved = safeResolvePath(PAYMENT_PROOFS_DIR, proof.file_key);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Berkas bukti tidak ditemukan.' });
      return;
    }

    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.type(proof.mime_type);
    res.sendFile(resolved);
  });

  // Issue short-lived signed download URL ONLY if order is verified LUNAS and caller owns it
  router.post('/orders/:orderNumber/download-token/:productId', optionalAuth, (req: AuthedRequest, res) => {
    const orderNumber = sanitizeText(req.params.orderNumber, 50);
    const productId = Number(req.params.productId);

    const orderRow = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber) as
      | (Record<string, unknown> & {
          id: number;
          customer_id: number | null;
          access_token_hash: string;
          payment_status: string;
        })
      | undefined;

    if (!orderRow) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }
    if (!verifyOrderAccess(req, orderRow)) {
      res.status(403).json({ error: 'Anda tidak berhak mengunduh produk dari pesanan ini.' });
      return;
    }
    if (orderRow.payment_status !== 'lunas') {
      res.status(403).json({ error: 'Unduhan hanya dibuka setelah pembayaran diverifikasi dan berstatus Lunas.' });
      return;
    }

    const item = db
      .prepare('SELECT product_id FROM order_items WHERE order_id = ? AND product_id = ?')
      .get(orderRow.id, productId);
    if (!item) {
      res.status(404).json({ error: 'Produk tidak termasuk dalam pesanan ini.' });
      return;
    }

    const dlToken = signToken(
      {
        sub: orderRow.customer_id || 'guest',
        role: 'download',
        orderNumber,
        productId,
      },
      300 // 5 minutes
    );

    res.json({ downloadUrl: `/api/downloads/file?token=${encodeURIComponent(dlToken)}` });
  });

  router.get('/downloads/file', (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'download' || !payload.orderNumber || !payload.productId) {
      res.status(403).json({ error: 'Tautan unduhan tidak valid atau sudah kedaluwarsa.' });
      return;
    }

    const orderRow = db
      .prepare('SELECT id, customer_id, payment_status FROM orders WHERE order_number = ?')
      .get(payload.orderNumber) as { id: number; customer_id: number | null; payment_status: string } | undefined;

    if (!orderRow || orderRow.payment_status !== 'lunas') {
      res.status(403).json({ error: 'Status pembayaran pesanan belum Lunas.' });
      return;
    }

    const item = db
      .prepare('SELECT id FROM order_items WHERE order_id = ? AND product_id = ?')
      .get(orderRow.id, payload.productId);
    if (!item) {
      res.status(403).json({ error: 'Produk tidak valid untuk pesanan ini.' });
      return;
    }

    const product = db
      .prepare('SELECT id, digital_file_key, digital_file_name FROM products WHERE id = ?')
      .get(payload.productId) as { id: number; digital_file_key: string; digital_file_name: string } | undefined;

    if (!product || !product.digital_file_key) {
      res.status(404).json({ error: 'Berkas produk belum tersedia.' });
      return;
    }

    const resolved = safeResolvePath(PRIVATE_PRODUCTS_DIR, product.digital_file_key);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Berkas produk tidak ditemukan di penyimpanan privat.' });
      return;
    }

    db.prepare('UPDATE products SET download_count = download_count + 1 WHERE id = ?').run(product.id);
    db.prepare(
      'INSERT INTO download_logs (order_id, product_id, customer_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
    ).run(
      orderRow.id,
      product.id,
      orderRow.customer_id,
      req.ip || '',
      sanitizeText(req.headers['user-agent'], 200)
    );

    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.download(resolved, product.digital_file_name || path.basename(resolved));
  });

  // ─── ADMIN AUTHENTICATION & FIRST-RUN SETUP ──────────────────────────────────
  router.get('/admin/status', (_req, res) => {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    const envPasscodeActive = Boolean(process.env.ADMIN_PASSCODE?.trim());
    res.json({
      needsSetup: countRow.count === 0 && !envPasscodeActive,
      envPasscodeActive,
      setupTokenRequired: process.env.NODE_ENV === 'production' && countRow.count === 0 && !envPasscodeActive,
    });
  });

  router.post('/admin/setup', limitAuthenticationAttempts, (req, res) => {
    const envPasscodeActive = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };

    if (envPasscodeActive || countRow.count > 0) {
      res.status(403).json({ error: 'Setup admin awal sudah dikunci.' });
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      const setupToken = process.env.ADMIN_SETUP_TOKEN?.trim();
      const suppliedToken = typeof req.body?.setupToken === 'string' ? req.body.setupToken : '';
      if (!setupToken || Buffer.byteLength(setupToken, 'utf8') < 32) {
        res.status(503).json({ error: 'ADMIN_SETUP_TOKEN acak minimal 32 karakter harus dikonfigurasi untuk membuat admin pertama di produksi.' });
        return;
      }
      if (!matchesSecret(suppliedToken, setupToken)) {
        res.status(403).json({ error: 'Kode setup admin tidak valid.' });
        return;
      }
    }

    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !isValidEmail(email) || password.length < 10) {
      res.status(400).json({ error: 'Nama, email valid, dan kata sandi minimal 10 karakter wajib diisi.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const created = runInTransaction(() => {
      const latestCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
      if (latestCount.count > 0) return null;
      const info = db
        .prepare("INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, 'super_admin')")
        .run(name, email, passwordHash);
      const adminId = Number(info.lastInsertRowid);
      return { adminId, token: createAdminSession(adminId, email) };
    });
    if (!created) {
      res.status(403).json({ error: 'Setup admin awal sudah dikunci.' });
      return;
    }

    res.status(201).json({
      token: created.token,
      admin: { id: created.adminId, name, email, role: 'super_admin' },
    });
  });

  router.post('/admin/login', limitAuthenticationAttempts, (req, res) => {
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();

    if (envPasscode && isValidEmail(email) && matchesSecret(password, envPasscode)) {
      const token = createAdminSession(null, email);
      res.json({
        token,
        admin: { id: 0, name: 'Administrator Utama', email, role: 'super_admin' },
      });
      return;
    }

    if (!isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Masukkan email dan kata sandi admin.' });
      return;
    }

    const admin = db
      .prepare('SELECT id, name, email, password_hash, role FROM admins WHERE email = ?')
      .get(email) as
      | { id: number; name: string; email: string; password_hash: string; role: string }
      | undefined;

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      res.status(401).json({ error: 'Kredensial admin tidak sesuai.' });
      return;
    }

    const token = createAdminSession(admin.id, admin.email);
    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  });

  router.post('/admin/logout', requireAdmin, (req: AuthedRequest, res) => {
    const token = extractBearer(req);
    if (token) {
      db.prepare(
        "UPDATE admin_sessions SET revoked_at = datetime('now') WHERE token_hash = ? AND revoked_at IS NULL"
      ).run(sha256Hex(token));
    }
    res.json({ ok: true });
  });

  router.get('/admin/me', requireAdmin, (req: AuthedRequest, res) => {
    if (Number(req.auth!.sub) === 0) {
      res.json({
        admin: { id: 0, name: 'Administrator Utama', email: req.auth!.email || 'admin@nusaklik.id', role: 'super_admin' },
      });
      return;
    }
    const admin = db
      .prepare('SELECT id, name, email, role FROM admins WHERE id = ?')
      .get(Number(req.auth!.sub));
    if (!admin) {
      res.status(404).json({ error: 'Admin tidak ditemukan.' });
      return;
    }
    res.json({ admin });
  });

  // ─── ADMIN PROTECTED RESOURCES ───────────────────────────────────────────────
  router.get('/admin/summary', requireAdmin, (_req, res) => {
    const revRow = db
      .prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'lunas'")
      .get() as { total: number };
    const totalOrdersRow = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    const pendingOrdersRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE payment_status IN ('menunggu_pembayaran', 'menunggu_verifikasi')"
      )
      .get() as { count: number };
    const awaitingPayRow = db
      .prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'menunggu_pembayaran'")
      .get() as { count: number };
    const awaitingVerifyRow = db
      .prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'menunggu_verifikasi'")
      .get() as { count: number };
    const paidOrdersRow = db
      .prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'lunas'")
      .get() as { count: number };
    const prodRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    const custRow = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };

    const recentRows = db
      .prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 8')
      .all() as Array<Record<string, unknown>>;

    res.json({
      summary: {
        total_revenue: revRow.total,
        total_orders: totalOrdersRow.count,
        pending_orders: pendingOrdersRow.count,
        awaiting_payment_orders: awaitingPayRow.count,
        awaiting_verification_orders: awaitingVerifyRow.count,
        paid_orders: paidOrdersRow.count,
        total_products: prodRow.count,
        total_customers: custRow.count,
        recent_orders: recentRows.map(hydrateOrder),
      },
    });
  });

  // Admin Products CRUD
  router.get('/admin/products', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, c.is_book_format,
          (p.digital_file_key != '') as has_digital_file
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ORDER BY p.created_at DESC, p.id DESC`
      )
      .all();
    res.json({ products: rows });
  });

  router.post('/admin/products', requireAdmin, (req, res) => {
    const title = sanitizeText(req.body?.title, 180);
    const categoryId = Number(req.body?.category_id);
    if (!title || !Number.isInteger(categoryId) || categoryId <= 0) {
      res.status(400).json({ error: 'Judul produk dan kategori wajib diisi.' });
      return;
    }
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)) {
      res.status(400).json({ error: 'Kategori produk tidak ditemukan.' });
      return;
    }

    const price = Number(req.body?.price);
    if (!Number.isSafeInteger(price) || price < 0) {
      res.status(400).json({ error: 'Harga harus berupa bilangan bulat nol atau lebih.' });
      return;
    }
    const discountRaw = req.body?.discount_price;
    const discountPrice =
      discountRaw !== null && discountRaw !== '' && discountRaw !== undefined ? Number(discountRaw) : null;
    if (
      discountPrice !== null &&
      (!Number.isSafeInteger(discountPrice) || discountPrice <= 0 || discountPrice >= price)
    ) {
      res.status(400).json({ error: 'Harga diskon harus bilangan bulat positif dan lebih kecil dari harga normal.' });
      return;
    }

    const digitalFileKey = sanitizeText(req.body?.digital_file_key, 200);
    const isActive = req.body?.is_active !== false && req.body?.is_active !== 0;
    if (digitalFileKey && !storedProductFileExists(digitalFileKey)) {
      res.status(400).json({ error: 'Berkas produk yang dipilih tidak tersedia di penyimpanan privat.' });
      return;
    }
    if (isActive && !digitalFileKey) {
      res.status(400).json({ error: 'Unggah berkas produk sebelum mengaktifkan produk.' });
      return;
    }

    const baseSlug = slugify(sanitizeText(req.body?.slug, 100) || title) || `produk-${Date.now()}`;
    const dupSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(baseSlug);
    const finalSlug = dupSlug ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}` : baseSlug;
    const isFree = req.body?.is_free ? 1 : price === 0 ? 1 : 0;

    const info = db
      .prepare(
        `INSERT INTO products (
          category_id, title, slug, summary, description, benefits,
          price, discount_price, is_free, allow_public_free_download,
          is_featured, is_popular, is_promo, is_active, allow_quantity,
          file_format, file_size_label, license_type, cover_url, cover_aspect_type,
          digital_file_key, digital_file_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        categoryId,
        title,
        finalSlug,
        sanitizeText(req.body?.summary, 400),
        sanitizeText(req.body?.description, 6000),
        sanitizeText(req.body?.benefits, 2000),
        isFree ? 0 : price,
        isFree ? null : discountPrice,
        isFree,
        req.body?.allow_public_free_download ? 1 : 0,
        req.body?.is_featured ? 1 : 0,
        req.body?.is_popular ? 1 : 0,
        req.body?.is_promo ? 1 : 0,
        isActive ? 1 : 0,
        req.body?.allow_quantity ? 1 : 0,
        sanitizeText(req.body?.file_format, 60) || 'PDF',
        sanitizeText(req.body?.file_size_label, 80),
        sanitizeText(req.body?.license_type, 140) || 'Lisensi Penggunaan Pribadi',
        sanitizeText(req.body?.cover_url, 300),
        req.body?.cover_aspect_type === 'digital' ? 'digital' : 'book',
        digitalFileKey,
        sanitizeText(req.body?.digital_file_name, 200)
      );

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json({ product: created });
  });

  router.put('/admin/products/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }

    const title = sanitizeText(req.body?.title, 180) || String(existing.title);
    const categoryId =
      req.body?.category_id === undefined ? Number(existing.category_id) : Number(req.body.category_id);
    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      !db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
    ) {
      res.status(400).json({ error: 'Kategori produk tidak ditemukan.' });
      return;
    }

    const price = Number(req.body?.price ?? existing.price);
    if (!Number.isSafeInteger(price) || price < 0) {
      res.status(400).json({ error: 'Harga harus berupa bilangan bulat nol atau lebih.' });
      return;
    }
    const discountRaw = req.body?.discount_price;
    const discountPrice =
      discountRaw !== null && discountRaw !== '' && discountRaw !== undefined ? Number(discountRaw) : null;
    if (
      discountPrice !== null &&
      (!Number.isSafeInteger(discountPrice) || discountPrice <= 0 || discountPrice >= price)
    ) {
      res.status(400).json({ error: 'Harga diskon harus bilangan bulat positif dan lebih kecil dari harga normal.' });
      return;
    }
    const isFree = req.body?.is_free ? 1 : price === 0 ? 1 : 0;
    const digitalFileKey = sanitizeText(req.body?.digital_file_key, 200) || String(existing.digital_file_key || '');
    const isActive = req.body?.is_active === undefined ? Boolean(existing.is_active) : Boolean(req.body.is_active);
    if (digitalFileKey && !storedProductFileExists(digitalFileKey)) {
      res.status(400).json({ error: 'Berkas produk yang dipilih tidak tersedia di penyimpanan privat.' });
      return;
    }
    if (isActive && !digitalFileKey) {
      res.status(400).json({ error: 'Unggah berkas produk sebelum mengaktifkan produk.' });
      return;
    }

    db.prepare(
      `UPDATE products SET
        category_id = ?, title = ?, summary = ?, description = ?, benefits = ?,
        price = ?, discount_price = ?, is_free = ?, allow_public_free_download = ?,
        is_featured = ?, is_popular = ?, is_promo = ?, is_active = ?, allow_quantity = ?,
        file_format = ?, file_size_label = ?, license_type = ?, cover_url = ?, cover_aspect_type = ?,
        digital_file_key = COALESCE(NULLIF(?, ''), digital_file_key),
        digital_file_name = COALESCE(NULLIF(?, ''), digital_file_name),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      categoryId,
      title,
      sanitizeText(req.body?.summary, 400),
      sanitizeText(req.body?.description, 6000),
      sanitizeText(req.body?.benefits, 2000),
      isFree ? 0 : price,
      isFree ? null : discountPrice,
      isFree,
      req.body?.allow_public_free_download ? 1 : 0,
      req.body?.is_featured ? 1 : 0,
      req.body?.is_popular ? 1 : 0,
      req.body?.is_promo ? 1 : 0,
      isActive ? 1 : 0,
      req.body?.allow_quantity ? 1 : 0,
      sanitizeText(req.body?.file_format, 60) || 'PDF',
      sanitizeText(req.body?.file_size_label, 80),
      sanitizeText(req.body?.license_type, 140) || 'Lisensi Penggunaan Pribadi',
      req.body?.cover_url !== undefined ? sanitizeText(req.body.cover_url, 300) : String(existing.cover_url),
      req.body?.cover_aspect_type === 'digital' ? 'digital' : 'book',
      digitalFileKey,
      sanitizeText(req.body?.digital_file_name, 200),
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ product: updated });
  });

  router.delete('/admin/products/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const hasOrders = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id) as {
      count: number;
    };
    if (hasOrders.count > 0) {
      db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
      res.json({ ok: true, deactivated: true, message: 'Produk dinonaktifkan karena sudah memiliki riwayat transaksi.' });
      return;
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // Admin Uploads
  router.post('/admin/upload/cover', requireAdmin, imageUpload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Unggah file gambar cover (JPG, PNG, WebP, maks. 5MB).' });
      return;
    }
    if (!hasExpectedImageSignature(req.file.path, req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Isi berkas tidak sesuai dengan format gambar yang diizinkan.' });
      return;
    }
    res.json({ url: `/api/uploads/${path.basename(req.file.path)}` });
  });

  router.post('/admin/upload/brand-asset', requireAdmin, imageUpload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Unggah file aset visual yang valid (maks. 5MB).' });
      return;
    }
    if (!hasExpectedImageSignature(req.file.path, req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Isi berkas tidak sesuai dengan format gambar yang diizinkan.' });
      return;
    }
    res.json({ url: `/api/uploads/${path.basename(req.file.path)}` });
  });

  router.post(
    '/admin/upload/digital-file',
    requireAdmin,
    digitalProductUpload.single('file'),
    (req, res) => {
      if (!req.file) {
        res.status(400).json({ error: 'Unggah file produk digital yang valid (maks. 50MB).' });
        return;
      }
      res.json({
        fileKey: path.basename(req.file.path),
        fileName: sanitizeText(req.file.originalname, 200),
        sizeBytes: req.file.size,
      });
    }
  );

  // Admin Categories CRUD
  router.post('/admin/categories', requireAdmin, (req, res) => {
    const name = sanitizeText(req.body?.name, 80);
    if (!name) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }
    const slug = slugify(sanitizeText(req.body?.slug, 80) || name);
    const exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (exists) {
      res.status(409).json({ error: 'Slug kategori sudah digunakan.' });
      return;
    }
    const info = db
      .prepare('INSERT INTO categories (name, slug, description, is_book_format, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(
        name,
        slug,
        sanitizeText(req.body?.description, 300),
        req.body?.is_book_format ? 1 : 0,
        Number(req.body?.sort_order) || 99
      );
    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json({ category: created });
  });

  router.put('/admin/categories/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const name = sanitizeText(req.body?.name, 80);
    if (!name) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }
    db.prepare('UPDATE categories SET name = ?, description = ?, is_book_format = ?, sort_order = ? WHERE id = ?').run(
      name,
      sanitizeText(req.body?.description, 300),
      req.body?.is_book_format ? 1 : 0,
      Number(req.body?.sort_order) || 0,
      id
    );
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ category: updated });
  });

  router.delete('/admin/categories/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const used = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id) as {
      count: number;
    };
    if (used.count > 0) {
      res.status(400).json({ error: 'Kategori tidak dapat dihapus karena masih memiliki produk.' });
      return;
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // Admin Orders Management
  router.get('/admin/orders', requireAdmin, (req, res) => {
    const status = sanitizeText(req.query.status, 40);
    const rows = (
      status
        ? db.prepare('SELECT * FROM orders WHERE payment_status = ? ORDER BY created_at DESC, id DESC').all(status)
        : db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all()
    ) as Array<Record<string, unknown>>;
    res.json({ orders: rows.map(hydrateOrder) });
  });

  router.patch('/admin/orders/:orderNumber/status', requireAdmin, (req: AuthedRequest, res) => {
    const orderNumber = sanitizeText(req.params.orderNumber, 50);
    const newStatus = sanitizeText(req.body?.payment_status, 40);
    const rejectionReason = sanitizeText(req.body?.rejection_reason, 300);
    const adminNotes = sanitizeText(req.body?.admin_notes, 500);

    const allowed = ['menunggu_pembayaran', 'menunggu_verifikasi', 'lunas', 'ditolak'];
    if (!allowed.includes(newStatus)) {
      res.status(400).json({ error: 'Status pembayaran tidak valid.' });
      return;
    }

    const orderRow = db.prepare('SELECT id, total_amount, payment_status FROM orders WHERE order_number = ?').get(orderNumber) as
      | { id: number; total_amount: number; payment_status: string }
      | undefined;
    if (!orderRow) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }

    if (newStatus === 'lunas' && orderRow.total_amount > 0) {
      const proofCount = db.prepare('SELECT COUNT(*) as count FROM payment_proofs WHERE order_id = ?').get(orderRow.id) as {
        count: number;
      };
      if (orderRow.payment_status !== 'menunggu_verifikasi' || proofCount.count === 0) {
        res.status(400).json({ error: 'Pembayaran hanya dapat disetujui setelah bukti pembayaran diunggah.' });
        return;
      }
    }

    const historyNote =
      newStatus === 'lunas'
        ? 'Pembayaran diverifikasi dan disetujui (Lunas).'
        : newStatus === 'ditolak'
          ? `Pembayaran ditolak: ${rejectionReason || 'Bukti pembayaran tidak valid atau nominal tidak sesuai.'}`
          : `Status diubah menjadi ${newStatus}.`;
    runInTransaction(() => {
      db.prepare(
        "UPDATE orders SET payment_status = ?, order_status = ?, admin_notes = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newStatus, newStatus, adminNotes, orderRow.id);
      if (newStatus === 'lunas') {
        db.prepare(
          "UPDATE payments SET status = 'lunas', verified_by = ?, verified_at = datetime('now'), rejection_reason = '' WHERE order_id = ?"
        ).run(Number(req.auth!.sub), orderRow.id);
      } else if (newStatus === 'ditolak') {
        db.prepare(
          "UPDATE payments SET status = 'ditolak', verified_by = ?, verified_at = datetime('now'), rejection_reason = ? WHERE order_id = ?"
        ).run(
          Number(req.auth!.sub),
          rejectionReason || 'Bukti pembayaran tidak valid atau nominal tidak sesuai.',
          orderRow.id
        );
      } else {
        db.prepare('UPDATE payments SET status = ? WHERE order_id = ?').run(newStatus, orderRow.id);
      }
      db.prepare(
        'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)'
      ).run(orderRow.id, newStatus, historyNote, req.auth!.email || 'admin');
    });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderRow.id) as Record<string, unknown>;
    res.json({ order: hydrateOrder(updated) });
  });

  // Admin Customers
  router.get('/admin/customers', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT c.id, c.name, c.email, c.whatsapp, c.created_at,
          COUNT(o.id) as order_count,
          COALESCE(SUM(CASE WHEN o.payment_status = 'lunas' THEN o.total_amount ELSE 0 END), 0) as total_spent
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      )
      .all();
    res.json({ customers: rows });
  });

  router.get('/admin/customers/:id/orders', requireAdmin, (req, res) => {
    const customerId = Number(req.params.id);
    const rows = db
      .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC')
      .all(customerId) as Array<Record<string, unknown>>;
    res.json({ orders: rows.map(hydrateOrder) });
  });

  // Admin Settings
  router.get('/admin/settings', requireAdmin, (_req, res) => {
    res.json({ settings: getStoreSettings() });
  });

  router.put('/admin/settings', requireAdmin, (req, res) => {
    const payload = req.body?.settings;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Format pengaturan tidak valid.' });
      return;
    }

    const allowedKeys = [
      'tagline_main',
      'tagline_sub',
      'store_description',
      'logo_url',
      'logo_white_url',
      'banner_hero_url',
      'banner_promo_url',
      'banner_promo_title',
      'banner_promo_subtitle',
      'watermark_url',
      'favicon_url',
      'whatsapp_number',
      'email',
      'bank_name',
      'bank_account_number',
      'bank_account_holder',
      'qris_image_url',
      'qris_nmid',
      'social_instagram',
      'social_tiktok',
      'social_youtube',
      'footer_text',
      'policy_privacy',
      'policy_terms',
      'policy_refund',
      'purchase_guide',
    ];

    const stmt = db.prepare(
      "INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    );
    runInTransaction(() => {
      for (const key of allowedKeys) {
        if (key in payload) {
          stmt.run(key, sanitizeText((payload as Record<string, unknown>)[key], 4000));
        }
      }
    });

    res.json({ settings: getStoreSettings() });
  });

  router.get('/admin/messages', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100').all();
    res.json({ messages: rows });
  });

  return router;
}
