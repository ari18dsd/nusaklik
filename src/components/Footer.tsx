import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { isSafeUrl } from '../utils/format';

export function Footer() {
  const { settings } = useStore();
  const logoWhite = isSafeUrl(settings.logo_white_url)
    ? settings.logo_white_url
    : '/assets/logo/logo-white.svg';

  const cleanWa = (settings.whatsapp_number || '').replace(/[^\d]/g, '');

  return (
    <footer className="no-print bg-[#345477] text-white border-t-2 border-[#D6B36A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img src={logoWhite} alt={settings.store_name} className="h-9 w-auto object-contain" />
            </Link>
            <p className="text-sm font-medium text-[#D6B36A]">{settings.tagline_main}</p>
            <p className="text-sm text-white/80 leading-relaxed">{settings.footer_text}</p>
            <p className="text-xs text-white/70 tracking-wide">{settings.tagline_sub}</p>
          </div>

          {/* Katalog Links */}
          <div>
            <h3 className="font-sans-ui text-sm font-semibold text-[#D6B36A] mb-4">Jelajahi Produk</h3>
            <ul className="space-y-2.5 text-sm text-white/85">
              <li><Link to="/katalog" className="hover:text-[#D6B36A] transition-colors">Semua Produk Digital</Link></li>
              <li><Link to="/kategori" className="hover:text-[#D6B36A] transition-colors">Kategori Produk</Link></li>
              <li><Link to="/produk-unggulan" className="hover:text-[#D6B36A] transition-colors">Produk Unggulan</Link></li>
              <li><Link to="/produk-promo" className="hover:text-[#D6B36A] transition-colors">Produk Promo</Link></li>
              <li><Link to="/produk-gratis" className="hover:text-[#D6B36A] transition-colors">Produk Gratis</Link></li>
            </ul>
          </div>

          {/* Bantuan & Informasi */}
          <div>
            <h3 className="font-sans-ui text-sm font-semibold text-[#D6B36A] mb-4">Informasi & Layanan</h3>
            <ul className="space-y-2.5 text-sm text-white/85">
              <li><Link to="/panduan-pembelian" className="hover:text-[#D6B36A] transition-colors">Panduan Pembelian</Link></li>
              <li><Link to="/konfirmasi-pembayaran" className="hover:text-[#D6B36A] transition-colors">Konfirmasi Pembayaran</Link></li>
              <li><Link to="/faq" className="hover:text-[#D6B36A] transition-colors">Pertanyaan Umum (FAQ)</Link></li>
              <li><Link to="/tentang" className="hover:text-[#D6B36A] transition-colors">Tentang NusaKlik</Link></li>
              <li><Link to="/kontak" className="hover:text-[#D6B36A] transition-colors">Hubungi Kami</Link></li>
            </ul>
          </div>

          {/* Kebijakan & Kontak */}
          <div>
            <h3 className="font-sans-ui text-sm font-semibold text-[#D6B36A] mb-4">Kebijakan & Kontak</h3>
            <ul className="space-y-2.5 text-sm text-white/85 mb-5">
              <li><Link to="/kebijakan-privasi" className="hover:text-[#D6B36A] transition-colors">Kebijakan Privasi</Link></li>
              <li><Link to="/syarat-ketentuan" className="hover:text-[#D6B36A] transition-colors">Syarat dan Ketentuan</Link></li>
              <li><Link to="/kebijakan-pengembalian-dana" className="hover:text-[#D6B36A] transition-colors">Kebijakan Pengembalian Dana</Link></li>
            </ul>
            {(settings.email || cleanWa) ? (
              <div className="text-xs text-white/80 space-y-2 pt-3 border-t border-white/15">
                {settings.email && <p>Email: {settings.email}</p>}
                {cleanWa && (
                  <a
                    href={`https://wa.me/${cleanWa}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D6B36A] text-[#26364A] font-semibold hover:bg-[#c8a357] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp: +{cleanWa}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/65 pt-3 border-t border-white/15">
                Kontak resmi toko sedang disiapkan pengelola.
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/75">
          <p>© {new Date().getFullYear()} {settings.store_name}. Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-5">
            {isSafeUrl(settings.social_instagram) && (
              <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="hover:text-[#D6B36A]">
                Instagram
              </a>
            )}
            {isSafeUrl(settings.social_tiktok) && (
              <a href={settings.social_tiktok} target="_blank" rel="noreferrer" className="hover:text-[#D6B36A]">
                TikTok
              </a>
            )}
            {isSafeUrl(settings.social_youtube) && (
              <a href={settings.social_youtube} target="_blank" rel="noreferrer" className="hover:text-[#D6B36A]">
                YouTube
              </a>
            )}
            <Link to="/admin" className="hover:text-[#D6B36A] font-semibold">
              Dashboard Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
