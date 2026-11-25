import { Printer } from 'lucide-react';
import { siteAsset } from '../config/staticSite';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import { formatRupiah, formatTanggal, isSafeUrl, PAYMENT_STATUS_META } from '../utils/format';

interface InvoiceDocumentProps {
  order: Order;
}

export function InvoiceDocument({ order }: InvoiceDocumentProps) {
  const { settings } = useStore();
  const logoSrc = isSafeUrl(settings.logo_url)
    ? settings.logo_url
    : siteAsset('assets/logo/logo-horizontal.svg');
  const watermarkSrc = isSafeUrl(settings.watermark_url)
    ? settings.watermark_url
    : siteAsset('assets/watermark/watermark-blue.png');

  const statusMeta = PAYMENT_STATUS_META[order.payment_status];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#7890AA]">
          Dokumen transaksi resmi NusaKlik (Format A4 siap cetak atau simpan sebagai PDF).
        </p>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#D6B36A]" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* A4 White Invoice Sheet with Transparent NusaKlik Watermark */}
      <div className="print-only-invoice relative bg-white border border-[#345477]/20 rounded-xl p-6 sm:p-10 shadow-sm overflow-hidden max-w-[820px] mx-auto">
        {/* Transparent PNG Watermark centered subtly behind content */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <img
            src={watermarkSrc}
            alt=""
            className="w-[72%] max-w-[480px] opacity-40 object-contain"
          />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-[#D6B36A]">
            <div className="space-y-2">
              <img src={logoSrc} alt={settings.store_name} className="h-9 w-auto object-contain" />
              <p className="text-xs text-[#7890AA]">{settings.tagline_main}</p>
              {(settings.email || settings.whatsapp_number) && (
                <p className="text-xs text-[#26364A]">
                  {[
                    settings.email || '',
                    settings.whatsapp_number
                      ? `WhatsApp +${settings.whatsapp_number.replace(/[^\d]/g, '')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <div className="sm:text-right space-y-1">
              <p className="text-xs uppercase tracking-widest text-[#7890AA] font-semibold">
                Nota & Invoice Resmi
              </p>
              <p className="font-mono-num text-lg font-bold text-[#345477]">{order.order_number}</p>
              <p className="text-xs text-[#7890AA]">{formatTanggal(order.created_at)}</p>
            </div>
          </div>

          {/* Buyer & Payment Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7890AA]">
                Ditagihkan Kepada
              </p>
              <p className="font-semibold text-[#26364A] text-base">{order.buyer_name}</p>
              <p className="text-[#26364A]">{order.buyer_email}</p>
              <p className="font-mono-num text-[#7890AA]">{order.buyer_whatsapp}</p>
            </div>

            <div className="sm:text-right space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7890AA]">
                Detail Pembayaran
              </p>
              <p className="text-[#26364A]">
                Metode:{' '}
                <span className="font-semibold">
                  {order.payment_method === 'qris'
                    ? 'QRIS'
                    : settings.bank_name
                      ? `Transfer Bank (${settings.bank_name})`
                      : 'Transfer Bank'}
                </span>
              </p>
              <p className="text-[#26364A]">
                Status:{' '}
                <span className="font-semibold text-[#345477]">{statusMeta.label}</span>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y border-[#345477]/20 text-left text-xs uppercase tracking-wider text-[#7890AA]">
                  <th className="py-3 pr-4 font-semibold">Produk Digital</th>
                  <th className="py-3 px-3 font-semibold">Format</th>
                  <th className="py-3 px-3 font-semibold text-right">Harga</th>
                  <th className="py-3 px-3 font-semibold text-right">Jml</th>
                  <th className="py-3 pl-3 font-semibold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#345477]/10">
                {(order.items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3.5 pr-4 font-medium text-[#26364A]">{item.product_title}</td>
                    <td className="py-3.5 px-3 text-[#7890AA]">{item.file_format}</td>
                    <td className="py-3.5 px-3 text-right font-mono-num text-[#26364A]">
                      {formatRupiah(item.unit_price)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono-num text-[#26364A]">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 pl-3 text-right font-mono-num font-semibold text-[#26364A]">
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-2 border-t border-[#345477]/20 pt-4">
              <div className="flex items-center justify-between text-sm text-[#7890AA]">
                <span>Total Item</span>
                <span className="font-mono-num">
                  {(order.items || []).reduce((acc, i) => acc + i.quantity, 0)} produk
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-[#345477] pt-2 border-t border-[#D6B36A]/50">
                <span>Total Pembayaran</span>
                <span className="font-mono-num">{formatRupiah(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 border-t border-[#345477]/15 text-xs text-[#7890AA] flex flex-col sm:flex-row justify-between gap-3">
            <p>
              Dokumen ini diterbitkan secara otomatis oleh sistem {settings.store_name}. Simpan nota
              ini sebagai bukti transaksi resmi.
            </p>
            <p className="font-medium text-[#345477] shrink-0">{settings.tagline_sub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
