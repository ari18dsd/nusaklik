import type { PaymentStatus } from '../types';

export function formatRupiah(amount: number): string {
  if (amount === 0) return 'Gratis';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTanggal(isoString: string): string {
  if (!isoString) return '-';
  const normalized = isoString.includes('T') ? isoString : isoString.replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; toneClass: string; description: string }
> = {
  menunggu_pembayaran: {
    label: 'Menunggu Pembayaran',
    toneClass: 'text-[#B89143] border-[#D6B36A]/45 bg-[#D6B36A]/10',
    description: 'Silakan lakukan pembayaran lalu unggah bukti transfer pada halaman ini.',
  },
  menunggu_verifikasi: {
    label: 'Menunggu Verifikasi',
    toneClass: 'text-[#345477] border-[#345477]/30 bg-[#345477]/5',
    description: 'Bukti pembayaran telah diterima dan sedang diperiksa oleh admin NusaKlik.',
  },
  lunas: {
    label: 'Lunas',
    toneClass: 'text-[#26364A] border-[#345477] bg-[#345477] text-white',
    description: 'Pembayaran telah diverifikasi. Tautan unduhan produk digital Anda telah aktif.',
  },
  ditolak: {
    label: 'Pembayaran Ditolak',
    toneClass: 'text-[#991B1B] border-[#991B1B]/30 bg-[#991B1B]/5',
    description: 'Bukti pembayaran perlu diperbaiki atau nominal belum sesuai. Silakan unggah ulang.',
  },
};

export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getEffectivePrice(price: number, discountPrice: number | null, isFree: number): number {
  if (isFree) return 0;
  if (discountPrice !== null && discountPrice < price) return discountPrice;
  return price;
}
