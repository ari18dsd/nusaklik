import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { StaticDemoNotice } from '../components/StaticDemoNotice';
import { IS_STATIC_SITE, siteAsset } from '../config/staticSite';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { Product } from '../types';
import { isSafeUrl } from '../utils/format';

const HOME_FAQS = [
  {
    q: 'Bagaimana cara menerima produk setelah pembayaran?',
    a: 'Setelah Anda mengunggah bukti transfer atau QRIS, admin NusaKlik akan memeriksa transaksi Anda. Begitu berstatus Lunas, tombol unduhan langsung aktif di halaman pesanan dan di Riwayat Pesanan akun Anda.',
  },
  {
    q: 'Apakah saya harus membuat akun terlebih dahulu sebelum membeli?',
    a: 'Tidak wajib. Anda dapat melakukan checkout sebagai tamu dan langsung mendapat tautan akses pesanan serta invoice. Namun, membuat akun memudahkan Anda mengakses seluruh produk yang pernah dibeli kapan saja.',
  },
  {
    q: 'Apakah produk digital dapat diunduh ulang di kemudian hari?',
    a: 'Ya. Pelanggan yang terdaftar dapat mengunduh ulang produk berstatus Lunas melalui menu Riwayat Pesanan maupun Koleksi Saya tanpa biaya tambahan.',
  },
];

const STATIC_HOME_FAQS = [
  {
    q: 'Produk mana yang dapat dipesan?',
    a: 'Gunakan tombol Pesan Sekarang pada produk yang tersedia di katalog. Formulir pemesanan dibuka di Google Form.',
  },
  {
    q: 'Apakah situs menyediakan file produk untuk diunduh?',
    a: 'Tidak. Tautan file produk tidak dipublikasikan di situs; berkas diberikan secara manual setelah pembayaran diverifikasi.',
  },
  {
    q: 'Bagaimana menerima produk setelah memesan?',
    a: 'Isi Google Form dan ikuti instruksi di dalamnya. Pembayaran diperiksa secara manual; file produk diberikan setelah pembayaran diverifikasi.',
  },
];

