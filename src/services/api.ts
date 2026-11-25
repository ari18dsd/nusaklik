import { IS_STATIC_SITE } from '../config/staticSite';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  orderAccessToken?: string | null;
  isFormData?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (IS_STATIC_SITE) {
    throw new ApiError('Fitur ini memerlukan server toko dan tidak tersedia pada situs statis.', 503);
  }

  const { method = 'GET', body, token, orderAccessToken, isFormData = false } = options;

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orderAccessToken) {
    headers['X-Order-Access-Token'] = orderAccessToken;
  }
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (res.ok) {
      throw new ApiError('Server mengirim respons yang tidak valid.', res.status);
    }
  }

  if (!res.ok) {
    const error = data && typeof data === 'object' && 'error' in data ? data.error : undefined;
    throw new ApiError(typeof error === 'string' ? error : 'Permintaan tidak dapat diproses.', res.status);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError('Server mengirim respons dengan format yang tidak valid.', res.status);
  }
  return data as T;
}
