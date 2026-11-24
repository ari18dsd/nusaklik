import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { isSafeUrl } from '../utils/format';

export function Header() {
  const { settings, cartCount, customer } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Beranda' },
    { to: '/katalog', label: 'Katalog' },
    { to: '/produk-gratis', label: 'Gratis' },
    { to: '/produk-promo', label: 'Promo' },
    { to: '/tentang', label: 'Tentang' },
  ];

  const logoSrc = isSafeUrl(settings.logo_url) ? settings.logo_url : '/assets/logo/logo-horizontal.svg';

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#345477]/12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark Logo */}
        <Link
          to="/"
          className="flex items-center shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#345477] rounded"
          aria-label={`${settings.store_name} Beranda`}
        >
          <img
            src={logoSrc}
            alt={settings.store_name}
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </Link>

        {/* Zone 2: Primary Navigation (4-5 concise links) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#26364A]" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#D6B36A] text-[#345477] font-semibold'
                    : 'border-transparent text-[#26364A] hover:text-[#345477] hover:border-[#D6B36A]/50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Primary Action Zone */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            to="/keranjang"
            className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#26364A] border border-[#345477]/15 hover:border-[#345477]/40 transition-colors whitespace-nowrap shrink-0"
            aria-label={`Keranjang belanja, ${cartCount} item`}
          >
            <ShoppingBag className="w-4 h-4 text-[#345477]" />
            <span className="hidden sm:inline">Keranjang</span>
            <span className="font-mono-num text-xs font-bold text-[#345477]">({cartCount})</span>
          </Link>

          <Link
            to={customer ? '/akun' : '/masuk'}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors whitespace-nowrap shrink-0"
          >
            <User className="w-4 h-4 text-[#D6B36A]" />
            <span>{customer ? 'Akun Saya' : 'Masuk'}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#345477]/15 text-[#26364A]"
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#345477]/15 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-[#345477] text-white' : 'text-[#26364A] hover:bg-[#345477]/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-[#345477]/10 grid grid-cols-2 gap-2">
            <Link
              to="/kategori"
              onClick={() => setMobileOpen(false)}
              className="text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-[#345477]/20 text-[#345477]"
            >
              Kategori
            </Link>
            <Link
              to={customer ? '/akun' : '/masuk'}
              onClick={() => setMobileOpen(false)}
              className="text-center px-3 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white"
            >
              {customer ? 'Akun Saya' : 'Masuk / Daftar'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
