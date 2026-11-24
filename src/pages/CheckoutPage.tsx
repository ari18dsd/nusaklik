import { Building2, QrCode, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { CartItem, Order, PaymentMethod } from '../types';
import { formatRupiah, getEffectivePrice } from '../utils/format';

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const directBuyItem = (location.state as { directBuyItem?: CartItem } | null)?.directBuyItem;

  const {
    cart,
    clearCart,
    customer,
    customerToken,
    settings,
    saveOrderAccessToken,
    showToast,
  } = useStore();

  const checkoutItems: CartItem[] = directBuyItem ? [directBuyItem] : cart;
  const checkoutTotal = checkoutItems.reduce(
    (sum, item) =>
      sum +
      getEffectivePrice(item.product.price, item.product.discount_price, item.product.is_free) *
        item.quantity,
    0
  );

  const [buyerName, setBuyerName] = useState(customer?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(customer?.email || '');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState(customer?.whatsapp || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer_bank');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setBuyerName((prev) => prev || customer.name);
      setBuyerEmail((prev) => prev || customer.email);
      setBuyerWhatsapp((prev) => prev || customer.whatsapp);
    }
  }, [customer]);

  const bankReady = Boolean(settings.bank_name && settings.bank_account_number);
  const qrisReady = Boolean(settings.qris_image_url);
  const paymentReady = paymentMethod === 'qris' ? qrisReady : bankReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!buyerName.trim() || !buyerEmail.trim() || !buyerWhatsapp.trim()) {
      setError('Mohon lengkapi nama lengkap, email aktif, dan nomor WhatsApp.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ order: Order & { access_token?: string } }>('/orders', {
        method: 'POST',
        token: customerToken,
        body: {
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerWhatsapp: buyerWhatsapp.trim(),
          paymentMethod,
          items: checkoutItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        },
      });

      if (res.order.access_token) {
        saveOrderAccessToken(res.order.order_number, res.order.access_token);
      }
      if (!directBuyItem) {
        clearCart();
      }
      showToast(`Pesanan ${res.order.order_number} berhasil dibuat.`);
      navigate(`/pesanan/${encodeURIComponent(res.order.order_number)}`, {
        state: { accessToken: res.order.access_token },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="bg-white min-h-[65vh] py-20 px-4 text-center space-y-4">
        <SeoHead title="Checkout" />
        <h1 className="font-display text-2xl font-bold text-[#26364A]">
          Tidak Ada Produk untuk Checkout
        </h1>
        <p className="text-sm text-[#7890AA]">
          Tambahkan produk digital terlebih dahulu sebelum melanjutkan pembayaran.
        </p>
        <Link
          to="/katalog"
          className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#345477] text-white"
        >
          Jelajahi Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[75vh]">
      <SeoHead
        title="Checkout Pesanan"
        description="Lengkapi data pembeli dan pilih metode pembayaran Transfer Bank atau QRIS di NusaKlik."
      />

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-[#26364A]">Checkout Pesanan</h1>
          <p className="text-sm text-[#7890AA] mt-1">
            {directBuyItem
              ? 'Pembelian langsung 1 produk pilihan. Lengkapi data Anda di bawah ini.'
              : 'Setelah pesanan dibuat, Anda akan memperoleh nomor pesanan unik dan instruksi pembayaran.'}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Buyer Data & Payment Method */}
          <div className="lg:col-span-7 space-y-6">
            {error && (
              <div className="p-4 rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/5 text-sm text-[#991B1B]">
                {error}
              </div>
            )}

            <div className="p-6 rounded-2xl border border-[#345477]/15 bg-white space-y-4 shadow-[0_8px_24px_-14px_rgba(38,54,74,0.12)]">
              <h2 className="font-display text-xl font-bold text-[#26364A]">Informasi Pembeli</h2>

              <div>
                <label className="block text-xs font-semibold text-[#26364A] mb-1.5">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm text-[#26364A] focus:outline-none focus:border-[#345477]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1.5">
                    Alamat Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm text-[#26364A] focus:outline-none focus:border-[#345477]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1.5">
                    Nomor WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm text-[#26364A] focus:outline-none focus:border-[#345477]"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-[#345477]/15 bg-white space-y-4 shadow-[0_8px_24px_-14px_rgba(38,54,74,0.12)]">
              <h2 className="font-display text-xl font-bold text-[#26364A]">Metode Pembayaran</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer_bank')}
                  disabled={checkoutTotal > 0 && !bankReady}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                    paymentMethod === 'transfer_bank'
                      ? 'border-[#345477] bg-[#EAF0F7]/45 ring-1 ring-[#345477]'
                      : 'border-[#345477]/16 hover:border-[#345477]/40'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <Building2 className="w-5 h-5 text-[#345477]" />
                    <span className="text-xs font-semibold text-[#B89143]">
                      {paymentMethod === 'transfer_bank' ? 'Dipilih' : 'Pilih'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[#26364A]">Transfer Bank</p>
                  <p className="text-xs text-[#7890AA]">
                    {bankReady
                      ? `${settings.bank_name} · ${settings.bank_account_number}`
                      : 'Detail rekening bank akan tampil jika sudah diisi pengelola.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  disabled={checkoutTotal > 0 && !qrisReady}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                    paymentMethod === 'qris'
                      ? 'border-[#345477] bg-[#EAF0F7]/45 ring-1 ring-[#345477]'
                      : 'border-[#345477]/16 hover:border-[#345477]/40'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <QrCode className="w-5 h-5 text-[#345477]" />
                    <span className="text-xs font-semibold text-[#B89143]">
                      {paymentMethod === 'qris' ? 'Dipilih' : 'Pilih'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[#26364A]">QRIS</p>
                  <p className="text-xs text-[#7890AA]">
                    {qrisReady
                      ? 'Pindai kode QRIS resmi toko dari e-wallet atau mobile banking.'
                      : 'Kode QRIS sedang disiapkan oleh pengelola toko.'}
                  </p>
                </button>
              </div>
              {checkoutTotal > 0 && !bankReady && !qrisReady && (
                <p className="text-xs text-[#991B1B]">
                  Metode pembayaran belum tersedia. Pengelola perlu mengatur rekening bank atau QRIS sebelum pesanan berbayar dapat dibuat.
                </p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <aside className="lg:col-span-5 border border-[#D6B36A]/50 rounded-2xl bg-[#F5F0E6] p-6 space-y-5 shadow-[0_10px_28px_-16px_rgba(38,54,74,0.14)]">
            <h2 className="font-display text-xl font-bold text-[#26364A]">Daftar Produk</h2>

            <div className="divide-y divide-[#345477]/12">
              {checkoutItems.map(({ product, quantity }) => {
                const unitPrice = getEffectivePrice(
                  product.price,
                  product.discount_price,
                  product.is_free
                );
                return (
                  <div key={product.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-[#26364A]">{product.title}</p>
                      <p className="text-xs text-[#7890AA]">
                        {product.file_format} · {quantity}x
                      </p>
                    </div>
                    <span className="font-mono-num font-semibold text-[#26364A] shrink-0">
                      {formatRupiah(unitPrice * quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#345477]/15 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[#26364A]">Total Tagihan</span>
              <span className="font-mono-num text-2xl font-bold text-[#345477]">
                {formatRupiah(checkoutTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || (checkoutTotal > 0 && !paymentReady)}
              className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Membuat Pesanan...' : 'Buat Pesanan Sekarang'}
            </button>

            <p className="text-xs text-[#7890AA] flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#B89143] shrink-0 mt-0.5" />
              <span>
                Harga dihitung ulang secara aman di server. Unduhan produk berbayar dibuka setelah
                bukti pembayaran diverifikasi admin.
              </span>
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
