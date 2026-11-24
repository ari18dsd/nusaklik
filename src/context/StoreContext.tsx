import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import type { AdminUser, CartItem, Category, CustomerUser, Product, StoreSettings } from '../types';
import { getEffectivePrice } from '../utils/format';

const CART_STORAGE_KEY = 'nusaklik_cart_v1';

interface StoreContextValue {
  settings: StoreSettings;
  categories: Category[];
  loadingConfig: boolean;
  refreshConfig: () => Promise<void>;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product) => { added: boolean; message: string };
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;

  // Customer Auth (kept strictly in React memory, never localStorage)
  customerToken: string | null;
  customer: CustomerUser | null;
  setCustomerSession: (token: string | null, user: CustomerUser | null) => void;
  logoutCustomer: () => void;

  // Admin Auth (kept strictly in React memory, never localStorage)
  adminToken: string | null;
  admin: AdminUser | null;
  setAdminSession: (token: string | null, user: AdminUser | null) => void;
  logoutAdmin: () => void;

  // Ephemeral guest order access tokens in memory
  orderAccessTokens: Record<string, string>;
  saveOrderAccessToken: (orderNumber: string, accessToken: string) => void;

  // Toast feedback
  toast: { type: 'success' | 'error'; text: string } | null;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'NusaKlik',
  tagline_main: 'Temukan Produk Digital, Buka Peluang Baru.',
  tagline_sub: 'Baca • Belajar • Berkarya • Berkreasi.',
  store_description:
    'Toko produk digital independen Indonesia yang menghadirkan e-book, template website, materi pendidikan, dan aset kreatif terkurasi.',
  logo_url: '/assets/logo/logo-horizontal.svg',
  logo_white_url: '/assets/logo/logo-white.svg',
  banner_hero_url: '/assets/banner/hero-nusaklik.jpg',
  banner_promo_url: '/assets/banner/promo-nusaklik.jpg',
  banner_promo_title: 'Koleksi Kurasi Kreatif & Bisnis Digital',
  banner_promo_subtitle: 'Lihat produk digital dan informasi promo yang diaktifkan oleh pengelola toko.',
  watermark_url: '/assets/watermark/watermark-blue.png',
  favicon_url: '/assets/favicon/favicon.svg',
  whatsapp_number: '',
  email: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
  qris_image_url: '',
  qris_nmid: '',
  social_instagram: '',
  social_tiktok: '',
  social_youtube: '',
  footer_text: 'Toko Produk Digital Independen Indonesia.',
  policy_privacy: '',
  policy_terms: '',
  policy_refund: '',
  purchase_guide: '',
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [orderAccessTokens, setOrderAccessTokens] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshConfig = useCallback(async () => {
    try {
      const [settingsRes, catRes] = await Promise.all([
        apiRequest<{ settings: StoreSettings }>('/settings'),
        apiRequest<{ categories: Category[] }>('/categories'),
      ]);
      setSettings((prev) => ({ ...prev, ...settingsRes.settings }));
      setCategories(catRes.categories);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Pengaturan toko gagal dimuat.', 'error');
    } finally {
      setLoadingConfig(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  // Keep browser favicon synchronized if admin updates favicon_url
  useEffect(() => {
    if (settings.favicon_url) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) {
        link.href = settings.favicon_url;
        link.type = /\.svg(?:[?#]|$)/i.test(settings.favicon_url) ? 'image/svg+xml' : '';
      }
    }
  }, [settings.favicon_url]);

  // Persist cart only (never auth tokens or official order records)
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  const addToCart = useCallback(
    (product: Product) => {
      const existing = cart.find((item) => item.product.id === product.id);
      if (existing) {
        if (!product.allow_quantity) {
          showToast(`"${product.title}" sudah ada di keranjang.`);
          return { added: false, message: 'Produk ini tidak mendukung pembelian lebih dari satu.' };
        }
        setCart((prev) =>
          prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item
          )
        );
        showToast(`Jumlah "${product.title}" di keranjang menjadi ${Math.min(20, existing.quantity + 1)}.`);
        return { added: true, message: 'Jumlah diperbarui.' };
      }

      setCart((prev) => [...prev, { product, quantity: 1 }]);
      showToast(`"${product.title}" ditambahkan ke keranjang.`);
      return { added: true, message: 'Berhasil ditambahkan ke keranjang.' };
    },
    [cart, showToast]
  );

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(20, quantity) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) =>
      sum +
      getEffectivePrice(item.product.price, item.product.discount_price, item.product.is_free) *
        item.quantity,
    0
  );

  const setCustomerSession = useCallback((token: string | null, user: CustomerUser | null) => {
    setCustomerToken(token);
    setCustomer(user);
  }, []);

  const logoutCustomer = useCallback(() => {
    setCustomerToken(null);
    setCustomer(null);
    showToast('Anda telah keluar dari akun pelanggan.');
  }, [showToast]);

  const setAdminSession = useCallback((token: string | null, user: AdminUser | null) => {
    setAdminToken(token);
    setAdmin(user);
  }, []);

  const logoutAdmin = useCallback(() => {
    setAdminToken(null);
    setAdmin(null);
    showToast('Sesi admin telah berakhir.');
  }, [showToast]);

  const saveOrderAccessToken = useCallback((orderNumber: string, accessToken: string) => {
    setOrderAccessTokens((prev) => ({ ...prev, [orderNumber]: accessToken }));
  }, []);

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        loadingConfig,
        refreshConfig,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        customerToken,
        customer,
        setCustomerSession,
        logoutCustomer,
        adminToken,
        admin,
        setAdminSession,
        logoutAdmin,
        orderAccessTokens,
        saveOrderAccessToken,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
