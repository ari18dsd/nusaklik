import {
  CheckCircle2,
  Eye,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Plus,
  Receipt,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { SeoHead } from '../components/SeoHead';
import { siteAsset } from '../config/staticSite';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type {
  AdminDashboardSummary,
  AdminUser,
  Category,
  Order,
  PaymentStatus,
  Product,
  StoreSettings,
} from '../types';
import { formatRupiah, formatTanggal, isSafeUrl, PAYMENT_STATUS_META } from '../utils/format';
import { AdminProductModal } from './AdminProductModal';

type AdminTab = 'summary' | 'products' | 'categories' | 'orders' | 'customers' | 'settings' | 'messages';

interface CustomerRow {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  created_at: string;
  order_count: number;
  total_spent: number;
}

interface ContactMessageRow {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  subject: string;
  message: string;
  created_at: string;
}

export function AdminDashboardPage() {
  const { adminToken, admin, setAdminSession, logoutAdmin, settings, refreshConfig, showToast } =
    useStore();

  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupTokenRequired, setSetupTokenRequired] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Auth form states
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSetupToken, setAuthSetupToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard states
  const [tab, setTab] = useState<AdminTab>('summary');
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [storeForm, setStoreForm] = useState<StoreSettings>(settings);

  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIsBook, setNewCatIsBook] = useState(true);

  // Customer detail orders
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<{
    customer: CustomerRow;
    orders: Order[];
  } | null>(null);

  useEffect(() => {
    setStoreForm(settings);
  }, [settings]);

  useEffect(() => {
    apiRequest<{ needsSetup: boolean; setupTokenRequired: boolean }>('/admin/status')
      .then((res) => {
        setNeedsSetup(res.needsSetup);
        setSetupTokenRequired(res.setupTokenRequired);
      })
      .catch((err) => setAuthError(err instanceof Error ? err.message : 'Gagal memeriksa status admin.'))
      .finally(() => setCheckingStatus(false));
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!adminToken) return;
    try {
      const [sumRes, prodRes, catRes, ordRes, custRes, setRes, msgRes] = await Promise.all([
        apiRequest<{ summary: AdminDashboardSummary }>('/admin/summary', { token: adminToken }),
        apiRequest<{ products: Product[] }>('/admin/products', { token: adminToken }),
        apiRequest<{ categories: Category[] }>('/categories'),
        apiRequest<{ orders: Order[] }>(
          `/admin/orders${orderStatusFilter ? `?status=${encodeURIComponent(orderStatusFilter)}` : ''}`,
          { token: adminToken }
        ),
        apiRequest<{ customers: CustomerRow[] }>('/admin/customers', { token: adminToken }),
        apiRequest<{ settings: StoreSettings }>('/admin/settings', { token: adminToken }),
        apiRequest<{ messages: ContactMessageRow[] }>('/admin/messages', { token: adminToken }),
      ]);
      setSummary(sumRes.summary);
      setProducts(prodRes.products);
      setCategories(catRes.categories);
      setOrders(ordRes.orders);
      setCustomers(custRes.customers);
      setStoreForm(setRes.settings);
      setMessages(msgRes.messages);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat data admin.', 'error');
    }
  }, [adminToken, orderStatusFilter, showToast]);

  useEffect(() => {
    if (adminToken) {
      void loadDashboardData();
    }
  }, [adminToken, loadDashboardData]);

  // Securely fetch raw payment proof via Bearer token when inspecting order
  useEffect(() => {
    let revokeUrl: string | null = null;
    setProofPreviewUrl(null);
    if (!adminToken || !selectedOrder || !selectedOrder.proofs || selectedOrder.proofs.length === 0) {
      return;
    }
    const latestProof = selectedOrder.proofs[0];
    fetch(
      `/api/orders/${encodeURIComponent(selectedOrder.order_number)}/proof/${latestProof.id}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
      .then((r) => {
        if (!r.ok) throw new Error('Bukti pembayaran gagal dimuat atau sesi admin telah berakhir.');
        return r.blob();
      })
      .then((blob) => {
        revokeUrl = URL.createObjectURL(blob);
        setProofPreviewUrl(revokeUrl);
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Bukti pembayaran gagal dimuat.', 'error'));

    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [adminToken, selectedOrder, showToast]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = needsSetup ? '/admin/setup' : '/admin/login';
      const body = needsSetup
        ? {
            name: authName,
            email: authEmail,
            password: authPassword,
            ...(setupTokenRequired ? { setupToken: authSetupToken } : {}),
          }
        : { email: authEmail, password: authPassword };
      const res = await apiRequest<{ token: string; admin: AdminUser }>(endpoint, {
        method: 'POST',
        body,
      });
      setAdminSession(res.token, res.admin);
      setNeedsSetup(false);
      showToast('Berhasil masuk ke Dashboard Admin.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Autentikasi gagal.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await apiRequest('/admin/logout', { method: 'POST', token: adminToken });
      logoutAdmin();
    } catch (err) {
      logoutAdmin();
      showToast(err instanceof Error ? err.message : 'Sesi lokal dihapus, tetapi server gagal mengakhiri sesi.', 'error');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      const res = await apiRequest<{ message?: string }>(`/admin/products/${product.id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      showToast(res.message || `Produk "${product.title}" dihapus.`);
      await loadDashboardData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus produk.', 'error');
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    try {
      await apiRequest(`/admin/products/${product.id}`, {
        method: 'PUT',
        token: adminToken,
        body: { ...product, is_active: !product.is_active },
      });
      showToast(
        product.is_active
          ? `"${product.title}" dinonaktifkan.`
          : `"${product.title}" diaktifkan kembali.`
      );
      await loadDashboardData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui status produk.', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await apiRequest('/admin/categories', {
        method: 'POST',
        token: adminToken,
        body: { name: newCatName, description: newCatDesc, is_book_format: newCatIsBook },
      });
      setNewCatName('');
      setNewCatDesc('');
      showToast('Kategori baru berhasil ditambahkan.');
      await loadDashboardData();
      await refreshConfig();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menambah kategori.', 'error');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await apiRequest(`/admin/categories/${id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      showToast('Kategori dihapus.');
      await loadDashboardData();
      await refreshConfig();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus kategori.', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderNumber: string, status: PaymentStatus) => {
    try {
      const res = await apiRequest<{ order: Order }>(
        `/admin/orders/${encodeURIComponent(orderNumber)}/status`,
        {
          method: 'PATCH',
          token: adminToken,
          body: {
            payment_status: status,
            rejection_reason: status === 'ditolak' ? rejectionReason : '',
            admin_notes: adminNotes,
          },
        }
      );
      setSelectedOrder(res.order);
      showToast(`Status pesanan ${orderNumber} diperbarui menjadi ${PAYMENT_STATUS_META[status].label}.`);
      await loadDashboardData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui pesanan.', 'error');
    }
  };

  const handleUploadBrandAsset = async (field: keyof StoreSettings, file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiRequest<{ url: string }>('/admin/upload/brand-asset', {
        method: 'POST',
        token: adminToken,
        body: fd,
        isFormData: true,
      });
      setStoreForm((prev) => ({ ...prev, [field]: res.url }));
      showToast('Berkas visual diunggah. Klik "Simpan Pengaturan Toko" untuk menerapkan.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah aset.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        token: adminToken,
        body: { settings: storeForm },
      });
      await refreshConfig();
      showToast('Pengaturan toko berhasil disimpan.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', 'error');
    }
  };

  const inspectCustomerOrders = async (cust: CustomerRow) => {
    try {
      const res = await apiRequest<{ orders: Order[] }>(`/admin/customers/${cust.id}/orders`, {
        token: adminToken,
      });
      setSelectedCustomerOrders({ customer: cust, orders: res.orders });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat riwayat pelanggan.', 'error');
    }
  };

  // ─── LOGIN / FIRST-RUN SETUP SCREEN ──────────────────────────────────────────
  if (!adminToken || !admin) {
    const logoSrc = isSafeUrl(settings.logo_url)
      ? settings.logo_url
      : siteAsset('assets/logo/logo-horizontal.svg');
    return (
      <div className="bg-[#EAF0F7] min-h-[85vh] flex items-center justify-center px-4 py-12">
        <SeoHead title="Portal Admin NusaKlik" />
        <div className="w-full max-w-md border border-[#345477]/18 rounded-2xl p-8 bg-white shadow-[0_18px_40px_-20px_rgba(38,54,74,0.22)] space-y-6">
          <div className="space-y-3 text-center">
            <img src={logoSrc} alt={settings.store_name} className="h-9 mx-auto object-contain" />
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B89143]">
              <Shield className="w-4 h-4" />
              <span>{needsSetup ? 'Setup Administrator Pertama' : 'Portal Pengelola Terlindungi'}</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#26364A]">
              {needsSetup ? 'Buat Akun Admin Utama' : 'Masuk Dashboard Admin'}
            </h1>
            <p className="text-xs text-[#7890AA] leading-relaxed">
              {needsSetup
                ? 'Belum ada akun admin terdaftar. Tetapkan kredensial pengelola pertama yang aman (kata sandi min. 10 karakter).'
                : 'Masukkan email dan kata sandi administrator untuk mengelola produk, pesanan, dan pengaturan toko.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg border border-[#991B1B]/30 bg-[#991B1B]/5 text-xs text-[#991B1B]">
              {authError}
            </div>
          )}

          {checkingStatus ? (
            <div className="h-32 animate-pulse rounded-xl border border-[#345477]/10" />
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {needsSetup && (
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Nama Lengkap Admin
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Nama Administrator"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
              )}
              {needsSetup && setupTokenRequired && (
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Kode Setup Produksi
                  </label>
                  <input
                    type="password"
                    required
                    value={authSetupToken}
                    onChange={(e) => setAuthSetupToken(e.target.value)}
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#26364A] mb-1">
                  Email Admin
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@domainanda.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26364A] mb-1">
                  Kata Sandi {needsSetup && '(Minimal 10 karakter)'}
                </label>
                <input
                  type="password"
                  required
                  minLength={needsSetup ? 10 : 1}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Masukkan kata sandi aman"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
              >
                {authLoading
                  ? 'Memproses...'
                  : needsSetup
                    ? 'Simpan & Aktifkan Admin'
                    : 'Masuk ke Dashboard'}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-[#345477]/10 text-center">
            <Link to="/" className="text-xs font-semibold text-[#345477] hover:text-[#B89143]">
              ← Kembali ke Halaman Toko
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navTabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'summary', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'categories', label: 'Kategori', icon: FolderTree },
    { id: 'orders', label: 'Pesanan', icon: Receipt },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'settings', label: 'Pengaturan Toko', icon: Settings },
    { id: 'messages', label: 'Pesan Masuk', icon: Mail },
  ];

  return (
    <div className="bg-[#EAF0F7]/35 min-h-screen">
      <SeoHead title="Dashboard Admin — NusaKlik" />

      {/* Top Admin Header */}
      <div className="no-print border-b border-[#345477]/14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={
                isSafeUrl(settings.logo_url)
                  ? settings.logo_url
                  : siteAsset('assets/logo/logo-horizontal.svg')
              }
              alt={settings.store_name}
              className="h-7 w-auto object-contain"
            />
            <span className="text-xs font-semibold text-[#7890AA] hidden sm:inline">
              / Dashboard Pengelola
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden md:inline text-[#26364A] font-medium">{admin.email}</span>
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg border border-[#345477]/20 text-[#345477] font-semibold"
            >
              Lihat Toko
            </Link>
            <button
              type="button"
              onClick={() => void handleAdminLogout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#991B1B]/25 text-[#991B1B] font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="no-print lg:col-span-3 border border-[#345477]/14 rounded-xl p-3 bg-white flex lg:flex-col gap-1 overflow-x-auto">
          {navTabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#345477] text-white font-semibold'
                    : 'text-[#26364A] hover:bg-[#345477]/5'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-[#D6B36A]' : 'text-[#7890AA]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {/* TAB: SUMMARY */}
          {tab === 'summary' && summary && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
                  Ringkasan Operasional Toko
                </h1>
                <span className="text-xs font-medium text-[#7890AA]">
                  Pelanggan Terdaftar: <strong className="font-mono-num text-[#345477]">{summary.total_customers}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total Produk', value: String(summary.total_products), tone: 'bg-white' },
                  { label: 'Total Pesanan', value: String(summary.total_orders), tone: 'bg-white' },
                  {
                    label: 'Menunggu Pembayaran',
                    value: String(summary.awaiting_payment_orders),
                    tone: 'bg-[#EAF0F7]/70',
                  },
                  {
                    label: 'Menunggu Verifikasi',
                    value: String(summary.awaiting_verification_orders),
                    tone: 'bg-[#F5F0E6]',
                  },
                  {
                    label: 'Transaksi Berhasil (Lunas)',
                    value: String(summary.paid_orders),
                    tone: 'bg-white',
                  },
                  {
                    label: 'Ringkasan Penjualan',
                    value: formatRupiah(summary.total_revenue),
                    tone: 'bg-[#F5F0E6]',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`p-5 rounded-xl border border-[#345477]/15 ${stat.tone} space-y-1.5`}
                  >
                    <p className="text-xs text-[#7890AA] font-medium">{stat.label}</p>
                    <p className="font-mono-num text-xl sm:text-2xl font-bold text-[#345477]">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border border-[#345477]/14 rounded-xl p-6 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-[#26364A]">
                    Transaksi Terbaru
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="text-xs font-semibold text-[#345477] cursor-pointer"
                  >
                    Kelola Semua Pesanan →
                  </button>
                </div>

                {summary.recent_orders.length === 0 ? (
                  <p className="text-sm text-[#7890AA] py-6 text-center">
                    Belum ada transaksi masuk. Pesanan dari pelanggan akan muncul di sini.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#345477]/15 text-left text-xs text-[#7890AA]">
                          <th className="py-2.5 pr-3">No. Pesanan</th>
                          <th className="py-2.5 px-3">Pembeli</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 pl-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#345477]/10">
                        {summary.recent_orders.map((ord) => (
                          <tr key={ord.id}>
                            <td className="py-3 pr-3 font-mono-num font-semibold text-[#345477]">
                              {ord.order_number}
                            </td>
                            <td className="py-3 px-3 text-[#26364A]">{ord.buyer_name}</td>
                            <td className="py-3 px-3 text-right font-mono-num">
                              {formatRupiah(ord.total_amount)}
                            </td>
                            <td className="py-3 pl-3 text-right text-xs font-semibold">
                              {PAYMENT_STATUS_META[ord.payment_status].label}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PRODUCTS */}
          {tab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-[#26364A]">
                  Manajemen Produk Digital
                </h1>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#D6B36A]" />
                  <span>Tambah Produk</span>
                </button>
              </div>

              <div className="border border-[#345477]/14 rounded-xl overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#345477]/15 text-left text-xs text-[#7890AA]">
                      <th className="py-3 px-4">Produk</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3 text-right">Harga</th>
                      <th className="py-3 px-3 text-right">Unduhan</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#345477]/10">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {isSafeUrl(p.cover_url) && (
                              <img
                                src={p.cover_url}
                                alt=""
                                className="w-9 h-12 object-contain border border-[#345477]/12 rounded bg-white shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-[#26364A] truncate max-w-[240px]">
                                {p.title}
                              </p>
                              <p className="text-xs text-[#7890AA]">{p.file_format}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-[#7890AA]">{p.category_name}</td>
                        <td className="py-3 px-3 text-right font-mono-num">
                          {p.is_free ? (
                            'Gratis'
                          ) : p.discount_price ? (
                            <div>
                              <span className="text-xs line-through text-[#7890AA] block">
                                {formatRupiah(p.price)}
                              </span>
                              <span className="font-semibold text-[#345477]">
                                {formatRupiah(p.discount_price)}
                              </span>
                            </div>
                          ) : (
                            formatRupiah(p.price)
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num">{p.download_count}</td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(p)}
                            className={`text-xs font-semibold cursor-pointer ${
                              p.is_active ? 'text-[#345477]' : 'text-[#7890AA]'
                            }`}
                          >
                            {p.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="text-xs font-semibold text-[#345477] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="text-xs font-semibold text-[#991B1B] hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CATEGORIES */}
          {tab === 'categories' && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#26364A]">Manajemen Kategori</h1>

              <form
                onSubmit={handleAddCategory}
                className="p-5 rounded-xl border border-[#345477]/15 bg-white grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Nama Kategori *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Contoh: Modul Pelatihan"
                    className="w-full px-3 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Deskripsi Singkat
                  </label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Keterangan kategori"
                    className="w-full px-3 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#26364A]">
                    <input
                      type="checkbox"
                      checked={newCatIsBook}
                      onChange={(e) => setNewCatIsBook(e.target.checked)}
                    />
                    <span>Cover 3D</span>
                  </label>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[#345477] text-white cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
              </form>

              <div className="border border-[#345477]/14 rounded-xl overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#345477]/15 text-left text-xs text-[#7890AA]">
                      <th className="py-3 px-4">Nama Kategori</th>
                      <th className="py-3 px-3">Slug</th>
                      <th className="py-3 px-3 text-right">Jumlah Produk</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#345477]/10">
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td className="py-3 px-4 font-semibold text-[#26364A]">{cat.name}</td>
                        <td className="py-3 px-3 font-mono-num text-xs text-[#7890AA]">{cat.slug}</td>
                        <td className="py-3 px-3 text-right font-mono-num">
                          {cat.product_count ?? 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-xs font-semibold text-[#991B1B] hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-[#26364A]">
                  Manajemen Pesanan & Verifikasi Pembayaran
                </h1>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                >
                  <option value="">Semua Status</option>
                  <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
                  <option value="menunggu_pembayaran">Menunggu Pembayaran</option>
                  <option value="lunas">Lunas</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>

              {orders.length === 0 ? (
                <div className="p-10 text-center border border-[#345477]/14 rounded-xl text-sm text-[#7890AA]">
                  Belum ada pesanan yang sesuai filter.
                </div>
              ) : (
                <div className="border border-[#345477]/14 rounded-xl overflow-x-auto bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#345477]/15 text-left text-xs text-[#7890AA]">
                        <th className="py-3 px-4">No. Pesanan</th>
                        <th className="py-3 px-3">Pembeli</th>
                        <th className="py-3 px-3">Metode</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Periksa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#345477]/10">
                      {orders.map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-3 px-4 font-mono-num font-semibold text-[#345477]">
                            {ord.order_number}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-[#26364A]">{ord.buyer_name}</p>
                            <p className="text-xs text-[#7890AA]">{ord.buyer_email}</p>
                          </td>
                          <td className="py-3 px-3 text-xs uppercase text-[#7890AA]">
                            {ord.payment_method === 'qris' ? 'QRIS' : 'Transfer Bank'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold">
                            {formatRupiah(ord.total_amount)}
                          </td>
                          <td className="py-3 px-3 text-xs font-semibold">
                            {PAYMENT_STATUS_META[ord.payment_status].label}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setRejectionReason(ord.rejection_reason || '');
                                setAdminNotes(ord.admin_notes || '');
                                setShowInvoiceModal(false);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#345477] text-white cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#D6B36A]" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: CUSTOMERS */}
          {tab === 'customers' && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#26364A]">Manajemen Pelanggan</h1>

              {customers.length === 0 ? (
                <div className="p-10 text-center border border-[#345477]/14 rounded-xl text-sm text-[#7890AA]">
                  Belum ada pelanggan terdaftar.
                </div>
              ) : (
                <div className="border border-[#345477]/14 rounded-xl overflow-x-auto bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#345477]/15 text-left text-xs text-[#7890AA]">
                        <th className="py-3 px-4">Nama</th>
                        <th className="py-3 px-3">Email & WhatsApp</th>
                        <th className="py-3 px-3 text-right">Pesanan</th>
                        <th className="py-3 px-3 text-right">Total Belanja</th>
                        <th className="py-3 px-4 text-right">Riwayat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#345477]/10">
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 px-4 font-semibold text-[#26364A]">{c.name}</td>
                          <td className="py-3 px-3 text-xs text-[#7890AA]">
                            <div>{c.email}</div>
                            <div className="font-mono-num">{c.whatsapp}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num">{c.order_count}</td>
                          <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#345477]">
                            {formatRupiah(c.total_spent)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => inspectCustomerOrders(c)}
                              className="text-xs font-semibold text-[#345477] hover:underline cursor-pointer"
                            >
                              Lihat Transaksi
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: STORE SETTINGS */}
          {tab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-2xl font-bold text-[#26364A]">
                  Pengaturan Identitas, Pembayaran & Kebijakan Toko
                </h1>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer"
                >
                  Simpan Pengaturan Toko
                </button>
              </div>

              {/* Brand & Identity */}
              <div className="p-6 rounded-xl border border-[#345477]/15 bg-white space-y-4">
                <h2 className="font-display text-lg font-bold text-[#26364A]">Identitas Brand</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Nama Brand
                    </label>
                    <input
                      type="text"
                      value="NusaKlik"
                      readOnly
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-[#EAF0F7]/40 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Tagline Pendukung
                    </label>
                    <input
                      type="text"
                      value={storeForm.tagline_sub}
                      onChange={(e) => setStoreForm({ ...storeForm, tagline_sub: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Tagline Utama
                  </label>
                  <input
                    type="text"
                    value={storeForm.tagline_main}
                    onChange={(e) => setStoreForm({ ...storeForm, tagline_main: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Deskripsi Toko
                  </label>
                  <textarea
                    rows={3}
                    value={storeForm.store_description}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, store_description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
              </div>

              {/* Rekening Bank, QRIS, & Kontak Resmi Toko */}
              <div className="p-6 rounded-xl border border-[#345477]/15 bg-white space-y-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#26364A]">
                    Pengaturan Rekening, QRIS, WhatsApp & Email Toko
                  </h2>
                  <p className="text-xs text-[#7890AA] mt-1">
                    Data ini tampil langsung di halaman Checkout, Konfirmasi Pembayaran, Kontak,
                    tombol WhatsApp, dan Invoice setelah Anda klik Simpan.
                  </p>
                </div>

                {/* REKENING BANK */}
                <div className="p-4 rounded-xl bg-[#EAF0F7]/50 border border-[#345477]/12 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#345477]">
                    Rekening Bank
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#26364A] mb-1">
                        Nama Bank
                      </label>
                      <input
                        type="text"
                        value={storeForm.bank_name}
                        onChange={(e) => setStoreForm({ ...storeForm, bank_name: e.target.value })}
                        placeholder="Contoh: Bank BCA / Bank Mandiri"
                        className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#26364A] mb-1">
                        Nomor Rekening
                      </label>
                      <input
                        type="text"
                        value={storeForm.bank_account_number}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, bank_account_number: e.target.value })
                        }
                        placeholder="Masukkan nomor rekening resmi"
                        className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-white text-sm font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#26364A] mb-1">
                        Nama Pemilik Rekening
                      </label>
                      <input
                        type="text"
                        value={storeForm.bank_account_holder}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, bank_account_holder: e.target.value })
                        }
                        placeholder="Nama pemilik rekening"
                        className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* QRIS */}
                <div className="p-4 rounded-xl bg-[#F5F0E6]/70 border border-[#D6B36A]/45 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#345477]">
                      QRIS Pembayaran
                    </p>
                    <span className="text-xs text-[#7890AA]">
                      {isSafeUrl(storeForm.qris_image_url) ? 'Gambar QRIS aktif' : 'Belum ada gambar QRIS'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-[#345477]/14 min-h-[168px]">
                      {isSafeUrl(storeForm.qris_image_url) ? (
                        <img
                          src={storeForm.qris_image_url}
                          alt="Preview QRIS Toko"
                          className="max-h-40 w-auto object-contain"
                        />
                      ) : (
                        <p className="text-xs text-center text-[#7890AA]">
                          Belum ada gambar QRIS diunggah.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-8 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-[#D6B36A]" />
                          <span>
                            {isSafeUrl(storeForm.qris_image_url)
                              ? 'Ganti Gambar QRIS'
                              : 'Upload Gambar QRIS'}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void handleUploadBrandAsset('qris_image_url', f);
                            }}
                          />
                        </label>

                        {isSafeUrl(storeForm.qris_image_url) && (
                          <button
                            type="button"
                            onClick={() => setStoreForm({ ...storeForm, qris_image_url: '' })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#991B1B]/30 text-[#991B1B] bg-white hover:bg-[#991B1B]/5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Gambar QRIS</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#26364A] mb-1">
                          NMID QRIS (Opsional)
                        </label>
                        <input
                          type="text"
                          value={storeForm.qris_nmid}
                          onChange={(e) => setStoreForm({ ...storeForm, qris_nmid: e.target.value })}
                          placeholder="Contoh: ID1020304050607"
                          className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-white text-sm font-mono-num"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KONTAK */}
                <div className="p-4 rounded-xl bg-[#EAF0F7]/50 border border-[#345477]/12 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#345477]">
                    Kontak Resmi Toko
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#26364A] mb-1">
                        Nomor WhatsApp (Format Internasional, misal 62812...)
                      </label>
                      <input
                        type="text"
                        value={storeForm.whatsapp_number}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, whatsapp_number: e.target.value })
                        }
                        placeholder="Contoh: 6281234567890"
                        className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-white text-sm font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#26364A] mb-1">
                        Email Toko
                      </label>
                      <input
                        type="email"
                        value={storeForm.email}
                        onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                        placeholder="Contoh: kontak@tokoanda.id"
                        className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Visual Assets */}
              <div className="p-6 rounded-xl border border-[#345477]/15 bg-white space-y-4">
                <h2 className="font-display text-lg font-bold text-[#26364A]">
                  Aset Visual (Logo, Banner, Watermark, Favicon)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(
                    [
                      ['logo_url', 'Logo Utama'],
                      ['logo_white_url', 'Logo Footer (Putih)'],
                      ['banner_hero_url', 'Banner Utama (Hero)'],
                      ['banner_promo_url', 'Banner Promosi'],
                      ['watermark_url', 'Watermark Invoice'],
                      ['favicon_url', 'Favicon Website'],
                    ] as Array<[keyof StoreSettings, string]>
                  ).map(([field, label]) => (
                    <div key={field} className="p-3.5 rounded-lg border border-[#345477]/12 space-y-2">
                      <p className="text-xs font-semibold text-[#26364A]">{label}</p>
                      {isSafeUrl(storeForm[field]) && (
                        <img
                          src={storeForm[field]}
                          alt={label}
                          className={`h-16 w-full object-contain rounded border border-[#345477]/10 p-1 ${
                            field === 'logo_white_url' ? 'bg-[#345477]' : 'bg-white'
                          }`}
                        />
                      )}
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#345477]/25 text-[#345477] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Ganti Aset</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void handleUploadBrandAsset(field, f);
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policies & Footer */}
              <div className="p-6 rounded-xl border border-[#345477]/15 bg-white space-y-4">
                <h2 className="font-display text-lg font-bold text-[#26364A]">
                  Kebijakan, Panduan & Footer
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Judul Banner Promosi
                    </label>
                    <input
                      type="text"
                      value={storeForm.banner_promo_title}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, banner_promo_title: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Teks Footer
                    </label>
                    <input
                      type="text"
                      value={storeForm.footer_text}
                      onChange={(e) => setStoreForm({ ...storeForm, footer_text: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Kebijakan Privasi
                    </label>
                    <textarea
                      rows={3}
                      value={storeForm.policy_privacy}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, policy_privacy: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Syarat & Ketentuan
                    </label>
                    <textarea
                      rows={3}
                      value={storeForm.policy_terms}
                      onChange={(e) => setStoreForm({ ...storeForm, policy_terms: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Kebijakan Pengembalian Dana
                    </label>
                    <textarea
                      rows={3}
                      value={storeForm.policy_refund}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, policy_refund: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Panduan Pembelian
                    </label>
                    <textarea
                      rows={3}
                      value={storeForm.purchase_guide}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, purchase_guide: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer shadow-xs"
                >
                  Simpan Pengaturan Toko
                </button>
              </div>
            </form>
          )}

          {/* TAB: CONTACT MESSAGES */}
          {tab === 'messages' && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#26364A]">
                Pesan dari Pengunjung
              </h1>
              {messages.length === 0 ? (
                <div className="p-10 text-center border border-[#345477]/14 rounded-xl text-sm text-[#7890AA]">
                  Belum ada pesan masuk dari formulir Kontak.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-xl border border-[#345477]/14 bg-white space-y-2"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold text-[#26364A]">{m.subject}</p>
                        <span className="text-xs text-[#7890AA] font-mono-num">
                          {formatTanggal(m.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[#345477]">
                        Dari: {m.name} ({m.email}
                        {m.whatsapp ? ` · ${m.whatsapp}` : ''})
                      </p>
                      <p className="text-sm text-[#26364A] pt-1">{m.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Product Create/Edit Modal */}
      {editingProduct !== undefined && adminToken && (
        <AdminProductModal
          adminToken={adminToken}
          categories={categories}
          initialProduct={editingProduct}
          onClose={() => setEditingProduct(undefined)}
          onSaved={() => {
            setEditingProduct(undefined);
            showToast('Data produk disimpan.');
            void loadDashboardData();
          }}
        />
      )}

      {/* Order Verification & Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#26364A]/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#345477]/20 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="no-print flex items-center justify-between border-b border-[#345477]/12 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#26364A]">
                  Pesanan {selectedOrder.order_number}
                </h2>
                <p className="text-xs text-[#7890AA]">
                  {selectedOrder.buyer_name} · {selectedOrder.buyer_email} ·{' '}
                  {selectedOrder.buyer_whatsapp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg text-[#7890AA] hover:text-[#26364A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showInvoiceModal ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="no-print text-xs font-semibold text-[#345477] cursor-pointer"
                >
                  ← Kembali ke Verifikasi Pembayaran
                </button>
                <InvoiceDocument order={selectedOrder} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Proof Viewer (raw original image) */}
                <div className="space-y-3 border border-[#345477]/15 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7890AA]">
                    Bukti Pembayaran Asli Pembeli
                  </p>
                  {proofPreviewUrl ? (
                    <img
                      src={proofPreviewUrl}
                      alt="Bukti transfer asli pembeli"
                      className="w-full max-h-80 object-contain rounded-lg border border-[#345477]/12 bg-white"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-[#7890AA] border border-dashed border-[#345477]/20 rounded-lg">
                      Pembeli belum mengunggah bukti pembayaran.
                    </div>
                  )}
                </div>

                {/* Order Actions */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[#345477]/14 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#7890AA]">Status Saat Ini</span>
                      <span className="font-semibold text-[#345477]">
                        {PAYMENT_STATUS_META[selectedOrder.payment_status].label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7890AA]">Total Tagihan</span>
                      <span className="font-mono-num font-bold text-[#26364A]">
                        {formatRupiah(selectedOrder.total_amount)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#345477]/10 space-y-1">
                      {(selectedOrder.items || []).map((i) => (
                        <div key={i.id} className="flex justify-between text-xs">
                          <span>{i.product_title}</span>
                          <span className="font-mono-num">{formatRupiah(i.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Alasan Penolakan (Jika Ditolak)
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Contoh: Nominal transfer kurang atau gambar buram"
                      className="w-full px-3 py-2 rounded-lg border border-[#345477]/20 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Catatan Admin
                    </label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Catatan internal"
                      className="w-full px-3 py-2 rounded-lg border border-[#345477]/20 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(selectedOrder.order_number, 'lunas')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#D6B36A]" />
                      <span>Setujui (Lunas)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(selectedOrder.order_number, 'ditolak')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#991B1B]/30 text-[#991B1B] hover:bg-[#991B1B]/5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Pembayaran</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(true)}
                    className="w-full py-2.5 rounded-lg text-xs font-semibold border border-[#345477]/25 text-[#345477] cursor-pointer"
                  >
                    Lihat & Cetak Invoice A4
                  </button>

                  {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                    <div className="p-4 rounded-xl border border-[#345477]/14 bg-[#EAF0F7]/40 space-y-2.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#345477]">
                        Riwayat Perubahan Status
                      </p>
                      <div className="space-y-2">
                        {selectedOrder.status_history.map((h) => (
                          <div key={h.id} className="text-xs flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[#26364A]">
                                {PAYMENT_STATUS_META[h.status as PaymentStatus]?.label || h.status}
                                {h.changed_by ? ` · ${h.changed_by}` : ''}
                              </p>
                              {h.note && <p className="text-[#7890AA]">{h.note}</p>}
                            </div>
                            <span className="font-mono-num text-[11px] text-[#7890AA] shrink-0">
                              {formatTanggal(h.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Orders Detail Modal */}
      {selectedCustomerOrders && (
        <div className="fixed inset-0 z-50 bg-[#26364A]/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#345477]/20 rounded-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#345477]/12 pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#26364A]">
                  Riwayat Transaksi: {selectedCustomerOrders.customer.name}
                </h2>
                <p className="text-xs text-[#7890AA]">{selectedCustomerOrders.customer.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerOrders(null)}
                className="p-2 text-[#7890AA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedCustomerOrders.orders.length === 0 ? (
              <p className="text-sm text-[#7890AA] py-6 text-center">
                Pelanggan ini belum memiliki pesanan.
              </p>
            ) : (
              <div className="divide-y divide-[#345477]/10 max-h-80 overflow-y-auto">
                {selectedCustomerOrders.orders.map((o) => (
                  <div key={o.id} className="py-3 flex justify-between text-sm">
                    <div>
                      <p className="font-mono-num font-semibold text-[#345477]">{o.order_number}</p>
                      <p className="text-xs text-[#7890AA]">{formatTanggal(o.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-num font-semibold">{formatRupiah(o.total_amount)}</p>
                      <p className="text-xs text-[#7890AA]">
                        {PAYMENT_STATUS_META[o.payment_status].label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
