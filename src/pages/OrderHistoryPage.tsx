import { ArrowRight, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { Order } from '../types';
import { formatRupiah, formatTanggal, PAYMENT_STATUS_META } from '../utils/format';

export function OrderHistoryPage() {
  const { customerToken, customer, showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerToken) return;
    apiRequest<{ orders: Order[] }>('/customer/orders', { token: customerToken })
      .then((res) => setOrders(res.orders))
      .catch((err) => showToast(err instanceof Error ? err.message : 'Riwayat pesanan gagal dimuat.', 'error'))
      .finally(() => setLoading(false));
  }, [customerToken, showToast]);

  if (!customerToken || !customer) {
    return <Navigate to="/masuk" replace />;
  }

  return (
    <div className="bg-white min-h-[75vh] py-10 sm:py-14">
      <SeoHead title="Riwayat Pesanan" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#345477]/12 pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#26364A]">Riwayat Pesanan</h1>
            <p className="text-sm text-[#7890AA] mt-1">
              Pantau status pembayaran, unggah bukti transfer, lihat invoice A4, dan unduh produk.
            </p>
          </div>
          <Link to="/akun" className="text-sm font-semibold text-[#345477] hover:text-[#B89143]">
            ← Kembali ke Akun
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 rounded-xl border border-[#345477]/12 animate-pulse bg-white" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center border border-[#345477]/14 rounded-2xl space-y-4">
            <Receipt className="w-10 h-10 text-[#7890AA] mx-auto" />
            <h2 className="font-display text-xl font-semibold text-[#26364A]">
              Belum Ada Riwayat Pesanan
            </h2>
            <p className="text-sm text-[#7890AA]">
              Pesanan yang Anda buat saat masuk akun akan tampil di halaman ini.
            </p>
            <Link
              to="/katalog"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-6 rounded-xl border border-[#345477]/15 bg-white space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#345477]/10 pb-4">
                  <div>
                    <p className="font-mono-num text-base font-bold text-[#345477]">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-[#7890AA]">{formatTanggal(order.created_at)}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg border text-xs font-semibold ${
                      PAYMENT_STATUS_META[order.payment_status].toneClass
                    }`}
                  >
                    {PAYMENT_STATUS_META[order.payment_status].label}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="text-[#26364A]">
                        {item.product_title} ({item.quantity}x)
                      </span>
                      <span className="font-mono-num text-[#7890AA]">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#345477]/10 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#7890AA] mr-2">Total:</span>
                    <span className="font-mono-num text-base font-bold text-[#26364A]">
                      {formatRupiah(order.total_amount)}
                    </span>
                  </div>
                  <Link
                    to={`/pesanan/${encodeURIComponent(order.order_number)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462]"
                  >
                    <span>Detail, Unduhan & Invoice</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D6B36A]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
