import { Check, Download, FileText, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductCover3D } from '../components/ProductCover3D';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { Product } from '../types';
import { formatRupiah, getEffectivePrice } from '../utils/format';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError('');

    apiRequest<{ product: Product; related: Product[] }>(`/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setRelated(res.related);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Produk tidak ditemukan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-white min-h-[70vh] py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-5 h-96 rounded-2xl border border-[#345477]/12 bg-white" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-5 w-36 bg-[#345477]/10 rounded" />
            <div className="h-10 w-3/4 bg-[#345477]/10 rounded" />
            <div className="h-24 w-full bg-[#345477]/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-white min-h-[65vh] py-20 px-4 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#26364A]">Produk Tidak Ditemukan</h1>
        <p className="text-sm text-[#7890AA]">{error || 'Produk mungkin telah diarsipkan atau dipindahkan.'}</p>
        <Link
          to="/katalog"
          className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white"
        >
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const isBook = product.cover_aspect_type === 'book' || product.is_book_format === 1;
  const hasDiscount = !product.is_free && product.discount_price !== null && product.discount_price < product.price;
  const effectivePrice = getEffectivePrice(product.price, product.discount_price, product.is_free);
  const benefitLines = product.benefits
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleBuyNow = () => {
    navigate('/checkout', {
      state: { directBuyItem: { product, quantity: 1 } },
    });
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.summary,
    category: product.category_name,
    offers: {
      '@type': 'Offer',
      price: String(effectivePrice),
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="bg-white">
      <SeoHead title={product.title} description={product.summary} jsonLd={productJsonLd} />

      <div className="bg-[#EAF0F7] border-b border-[#345477]/12 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-[#7890AA] flex flex-wrap items-center gap-2">
            <Link to="/" className="hover:text-[#345477]">Beranda</Link>
            <span>/</span>
            <Link to="/katalog" className="hover:text-[#345477]">Katalog</Link>
            {product.category_slug && (
              <>
                <span>/</span>
                <Link to={`/kategori/${product.category_slug}`} className="hover:text-[#345477]">
                  {product.category_name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-[#26364A] font-medium truncate max-w-xs">{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-14">
        {/* Contiguous Product Detail Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Cover Presentation */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-[#345477]/15 bg-[#EAF0F7]/45 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[380px]">
              <ProductCover3D
                src={product.cover_url}
                alt={`Sampul ${product.title}`}
                title={product.title}
                isBook={isBook}
                size="lg"
              />
              <p className="mt-6 text-xs text-[#7890AA] text-center">
                {product.file_format} · {product.file_size_label || 'Berkas Digital Siap Unduh'}
              </p>
            </div>
          </div>

          {/* Right: Purchase & Specifications */}
          <div className="lg:col-span-7 space-y-7">
            <div className="space-y-3 border-b border-[#345477]/12 pb-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#7890AA]">
                <span className="text-[#345477] font-semibold">{product.category_name}</span>
                {product.is_featured === 1 && (
                  <>
                    <span>·</span>
                    <span className="text-[#B89143] font-semibold">Unggulan</span>
                  </>
                )}
                {product.is_popular === 1 && (
                  <>
                    <span>·</span>
                    <span>Populer</span>
                  </>
                )}
                {product.is_free === 1 && (
                  <>
                    <span>·</span>
                    <span className="text-[#345477] font-semibold">Gratis</span>
                  </>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#26364A] leading-tight">
                {product.title}
              </h1>

              <p className="text-base text-[#7890AA] leading-relaxed">{product.summary}</p>
            </div>

            {/* Pricing & CTA Block */}
            <div className="p-6 rounded-xl border border-[#345477]/16 bg-white space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs text-[#7890AA] mb-1">Harga Produk Digital</p>
                  {product.is_free ? (
                    <p className="font-mono-num text-3xl font-bold text-[#345477]">Gratis</p>
                  ) : hasDiscount ? (
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono-num text-3xl font-bold text-[#345477]">
                        {formatRupiah(product.discount_price!)}
                      </span>
                      <span className="font-mono-num text-base text-[#7890AA] line-through">
                        {formatRupiah(product.price)}
                      </span>
                    </div>
                  ) : (
                    <p className="font-mono-num text-3xl font-bold text-[#26364A]">
                      {formatRupiah(product.price)}
                    </p>
                  )}
                </div>

                <div className="text-xs text-[#7890AA] sm:text-right">
                  <p>Total Unduhan: <span className="font-mono-num font-semibold text-[#26364A]">{product.download_count}</span></p>
                  <p>Akses: <span className="font-semibold text-[#345477]">Selamanya setelah Lunas</span></p>
                </div>
              </div>

              {/* Action Buttons */}
              {product.is_free && product.allow_public_free_download ? (
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`/api/products/${product.id}/free-download`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors flex-1 sm:flex-initial"
                  >
                    <Download className="w-4 h-4 text-[#D6B36A]" />
                    <span>Unduh Produk Gratis</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg text-sm font-semibold border border-[#345477]/25 text-[#345477] hover:border-[#345477] transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Simpan di Keranjang</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors flex-1 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-[#D6B36A]" />
                    <span>Beli Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold border border-[#345477]/30 text-[#345477] hover:bg-[#345477]/5 transition-colors flex-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Tambah ke Keranjang</span>
                  </button>
                </div>
              )}
            </div>

            {/* Technical Spec Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl border border-[#345477]/12">
                <p className="text-xs text-[#7890AA] mb-1">Format File</p>
                <p className="font-semibold text-[#26364A] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#345477]" />
                  <span>{product.file_format}</span>
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#345477]/12">
                <p className="text-xs text-[#7890AA] mb-1">Ukuran & Isi</p>
                <p className="font-semibold text-[#26364A]">
                  {product.file_size_label || 'Berkas Digital Lengkap'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#345477]/12 sm:col-span-2">
                <p className="text-xs text-[#7890AA] mb-1">Lisensi Penggunaan</p>
                <p className="font-semibold text-[#26364A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#B89143]" />
                  <span>{product.license_type}</span>
                </p>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-3 pt-2">
              <h2 className="font-display text-xl font-bold text-[#26364A]">Deskripsi Lengkap</h2>
              <div className="text-sm sm:text-base text-[#26364A] leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {/* Benefits */}
            {benefitLines.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="font-display text-xl font-bold text-[#26364A]">Manfaat Produk</h2>
                <ul className="space-y-2.5">
                  {benefitLines.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm sm:text-base text-[#26364A]">
                      <Check className="w-4 h-4 text-[#B89143] shrink-0 mt-1" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Purchase Info */}
            <div className="p-5 rounded-xl border border-[#D6B36A]/60 bg-[#F5F0E6] space-y-2">
              <h3 className="font-sans-ui text-sm font-bold text-[#345477]">Informasi Pembelian</h3>
              <p className="text-sm text-[#26364A]/85 leading-relaxed">
                Pembayaran mendukung Transfer Bank dan QRIS. Setelah Anda mengunggah bukti
                pembayaran dan diverifikasi oleh admin NusaKlik, tautan unduhan resmi serta invoice
                berwatermark langsung terbuka pada halaman pesanan dan akun Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="pt-10 border-t border-[#345477]/12 space-y-6">
            <h2 className="font-display text-2xl font-bold text-[#26364A]">Produk Terkait</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
