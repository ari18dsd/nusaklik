import { Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function StaticDemoNotice() {
  const { publicCatalogLoading, publicCatalogError, publicCatalogSource } = useStore();
  const isFallback = publicCatalogSource === 'fallback';

  return (
    <div className="border-b border-[#D6B36A]/50 bg-[#F5F0E6]">
      <div className="mx-auto flex max-w-7xl items-start gap-2.5 px-4 py-3 text-xs leading-relaxed text-[#345477] sm:px-6 sm:text-sm lg:px-8">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#B89143]" aria-hidden="true" />
        <div className="space-y-1">
          <p aria-live="polite">
            <strong>Status katalog:</strong>{' '}
            {publicCatalogLoading
              ? 'Sedang memuat katalog produk dari Admin Google Sheets.'
              : isFallback
                ? 'Katalog Admin tidak tersedia; situs menggunakan katalog cadangan.'
                : 'Produk aktif dimuat dari katalog Admin Google Sheets.'}
          </p>
          {publicCatalogError && (
            <p role="alert" className="font-semibold text-[#8A6420]">
              {publicCatalogError}
            </p>
          )}
          <p>
            Gunakan tombol <strong>Pesan Sekarang</strong> untuk membuka Google Form. Pembayaran
            diverifikasi manual; file produk privat diberikan setelah verifikasi dan tidak tersedia
            sebagai tautan publik. Checkout otomatis, akun, dan unduhan tidak tersedia di situs
            statis.
          </p>
          {isFallback && (
            <p>
              Katalog cadangan berisi entri DEMO yang bukan penawaran aktif. Hanya produk dengan
              tombol pemesanan yang dapat dipesan secara manual.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