export function HomePage() {
  const {
    settings,
    categories,
    showToast,
    publicCatalogProducts,
    publicCatalogLoading,
    publicCatalogSource,
  } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    if (IS_STATIC_SITE) {
      setProducts(publicCatalogProducts);
      setLoading(publicCatalogLoading);
      return () => {
        active = false;
      };
    }

    apiRequest<{ products: Product[] }>('/products?limit=24')
      .then((res) => {
        if (active) setProducts(res.products);
      })
      .catch((err) => {
        if (active) showToast(err instanceof Error ? err.message : 'Katalog gagal dimuat.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast, publicCatalogProducts, publicCatalogLoading]);

  const featuredProducts = products.filter((p) => p.is_featured === 1).slice(0, 4);
  const popularProducts = products.filter((p) => p.is_popular === 1).slice(0, 4);
  const latestProducts = (IS_STATIC_SITE ? [...products].reverse() : products).slice(0, 4);
  const isFallbackCatalog = IS_STATIC_SITE && publicCatalogSource === 'fallback';
  const freeProducts = products.filter((p) => p.is_free === 1).slice(0, 4);
  const promoProducts = products
    .filter((p) => p.is_promo === 1 || (p.discount_price !== null && p.discount_price < p.price))
    .slice(0, 4);

  const heroBanner = isSafeUrl(settings.banner_hero_url)
    ? settings.banner_hero_url
    : siteAsset('assets/banner/hero-nusaklik.jpg');
  const promoBanner = isSafeUrl(settings.banner_promo_url)
    ? settings.banner_promo_url
    : siteAsset('assets/banner/promo-nusaklik.jpg');

  return (
    <div className="bg-white text-[#26364A]">
      <SeoHead
        title={
          IS_STATIC_SITE
            ? `${settings.store_name} — Katalog & Pemesanan Manual`
            : `${settings.store_name} — Toko Produk Digital Modern Indonesia`
        }
        description={
          IS_STATIC_SITE
            ? 'Katalog produk NusaKlik dimuat dari Google Sheets. Pemesanan dilakukan manual melalui Google Form dan file diberikan setelah pembayaran diverifikasi.'
            : settings.store_description
        }
      />
      {IS_STATIC_SITE && <StaticDemoNotice />}

      {/* 1. HERO SECTION — Biru Muda Lembut (#EAF0F7) */}
      <section className="bg-[#EAF0F7] border-b border-[#345477]/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#B89143]">
                {settings.tagline_sub}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[46px] font-bold text-[#26364A] leading-[1.16] text-balance">
                {settings.tagline_main}
              </h1>
              <p className="text-base sm:text-lg text-[#26364A]/80 leading-relaxed max-w-xl">
                {IS_STATIC_SITE
                  ? publicCatalogLoading
                    ? 'Katalog produk Admin sedang dimuat. Produk yang tersedia dapat dipesan secara manual melalui Google Form.'
                    : isFallbackCatalog
                      ? 'Katalog Admin tidak dapat dimuat. Situs menampilkan katalog cadangan; entri DEMO bukan penawaran aktif.'
                      : 'Katalog aktif dikelola melalui Google Sheets. Pemesanan dilakukan manual melalui Google Form.'
                  : settings.store_description}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/katalog"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] shadow-sm transition-colors"
                >
                  <span>Jelajahi Produk</span>
                  <ArrowRight className="w-4 h-4 text-[#D6B36A]" />
                </Link>
                <Link
                  to={
                    IS_STATIC_SITE
                      ? latestProducts[0]
                        ? `/produk/${latestProducts[0].slug}`
                        : '/katalog'
                      : '/produk-gratis'
                  }
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white text-[#345477] border border-[#345477]/25 hover:border-[#D6B36A] hover:text-[#26364A] transition-colors"
                >
                  <span>
                    {IS_STATIC_SITE
                      ? latestProducts[0]
                        ? 'Lihat Produk Terbaru'
                        : 'Buka Katalog'
                      : 'Lihat Produk Gratis'}
                  </span>
                </Link>
              </div>
              <div className="pt-4 border-t border-[#345477]/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[#345477]">
                <span>{IS_STATIC_SITE ? `${categories.length} Kategori Produk` : '12 Kategori Terkurasi'}</span>
                <span aria-hidden="true">·</span>
                <span>{IS_STATIC_SITE ? 'Pemesanan Manual via Form' : 'Unduhan Aman Terproteksi'}</span>
                <span aria-hidden="true">·</span>
                <span>{IS_STATIC_SITE ? 'Tanpa Checkout Otomatis' : 'Invoice Resmi A4'}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-[#345477]/15 bg-white p-2 shadow-[0_22px_48px_-20px_rgba(38,54,74,0.28)]">
                <img
                  src={heroBanner}
                  alt="Koleksi produk digital NusaKlik pada ruang kerja modern"
                  className="w-full aspect-[16/9] object-cover rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KATEGORI PRODUK — Putih Bersih (#FFFFFF) */}
      <section className="bg-white py-14 border-b border-[#345477]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143] mb-1.5">
                Eksplorasi Topik
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
                Kategori Produk Digital
              </h2>
            </div>
            <Link
              to="/kategori"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#345477] hover:text-[#B89143] transition-colors"
            >
              <span>Lihat Semua Kategori</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/kategori/${cat.slug}`}
                className="group p-4 rounded-xl bg-[#EAF0F7]/55 border border-[#345477]/12 hover:bg-white hover:border-[#D6B36A] hover:shadow-[0_10px_24px_-12px_rgba(52,84,119,0.2)] transition-all flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm sm:text-base text-[#26364A] group-hover:text-[#345477]">
                    {cat.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#7890AA] group-hover:text-[#D6B36A] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-[#7890AA] font-mono-num">
                  {IS_STATIC_SITE
                    ? `${cat.product_count ?? 0} entri katalog`
                    : `${cat.product_count ?? 0} produk tersedia`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PRODUK UNGGULAN — Putih dengan Kartu Elegan (#FFFFFF) */}
      {(!IS_STATIC_SITE || featuredProducts.length > 0) && (
        <section className="bg-white py-14 border-b border-[#345477]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow={IS_STATIC_SITE ? 'Data Contoh' : 'Pilihan Editor'}
              title={IS_STATIC_SITE ? 'Produk Unggulan (DEMO)' : 'Produk Unggulan'}
              linkTo="/produk-unggulan"
              linkLabel="Semua Produk Unggulan"
            />
            {loading ? (
              <ProductGridSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. PROMO & PENAWARAN KHUSUS — Krem Hangat (#F5F0E6) dengan Aksen Gold */}
      <section className="bg-[#F5F0E6] py-14 border-b border-[#D6B36A]/35">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="rounded-2xl border border-[#D6B36A]/55 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center shadow-[0_14px_34px_-18px_rgba(38,54,74,0.18)]">
            <div className="lg:col-span-6 p-8 sm:p-10 lg:p-12 space-y-5">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#B89143]">
                {IS_STATIC_SITE ? 'Pratinjau PROMO DEMO' : 'Penawaran Khusus NusaKlik'}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A] leading-snug">
                {settings.banner_promo_title}
              </h2>
              <p className="text-sm sm:text-base text-[#7890AA] leading-relaxed">
                {IS_STATIC_SITE
                  ? 'Produk dan harga bertanda promo berikut hanya data contoh. Tidak ada penawaran aktif atau transaksi pada versi statis.'
                  : settings.banner_promo_subtitle}
              </p>
              <div className="pt-1">
                <Link
                  to="/produk-promo"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#D6B36A] text-[#26364A] hover:bg-[#c8a357] transition-colors"
                >
                  <span>{IS_STATIC_SITE ? 'Lihat Promo Demo' : 'Lihat Produk Promo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 h-full">
              <img
                src={promoBanner}
                alt="Banner promosi koleksi produk digital NusaKlik"
                className="w-full h-full min-h-[220px] max-h-[340px] object-cover"
              />
            </div>
          </div>

          {promoProducts.length > 0 && (
            <div>
              <SectionHeader
                eyebrow={IS_STATIC_SITE ? 'Harga Contoh DEMO' : 'Harga Spesial'}
                title={IS_STATIC_SITE ? 'Produk Bertanda Promo (DEMO)' : 'Promo Khusus Minggu Ini'}
                linkTo="/produk-promo"
                linkLabel="Semua Promo"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {promoProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. PRODUK POPULER & TERBARU — Putih Bersih (#FFFFFF) */}
      <section className="bg-white py-14 border-b border-[#345477]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {(!IS_STATIC_SITE || popularProducts.length > 0) && (
            <div>
              <SectionHeader
                eyebrow={IS_STATIC_SITE ? 'Data Contoh' : 'Paling Banyak Diunduh'}
                title={IS_STATIC_SITE ? 'Produk Populer (DEMO)' : 'Produk Populer'}
                linkTo="/katalog?sort=populer"
                linkLabel="Urutkan Populer"
              />
              {loading ? (
                <ProductGridSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {popularProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <SectionHeader
              eyebrow={isFallbackCatalog ? 'Katalog Cadangan' : IS_STATIC_SITE ? 'Katalog Admin' : 'Rilis Terkini'}
              title={isFallbackCatalog ? 'Produk Terbaru & Contoh Lainnya' : 'Produk Terbaru'}
              linkTo="/katalog?sort=terbaru"
              linkLabel="Semua Produk Terbaru"
            />
            {loading ? (
              <ProductGridSkeleton />
            ) : latestProducts.length === 0 ? (
              <p className="rounded-xl border border-[#345477]/14 bg-white px-5 py-8 text-center text-sm text-[#7890AA]">
                Belum ada produk aktif di katalog.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {latestProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. PRODUK GRATIS — Biru Muda (#EAF0F7) */}
      {freeProducts.length > 0 && (
        <section className="bg-[#EAF0F7] py-14 border-b border-[#345477]/12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow={IS_STATIC_SITE ? 'Label Data DEMO' : 'Akses Terbuka'}
              title={IS_STATIC_SITE ? 'Contoh Produk Bertanda Gratis' : 'Produk Gratis Pilihan'}
              linkTo="/produk-gratis"
              linkLabel={IS_STATIC_SITE ? 'Lihat Semua Demo' : 'Lihat Semua Produk Gratis'}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {freeProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. KEUNGGULAN BERBELANJA DI NUSAKLIK — Krem Hangat (#F5F0E6) dengan Aksen Gold */}
      <section className="bg-[#F5F0E6] py-14 border-b border-[#D6B36A]/35">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143] mb-1.5">
              Mengapa NusaKlik
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
              {IS_STATIC_SITE ? 'Tentang Tampilan NusaKlik' : 'Keunggulan Berbelanja di NusaKlik'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(IS_STATIC_SITE
              ? [
                  {
                    icon: ShieldCheck,
                  title: 'Katalog Admin',
                  desc: 'Produk aktif ditampilkan dari katalog Google Sheets yang dikelola melalui Admin.',
                  },
                  {
                    icon: Lock,
                    title: 'Pemesanan Manual',
                  desc: 'Gunakan Google Form pada produk untuk memesan. Pembayaran diperiksa secara manual.',
                  },
                  {
                    icon: Download,
                    title: 'Tanpa File Unduhan',
                  desc: 'Tautan file produk privat tidak disertakan di situs publik dan file diberikan setelah verifikasi.',
                  },
                  {
                    icon: BookOpen,
                  title: 'Informasi Produk',
                  desc: 'Nama, kategori, harga, deskripsi, dan cover dimuat dari data katalog Admin.',
                  },
                ]
              : [
              {
                icon: ShieldCheck,
                title: 'Kualitas Terkurasi',
                desc: 'Setiap e-book, template, dan aset ditinjau sebelum diterbitkan agar langsung siap dimanfaatkan.',
              },
              {
                icon: Lock,
                title: 'Unduhan Privat Aman',
                desc: 'Produk berbayar disimpan di penyimpanan privat dan hanya dibuka setelah verifikasi pembayaran resmi.',
              },
              {
                icon: Download,
                title: 'Akses Ulang Kapan Saja',
                desc: 'Pesanan tersimpan rapi di akun Anda beserta riwayat unduhan dan nota transaksi berformat A4.',
              },
              {
                icon: BookOpen,
                title: 'Lisensi Jelas & Transparan',
                desc: 'Setiap produk menyertakan rincian format berkas, isi materi, dan ketentuan lisensi penggunaan.',
              },
            ]).map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl bg-white border border-[#D6B36A]/45 shadow-[0_8px_22px_-12px_rgba(38,54,74,0.12)] space-y-3"
              >
                <div className="w-11 h-11 rounded-xl bg-[#F5F0E6] border border-[#D6B36A] flex items-center justify-center text-[#345477]">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-sans-ui text-base font-semibold text-[#26364A]">{item.title}</h3>
                <p className="text-sm text-[#7890AA] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. ALUR PEMBELIAN — Biru Keabu-abuan Lembut (#DCE6F0) */}
      <section className="bg-[#DCE6F0] py-14 border-b border-[#345477]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#345477] mb-1.5">
              {IS_STATIC_SITE ? 'Informasi Versi Statis' : 'Alur Transparan'}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
              {IS_STATIC_SITE ? 'Status Fitur di GitHub Pages' : 'Cara Berbelanja di NusaKlik'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(IS_STATIC_SITE
              ? [
                  {
                    icon: BookOpen,
                  title: 'Cari dan Filter Produk',
                  description: 'Produk aktif dari Google Sheets dapat dicari dan difilter berdasarkan kategori.',
                  },
                  {
                    icon: ShieldCheck,
                  title: 'Pemesanan Manual',
                  description: 'Tombol Pesan Sekarang membuka Google Form; situs tidak memproses pembayaran otomatis.',
                  },
                  {
                    icon: Download,
                    title: 'Unduhan Nonaktif',
                  description: 'Tidak ada tautan file produk publik. File diberikan secara manual setelah pembayaran diverifikasi.',
                  },
                ]
              : [
              {
                icon: BookOpen,
                title: 'Pilih Produk',
                description: 'Periksa detail, format file, harga, dan lisensi sebelum menambahkan produk ke keranjang.',
              },
              {
                icon: ShieldCheck,
                title: 'Bayar dengan Aman',
                description: 'Gunakan rekening atau QRIS resmi yang ditampilkan saat checkout dan unggah bukti pembayaran asli.',
              },
              {
                icon: Download,
                title: 'Unduh Setelah Disetujui',
                description: 'Admin memeriksa bukti pembayaran. File produk berbayar tersedia setelah status pesanan Lunas.',
              },
            ]).map((step) => (
              <div
                key={step.title}
                className="p-6 rounded-2xl bg-white border border-[#345477]/14 shadow-[0_10px_26px_-14px_rgba(38,54,74,0.16)] space-y-4"
              >
                <step.icon className="w-6 h-6 text-[#345477]" />
                <h3 className="text-sm font-semibold text-[#345477]">{step.title}</h3>
                <p className="text-sm text-[#26364A] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ SINGKAT — Putih (#FFFFFF) */}
      <section className="bg-white py-14 border-b border-[#345477]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143] mb-1.5">
                Informasi Cepat
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>
            <Link to="/faq" className="text-sm font-semibold text-[#345477] hover:text-[#B89143]">
              Lihat Semua FAQ →
            </Link>
          </div>

          <div className="divide-y divide-[#345477]/14 border-y border-[#345477]/14">
            {(IS_STATIC_SITE ? STATIC_HOME_FAQS : HOME_FAQS).map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-semibold text-base text-[#26364A] cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#345477] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#7890AA] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-[#7890AA] leading-relaxed pr-6">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. CALL TO ACTION — Biru Muda (#EAF0F7) */}
      <section className="bg-[#EAF0F7] py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#345477] text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-b-4 border-[#D6B36A] shadow-[0_20px_44px_-18px_rgba(38,54,74,0.3)]">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D6B36A]">
                <Sparkles className="w-4 h-4" />
                <span>Mulai Langkah Baru</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
                Siap Memperkaya Wawasan dan Karya Digital Anda?
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                {IS_STATIC_SITE
                  ? 'Pilih produk dari katalog Admin dan gunakan tombol Pesan Sekarang untuk membuka Google Form.'
                  : 'Jelajahi katalog NusaKlik atau buat akun pelanggan untuk menyimpan riwayat unduhan Anda.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/katalog"
                className="px-5 py-3 rounded-xl text-sm font-semibold bg-[#D6B36A] text-[#26364A] hover:bg-[#c8a357] transition-colors whitespace-nowrap"
              >
                {IS_STATIC_SITE ? 'Buka Katalog Produk' : 'Buka Katalog Produk'}
              </Link>
              <Link
                to={
                  IS_STATIC_SITE
                    ? latestProducts[0]
                      ? `/produk/${latestProducts[0].slug}`
                      : '/katalog'
                    : '/daftar'
                }
                className="px-5 py-3 rounded-xl text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                {IS_STATIC_SITE
                  ? latestProducts[0]
                    ? 'Lihat Produk Terbaru'
                    : 'Buka Katalog'
                  : 'Daftar Akun'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  linkTo,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143] mb-1.5">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">{title}</h2>
      </div>
      <Link
        to={linkTo}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#345477] hover:text-[#B89143] transition-colors whitespace-nowrap"
      >
        <span>{linkLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="h-[410px] rounded-2xl border border-[#345477]/12 p-5 flex flex-col justify-between animate-pulse bg-white"
        >
          <div className="h-3 w-28 bg-[#345477]/10 rounded" />
          <div className="h-52 w-36 mx-auto bg-[#345477]/10 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-[#345477]/10 rounded" />
            <div className="h-3 w-full bg-[#345477]/10 rounded" />
          </div>
          <div className="h-9 w-full bg-[#345477]/10 rounded" />
        </div>
      ))}
    </div>
  );
}
