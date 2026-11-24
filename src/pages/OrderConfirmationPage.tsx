import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  MessageCircle,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { Order, PaymentStatus } from '../types';
import { formatRupiah, formatTanggal, isSafeUrl, PAYMENT_STATUS_META } from '../utils/format';

export function OrderConfirmationPage() {
  const { orderNumber: paramOrder } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const stateAccessToken = (location.state as { accessToken?: string } | null)?.accessToken;

  const {
    customerToken,
    adminToken,
    orderAccessTokens,
    saveOrderAccessToken,
    settings,
    showToast,
  } = useStore();

  const [lookupOrderNumber, setLookupOrderNumber] = useState(paramOrder || '');
  const [lookupAccessCode, setLookupAccessCode] = useState(
    stateAccessToken || (paramOrder ? orderAccessTokens[paramOrder] || '' : '')
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(paramOrder));
  const [error, setError] = useState('');

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const activeToken = customerToken || adminToken;
  const activeOrderAccess =
    (paramOrder && (stateAccessToken || orderAccessTokens[paramOrder])) || lookupAccessCode;

  const fetchOrder = useCallback(
    async (ordNum: string, accessTok?: string) => {
      setLoading(true);
      setError('');
      try {
        const res = await apiRequest<{ order: Order }>(`/orders/${encodeURIComponent(ordNum)}`, {
          token: activeToken,
          orderAccessToken: accessTok || undefined,
        });
        setOrder(res.order);
        if (accessTok) saveOrderAccessToken(ordNum, accessTok);
      } catch (err) {
        setOrder(null);
        setError(err instanceof Error ? err.message : 'Pesanan tidak ditemukan.');
      } finally {
        setLoading(false);
      }
    },
    [activeToken, saveOrderAccessToken]
  );

  useEffect(() => {
    if (paramOrder) {
      void fetchOrder(paramOrder, activeOrderAccess);
    }
  }, [paramOrder, activeOrderAccess, fetchOrder]);

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupOrderNumber.trim()) return;
    void fetchOrder(lookupOrderNumber.trim(), lookupAccessCode.trim());
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !proofFile) return;

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);

      const res = await apiRequest<{ order: Order; message: string }>(
        `/orders/${encodeURIComponent(order.order_number)}/proof`,
        {
          method: 'POST',
          token: activeToken,
          orderAccessToken: activeOrderAccess || undefined,
          body: formData,
          isFormData: true,
        }
      );

      setOrder(res.order);
      setProofFile(null);
      showToast(res.message);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah bukti pembayaran.', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDownloadProduct = async (productId: number) => {
    if (!order) return;
    setDownloadingId(productId);
    try {
      const res = await apiRequest<{ downloadUrl: string }>(
        `/orders/${encodeURIComponent(order.order_number)}/download-token/${productId}`,
        {
          method: 'POST',
          token: activeToken,
          orderAccessToken: activeOrderAccess || undefined,
        }
      );
      window.location.href = res.downloadUrl;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unduhan belum tersedia.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const cleanWa = (settings.whatsapp_number || '').replace(/[^\d]/g, '');
  const bankConfigured = Boolean(settings.bank_name && settings.bank_account_number);
  const qrisConfigured = Boolean(settings.qris_image_url);

  return (
    <div className="bg-white min-h-[75vh]">
      <SeoHead
        title={order ? `Pesanan ${order.order_number}` : 'Konfirmasi Pembayaran'}
        description="Instruksi pembayaran, unggah bukti transfer, unduhan produk digital, dan invoice resmi NusaKlik."
      />

      <section className="no-print bg-[#EAF0F7] border-b border-[#345477]/12 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold text-[#26364A]">
            Konfirmasi Pembayaran & Detail Pesanan
          </h1>
          <p className="text-sm text-[#7890AA] mt-1">
            Unggah bukti transfer asli Anda, pantau riwayat verifikasi, dan unduh produk setelah
            berstatus Lunas.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Lookup Form */}
        {(!paramOrder || error) && !order && (
          <form
            onSubmit={handleManualLookup}
            className="no-print p-6 sm:p-8 rounded-2xl border border-[#345477]/16 bg-white space-y-4 max-w-xl shadow-[0_10px_28px_-16px_rgba(38,54,74,0.14)]"
          >
            <h2 className="font-display text-xl font-bold text-[#26364A]">Cari Pesanan Anda</h2>
            <p className="text-sm text-[#7890AA]">
              Masukkan nomor pesanan unik Anda. Jika Anda berbelanja tanpa login, masukkan juga kode
              akses pesanan atau masuk ke akun Anda melalui menu{' '}
              <Link to="/masuk" className="text-[#345477] font-semibold underline">
                Masuk
              </Link>
              .
            </p>
            {error && (
              <div className="p-3 rounded-lg border border-[#991B1B]/30 bg-[#991B1B]/5 text-xs text-[#991B1B]">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">
                Nomor Pesanan *
              </label>
              <input
                type="text"
                required
                value={lookupOrderNumber}
                onChange={(e) => setLookupOrderNumber(e.target.value)}
                placeholder="Contoh: NK-20261124-A1B2C3"
                className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm font-mono-num"
              />
            </div>
            {!activeToken && (
              <div>
                <label className="block text-xs font-semibold text-[#26364A] mb-1">
                  Kode Akses Pesanan (Untuk Checkout Tamu)
                </label>
                <input
                  type="text"
                  value={lookupAccessCode}
                  onChange={(e) => setLookupAccessCode(e.target.value)}
                  placeholder="Tempel kode akses pesanan"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm font-mono-num"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#D6B36A]" />
              <span>{loading ? 'Mencari...' : 'Tampilkan Pesanan'}</span>
            </button>
          </form>
        )}

        {loading && paramOrder && (
          <div className="h-64 rounded-2xl border border-[#345477]/12 animate-pulse bg-[#EAF0F7]/40" />
        )}

        {order && (
          <>
            {/* Status Banner */}
            <div className="no-print p-6 rounded-2xl border border-[#345477]/18 bg-[#EAF0F7]/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[#7890AA] font-semibold">
                    Nomor Pesanan
                  </p>
                  <p className="font-mono-num text-xl font-bold text-[#345477]">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-[#7890AA]">{formatTanggal(order.created_at)}</p>
                </div>

                <div className="flex items-center gap-2.5">
                  {order.payment_status === 'lunas' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#345477]" />
                  ) : order.payment_status === 'ditolak' ? (
                    <XCircle className="w-5 h-5 text-[#991B1B]" />
                  ) : (
                    <Clock className="w-5 h-5 text-[#B89143]" />
                  )}
                  <span
                    className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold ${
                      PAYMENT_STATUS_META[order.payment_status].toneClass
                    }`}
                  >
                    {PAYMENT_STATUS_META[order.payment_status].label}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#26364A]">
                {PAYMENT_STATUS_META[order.payment_status].description}
              </p>

              {order.payment_status === 'ditolak' && order.rejection_reason && (
                <p className="text-sm text-[#991B1B] font-medium">
                  Alasan penolakan: {order.rejection_reason}
                </p>
              )}

              {activeOrderAccess && (
                <div className="pt-3 border-t border-[#345477]/12 text-xs text-[#7890AA] flex flex-wrap items-center gap-2">
                  <span>Simpan kode akses pesanan ini jika Anda berbelanja tanpa akun:</span>
                  <code className="font-mono-num px-2 py-0.5 bg-white border border-[#345477]/20 rounded text-[#26364A] select-all">
                    {activeOrderAccess}
                  </code>
                </div>
              )}
            </div>

            {/* Payment Instructions & Upload Proof */}
            {order.payment_status !== 'lunas' && (
              <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Instructions (strictly from StoreSettings) */}
                <div className="p-6 rounded-2xl border border-[#D6B36A]/50 bg-[#F5F0E6] space-y-4">
                  <h2 className="font-display text-xl font-bold text-[#26364A]">
                    Instruksi Pembayaran
                  </h2>

                  <div className="p-4 rounded-xl bg-white border border-[#D6B36A]/45 space-y-1">
                    <p className="text-xs text-[#7890AA]">Total yang Harus Dibayar</p>
                    <p className="font-mono-num text-2xl font-bold text-[#345477]">
                      {formatRupiah(order.total_amount)}
                    </p>
                  </div>

                  {order.payment_method === 'transfer_bank' ? (
                    bankConfigured ? (
                      <div className="p-4 rounded-xl bg-white border border-[#345477]/12 space-y-1.5 text-sm">
                        <p className="text-xs uppercase tracking-wider text-[#7890AA] font-semibold">
                          Rekening Transfer Bank Resmi
                        </p>
                        <p className="font-semibold text-[#26364A]">{settings.bank_name}</p>
                        <p className="font-mono-num text-lg font-bold text-[#345477] select-all">
                          {settings.bank_account_number}
                        </p>
                        {settings.bank_account_holder && (
                          <p className="text-[#26364A]">a.n. {settings.bank_account_holder}</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white border border-[#345477]/14 text-xs text-[#7890AA]">
                        Informasi rekening bank sedang disiapkan oleh pengelola toko. Silakan
                        hubungi bantuan pelanggan atau cek kembali beberapa saat lagi.
                      </div>
                    )
                  ) : qrisConfigured ? (
                    <div className="p-4 rounded-xl bg-white border border-[#345477]/12 space-y-3">
                      <p className="text-xs uppercase tracking-wider text-[#7890AA] font-semibold">
                        Pindai QRIS Resmi {settings.store_name}
                      </p>
                      <img
                        src={settings.qris_image_url}
                        alt={`Kode QRIS Resmi ${settings.store_name}`}
                        className="w-52 h-52 object-contain border border-[#345477]/15 rounded-lg p-2 bg-white"
                      />
                      {settings.qris_nmid && (
                        <p className="text-xs font-mono-num text-[#7890AA]">
                          NMID: {settings.qris_nmid}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-[#345477]/14 text-xs text-[#7890AA]">
                      Gambar QRIS belum tersedia dan sedang disiapkan oleh pengelola toko.
                    </div>
                  )}
                </div>

                {/* Upload Original Payment Proof */}
                <div className="p-6 rounded-2xl border border-[#345477]/15 bg-white space-y-4">
                  <h2 className="font-display text-xl font-bold text-[#26364A]">
                    Unggah Bukti Pembayaran
                  </h2>
                  <p className="text-sm text-[#7890AA]">
                    Unggah tangkapan layar atau foto struk transfer asli Anda. Berkas disimpan utuh
                    untuk diperiksa admin sebelum status diubah menjadi Lunas.
                  </p>

                  <form onSubmit={handleUploadProof} className="space-y-4">
                    <label className="block border border-dashed border-[#345477]/35 rounded-xl p-5 text-center cursor-pointer hover:border-[#345477] bg-[#EAF0F7]/30 transition-colors">
                      <Upload className="w-6 h-6 text-[#345477] mx-auto mb-2" />
                      <span className="block text-sm font-medium text-[#26364A]">
                        {proofFile ? proofFile.name : 'Pilih gambar bukti transfer (JPG, PNG, WebP)'}
                      </span>
                      <span className="block text-xs text-[#7890AA] mt-1">Maksimal 5 MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={!proofFile || uploadingProof}
                      className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingProof ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}
                    </button>
                  </form>

                  {(order.proofs || []).length > 0 && (
                    <div className="pt-3 border-t border-[#345477]/12 space-y-2">
                      <p className="text-xs font-semibold text-[#26364A]">
                        Bukti yang Telah Diunggah:
                      </p>
                      {(order.proofs || []).map((pr) => (
                        <div
                          key={pr.id}
                          className="flex items-center justify-between text-xs text-[#7890AA] py-1"
                        >
                          <span className="inline-flex items-center gap-1.5 text-[#26364A] truncate">
                            <FileCheck className="w-3.5 h-3.5 text-[#345477]" />
                            {pr.original_filename}
                          </span>
                          <span className="font-mono-num shrink-0">
                            {formatTanggal(pr.uploaded_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Protected Digital Downloads */}
            <div className="no-print p-6 rounded-2xl border border-[#345477]/18 bg-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-[#26364A]">
                  Akses Produk Digital
                </h2>
                <span className="text-xs text-[#7890AA]">
                  {order.payment_status === 'lunas'
                    ? 'Tautan unduhan aktif'
                    : 'Terkunci hingga pembayaran berstatus Lunas'}
                </span>
              </div>

              <div className="divide-y divide-[#345477]/10">
                {(order.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-sm text-[#26364A]">{item.product_title}</p>
                      <p className="text-xs text-[#7890AA]">Format: {item.file_format}</p>
                    </div>

                    {order.payment_status === 'lunas' ? (
                      <button
                        type="button"
                        disabled={downloadingId === item.product_id}
                        onClick={() => handleDownloadProduct(item.product_id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5 text-[#D6B36A]" />
                        <span>
                          {downloadingId === item.product_id ? 'Menyiapkan...' : 'Unduh File Resmi'}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-[#7890AA]">
                        Menunggu Verifikasi Pembayaran
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Riwayat Perubahan Status */}
            {(order.status_history || []).length > 0 && (
              <div className="no-print p-6 rounded-2xl border border-[#345477]/15 bg-[#EAF0F7]/35 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#26364A]">
                  Riwayat Perubahan Status Pesanan
                </h2>
                <div className="space-y-3">
                  {(order.status_history || []).map((h) => {
                    const meta = PAYMENT_STATUS_META[h.status as PaymentStatus];
                    return (
                      <div
                        key={h.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-[#345477]/10 pb-2.5 last:border-none"
                      >
                        <div>
                          <span className="font-semibold text-[#345477]">
                            {meta ? meta.label : h.status}
                          </span>
                          <span className="text-[#26364A]"> — {h.note}</span>
                        </div>
                        <span className="font-mono-num text-[#7890AA] shrink-0">
                          {formatTanggal(h.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Customer Help Section */}
            {(cleanWa || settings.email) && (
              <div className="no-print p-5 rounded-2xl border border-[#D6B36A]/45 bg-[#F5F0E6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#26364A]">
                    Butuh Bantuan Terkait Pembayaran?
                  </p>
                  <p className="text-xs text-[#7890AA]">
                    {settings.email ? `Email bantuan: ${settings.email}` : 'Hubungi layanan pelanggan kami.'}
                  </p>
                </div>
                {cleanWa && (
                  <a
                    href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                      `Halo ${settings.store_name}, saya ingin konfirmasi pesanan ${order.order_number}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462] shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 text-[#D6B36A]" />
                    <span>Hubungi via WhatsApp</span>
                  </a>
                )}
              </div>
            )}

            {/* Printable A4 Official Invoice */}
            <section className="pt-4">
              <InvoiceDocument order={order} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
