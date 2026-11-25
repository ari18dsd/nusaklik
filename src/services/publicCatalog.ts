import { STATIC_CATEGORIES } from '../config/staticCatalog';
import { siteAsset } from '../config/staticSite';
import type { Category, Product } from '../types';
import { isSafeUrl } from '../utils/format';

const PUBLIC_CATALOG_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwHUTHcs4jdi7j0f2o_xmcbKqJenQKPcvF9Neqgq6MuYghQq-IPyd75C5LMZC2nInj6PQ/exec';
const MANUAL_ORDER_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdVyuHpMbOoUP74bXkGkascy1qSjv7mjceIPDv0NNAD4PDi3g/viewform?usp=publish-editor';
const REQUEST_TIMEOUT_MS = 15000;
let callbackSequence = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readField(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function readText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readPrice(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const price = Number(digits);
  return Number.isSafeInteger(price) ? price : null;
}

function normalizeCategory(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]/g, '');
}

function getCategory(value: string): Category {
  const key = normalizeCategory(value);
  return (
    STATIC_CATEGORIES.find(
      (category) =>
        normalizeCategory(category.name) === key || normalizeCategory(category.slug) === key
    ) ??
    STATIC_CATEGORIES.find((category) => category.slug === 'produk-digital-lainnya') ??
    STATIC_CATEGORIES[0]
  );
}

function createSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getCoverUrl(value: unknown): string {
  const cover = readText(value);
  if (!cover || cover.startsWith('//') || /\.pdf(?:$|[?#])/i.test(cover)) return '';

  if (/^https?:\/\//i.test(cover)) {
    try {
      const url = new URL(cover);
      const host = url.hostname.toLocaleLowerCase('en-US');
      if (
        url.protocol !== 'https:' ||
        host === 'drive.google.com' ||
        host.endsWith('.drive.google.com') ||
        host === 'docs.google.com' ||
        host.endsWith('.docs.google.com') ||
        !isSafeUrl(cover)
      ) {
        return '';
      }
      return cover;
    } catch {
      return '';
    }
  }

  if (
    cover.includes('\\') ||
    /^[a-z][a-z\d+.-]*:/i.test(cover) ||
    cover.split(/[?#]/, 1)[0].split('/').includes('..')
  ) {
    return '';
  }
  return siteAsset(cover);
}

export function mapPublicCatalog(payload: unknown): Product[] {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.products)
      ? payload.products
      : null;
  if (!rows) throw new Error('Respons katalog Admin memiliki format yang tidak valid.');

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const products: Product[] = [];

  rows.forEach((value, index) => {
    if (!isRecord(value)) {
      throw new Error('Data produk Admin memiliki format yang tidak valid.');
    }

    const status = readField(value, 'status', 'Status');
    if (status !== undefined && readText(status).toLocaleLowerCase('id-ID') !== 'aktif') return;

    const sourceId = readText(readField(value, 'id', 'ID'));
    const title = readText(readField(value, 'nama', 'Nama Produk', 'title'));
    const categoryName = readText(readField(value, 'kategori', 'Kategori', 'category'));
    const description = readText(readField(value, 'deskripsi', 'Deskripsi', 'description'));
    const price = readPrice(readField(value, 'harga', 'Harga', 'price'));
    if (!sourceId || !title || !categoryName || price === null) {
      throw new Error('Data produk Admin harus memiliki ID, nama, kategori, dan harga yang valid.');
    }
    if (seenIds.has(sourceId)) {
      throw new Error('Respons katalog Admin memuat ID produk duplikat.');
    }
    seenIds.add(sourceId);

    const category = getCategory(categoryName);
    const baseSlug = createSlug(title) || `produk-${createSlug(sourceId) || index + 1}`;
    let slug = baseSlug;
    if (seenSlugs.has(slug)) {
      slug = `${baseSlug}-${createSlug(sourceId) || index + 1}`;
    }
    let suffix = 2;
    while (seenSlugs.has(slug)) {
      slug = `${baseSlug}-${createSlug(sourceId) || index + 1}-${suffix}`;
      suffix += 1;
    }
    seenSlugs.add(slug);

    const firstParagraph = description.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
    const summary =
      firstParagraph.length > 180 ? `${firstParagraph.slice(0, 177).trimEnd()}...` : firstParagraph;

    products.push({
      id: index + 1,
      category_id: category.id,
      category_name: category.name,
      category_slug: category.slug,
      is_book_format: category.is_book_format,
      title,
      slug,
      summary: summary || 'Produk digital pilihan dari NusaKlik.',
      description,
      benefits: '',
      price,
      discount_price: null,
      is_free: 0,
      allow_public_free_download: 0,
      is_featured: 0,
      is_popular: 0,
      is_promo: 0,
      is_active: 1,
      allow_quantity: 0,
      file_format: 'Digital',
      file_size_label: 'Informasi file diberikan setelah pembayaran diverifikasi.',
      license_type: '',
      cover_url: getCoverUrl(readField(value, 'cover', 'Cover', 'cover_url')),
      cover_aspect_type: category.is_book_format === 1 ? 'book' : 'digital',
      digital_file_name: '',
      has_digital_file: false,
      manual_order_url: MANUAL_ORDER_URL,
      download_count: 0,
      created_at: '',
      updated_at: '',
    });
  });

  return products;
}

export function loadPublicCatalog(): Promise<Product[]> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Katalog Admin hanya dapat dimuat di browser.'));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__nusaklikPublicCatalog_${Date.now().toString(36)}_${(
      callbackSequence++
    ).toString(36)}`;
    const script = document.createElement('script');
    let timeoutId = 0;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.onerror = null;
      script.remove();
      Reflect.deleteProperty(window, callbackName);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const handlePayload = (payload: unknown) => {
      if (settled) return;
      try {
        const products = mapPublicCatalog(payload);
        settled = true;
        cleanup();
        resolve(products);
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Katalog Admin gagal diproses.'));
      }
    };

    if (
      !Reflect.defineProperty(window, callbackName, {
        configurable: true,
        value: handlePayload,
      })
    ) {
      reject(new Error('Callback katalog Admin tidak dapat dibuat.'));
      return;
    }

    const endpoint = new URL(PUBLIC_CATALOG_ENDPOINT);
    endpoint.searchParams.set('action', 'products');
    endpoint.searchParams.set('callback', callbackName);
    endpoint.searchParams.set('_', String(Date.now()));
    script.async = true;
    script.src = endpoint.toString();
    script.onerror = () => fail(new Error('Katalog Admin Google Sheets tidak dapat diakses.'));
    timeoutId = window.setTimeout(
      () => fail(new Error('Waktu tunggu katalog Admin Google Sheets habis.')),
      REQUEST_TIMEOUT_MS
    );

    try {
      document.head.appendChild(script);
    } catch {
      fail(new Error('Katalog Admin Google Sheets tidak dapat dimuat.'));
    }
  });
}
