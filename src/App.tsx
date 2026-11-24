import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminDashboardPage } from './admin/AdminDashboardPage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { StoreProvider, useStore } from './context/StoreContext';
import { AccountPage } from './pages/AccountPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { AboutPage, ContactPage, FaqPage, PolicyPage } from './pages/InfoPages';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';

function ToastBanner() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm ${
        toast.type === 'error'
          ? 'bg-white border-[#991B1B]/40 text-[#991B1B]'
          : 'bg-[#345477] border-[#D6B36A] text-white'
      }`}
    >
      {toast.text}
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#26364A]">
      {!isAdminRoute && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/katalog" element={<CatalogPage />} />
          <Route path="/produk/:slug" element={<ProductDetailPage />} />
          <Route path="/kategori" element={<CategoriesPage />} />
          <Route path="/kategori/:slug" element={<CatalogPage />} />
          <Route
            path="/produk-gratis"
            element={
              <CatalogPage
                presetFilter="gratis"
                pageTitle="Produk Digital Gratis"
                pageDescription="Koleksi e-book, cerita rakyat, dan lembar kerja gratis berkualitas resmi dari NusaKlik."
              />
            }
          />
          <Route
            path="/produk-promo"
            element={
              <CatalogPage
                presetFilter="promo"
                pageTitle="Produk Promo Khusus"
                pageDescription="Dapatkan potongan harga spesial untuk produk digital pilihan di NusaKlik."
              />
            }
          />
          <Route
            path="/produk-unggulan"
            element={
              <CatalogPage
                presetFilter="unggulan"
                pageTitle="Produk Digital Unggulan"
                pageDescription="Karya digital terbaik pilihan editor NusaKlik untuk membaca, belajar, dan berkarya."
              />
            }
          />
          <Route path="/keranjang" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/konfirmasi-pembayaran" element={<OrderConfirmationPage />} />
          <Route path="/konfirmasi-pembayaran/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/pesanan/:orderNumber" element={<OrderConfirmationPage />} />
          <Route path="/masuk" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/daftar" element={<RegisterPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/akun" element={<AccountPage />} />
          <Route path="/riwayat-pesanan" element={<OrderHistoryPage />} />
          <Route path="/tentang" element={<AboutPage />} />
          <Route path="/kontak" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/kebijakan-privasi" element={<PolicyPage type="privacy" />} />
          <Route path="/syarat-ketentuan" element={<PolicyPage type="terms" />} />
          <Route path="/kebijakan-pengembalian-dana" element={<PolicyPage type="refund" />} />
          <Route path="/panduan-pembelian" element={<PolicyPage type="guide" />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/*" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
      <ToastBanner />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </BrowserRouter>
  );
}
