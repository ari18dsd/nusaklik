import { Download, LogOut, PackageCheck, Receipt, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ProductCover3D } from '../components/ProductCover3D';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { CustomerUser } from '../types';
import { formatTanggal } from '../utils/format';

interface LibraryItem {
  id: number;
  title: string;
  slug: string;
  file_format: string;
  file_size_label: string;
  cover_url: string;
  cover_aspect_type: 'book' | 'digital';
  license_type: string;
  order_number: string;
  purchased_at: string;
}

export function AccountPage() {
  const { customer, customerToken, setCustomerSession, logoutCustomer, showToast } = useStore();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);

  const [name, setName] = useState(customer?.name || '');
  const [whatsapp, setWhatsapp] = useState(customer?.whatsapp || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerToken) return;
    apiRequest<{ items: LibraryItem[] }>('/customer/library', { token: customerToken })
      .then((res) => setLibrary(res.items))
      .catch((err) => showToast(err instanceof Error ? err.message : 'Koleksi produk gagal dimuat.', 'error'))
      .finally(() => setLoadingLib(false));
  }, [customerToken, showToast]);

  if (!customerToken || !customer) {
    return <Navigate to="/masuk" replace />;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest<{ customer: CustomerUser }>('/auth/me', {
        method: 'PUT',
        token: customerToken,
        body: { name, whatsapp, newPassword: newPassword || undefined },
      });
      setCustomerSession(customerToken, res.customer);
      setNewPassword('');
      showToast('Profil akun berhasil diperbarui.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (orderNumber: string, productId: number) => {
    try {
      const res = await apiRequest<{ downloadUrl: string }>(
        `/orders/${encodeURIComponent(orderNumber)}/download-token/${productId}`,
        { method: 'POST', token: customerToken }
      );
      window.location.href = res.downloadUrl;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memulai unduhan.', 'error');
    }
  };

  return (
    <div className="bg-white min-h-[75vh] py-10 sm:py-14">
      <SeoHead title="Akun Pelanggan" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#345477]/12 pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#26364A]">Akun Pelanggan</h1>
            <p className="text-sm text-[#7890AA] mt-1">
              Selamat datang, {customer.name} ({customer.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/riwayat-pesanan"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#345477]/25 text-[#345477] hover:bg-[#345477]/5"
            >
              <Receipt className="w-4 h-4" />
              <span>Riwayat Pesanan</span>
            </Link>
            <button
              type="button"
              onClick={logoutCustomer}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#991B1B]/25 text-[#991B1B] hover:bg-[#991B1B]/5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Profile Form */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-5 p-6 rounded-xl border border-[#345477]/15 bg-white space-y-4"
          >
            <div className="flex items-center gap-2 text-[#345477]">
              <User className="w-5 h-5" />
              <h2 className="font-display text-xl font-bold text-[#26364A]">Profil Saya</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">Email</label>
              <input
                type="email"
                disabled
                value={customer.email}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/12 text-sm text-[#7890AA] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">
                Nomor WhatsApp
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">
                Kata Sandi Baru (Opsional)
              </label>
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kosongkan jika tidak mengubah"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>

          {/* Purchased Digital Products Library */}
          <div className="lg:col-span-7 p-6 rounded-xl border border-[#345477]/15 bg-white space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#345477]">
                <PackageCheck className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold text-[#26364A]">
                  Produk yang Sudah Dibeli
                </h2>
              </div>
              <span className="font-mono-num text-xs text-[#7890AA]">{library.length} produk</span>
            </div>

            {loadingLib ? (
              <div className="h-32 animate-pulse rounded-lg border border-[#345477]/10" />
            ) : library.length === 0 ? (
              <div className="py-10 text-center space-y-3 border border-[#345477]/10 rounded-xl">
                <p className="text-sm text-[#7890AA]">
                  Anda belum memiliki produk berbayar yang berstatus Lunas.
                </p>
                <Link
                  to="/katalog"
                  className="inline-block px-4 py-2 rounded-lg text-xs font-semibold bg-[#345477] text-white"
                >
                  Jelajahi Katalog
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#345477]/10">
                {library.map((item) => (
                  <div
                    key={`${item.order_number}-${item.id}`}
                    className="py-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <ProductCover3D
                      src={item.cover_url}
                      alt={item.title}
                      title={item.title}
                      isBook={item.cover_aspect_type === 'book'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold text-sm text-[#26364A]">{item.title}</p>
                      <p className="text-xs text-[#7890AA]">
                        {item.file_format} · Pesanan {item.order_number}
                      </p>
                      <p className="text-xs text-[#7890AA]">
                        Dibeli {formatTanggal(item.purchased_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(item.order_number, item.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D6B36A]" />
                      <span>Unduh</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
