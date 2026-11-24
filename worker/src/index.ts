/**
 * Experimental Cloudflare adapter. It does not implement the store's order,
 * payment, or admin APIs and must not be used as a production backend.
 */

export interface Env {
  DB: D1Database;
  PRIVATE_BUCKET: R2Bucket;
  SESSION_SECRET: string;
  ALLOWED_ORIGIN: string;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: { last_row_id: number } }>;
}
interface R2Bucket {
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
}

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allow = allowedOrigin && origin === allowedOrigin ? origin : allowedOrigin || '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Order-Access-Token',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === '/api/settings' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT key, value FROM store_settings').all<{
        key: string;
        value: string;
      }>();
      const settings: Record<string, string> = {};
      for (const r of results) settings[r.key] = r.value;
      return new Response(JSON.stringify({ settings }), { headers });
    }

    if (url.pathname === '/api/categories' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
         FROM categories c ORDER BY c.sort_order ASC`
      ).all();
      return new Response(JSON.stringify({ categories: results }), { headers });
    }

    if (url.pathname === '/api/products' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT p.id, p.category_id, c.name as category_name, c.slug as category_slug, c.is_book_format,
          p.title, p.slug, p.summary, p.price, p.discount_price, p.is_free, p.allow_public_free_download,
          p.is_featured, p.is_popular, p.is_promo, p.file_format, p.file_size_label, p.license_type,
          p.cover_url, p.cover_aspect_type, p.download_count, p.created_at
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE p.is_active = 1 ORDER BY p.created_at DESC`
      ).all();
      return new Response(JSON.stringify({ products: results, total: results.length }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint tidak ditemukan.' }), { status: 404, headers });
  },
};
