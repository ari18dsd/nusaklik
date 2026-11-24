import { Eye, ShoppingBag, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { formatRupiah } from '../utils/format';
import { ProductCover3D } from './ProductCover3D';

interface ProductCardProps {
  product: Product;
  disableNavigation?: boolean;
}

export function ProductCard({ product, disableNavigation = false }: ProductCardProps) {
  const { addToCart } = useStore();
  const navigate = useNavigate();
  const isBook = product.cover_aspect_type === 'book' || product.is_book_format === 1;
  const hasDiscount =
    !product.is_free && product.discount_price !== null && product.discount_price < product.price;

  const statusTags: string[] = [];
  if (product.is_free) statusTags.push('Gratis');
  else if (hasDiscount || product.is_promo) statusTags.push('Promo');
  if (product.is_featured) statusTags.push('Unggulan');
  else if (product.is_popular) statusTags.push('Populer');

  const primaryLabel = statusTags[0] || '';

  const handleBuyNow = () => {
    if (disableNavigation) return;
    if (product.is_free && product.allow_public_free_download) {
      navigate(`/produk/${product.slug}`);
      return;
    }
    navigate('/checkout', {
      state: { directBuyItem: { product, quantity: 1 } },
    });
  };

  return (
    <article className="group flex flex-col h-full bg-white border border-[#345477]/15 rounded-2xl p-5 shadow-[0_6px_20px_-10px_rgba(38,54,74,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#345477]/35 hover:shadow-[0_16px_34px_-14px_rgba(52,84,119,0.22)]">
      {/* Unboxed metadata kicker */}
      <div className="flex items-center justify-between gap-2 text-xs text-[#7890AA] mb-3 min-h-[18px]">
        <span className="truncate font-medium">
          {product.category_name || 'Produk Digital'} · {product.file_format}
        </span>
        {primaryLabel && (
          <span
            className={`shrink-0 font-semibold ${
              primaryLabel === 'Promo' || primaryLabel === 'Unggulan'
                ? 'text-[#B89143]'
                : 'text-[#345477]'
            }`}
          >
            {primaryLabel}
          </span>
        )}
      </div>

      {/* Consistent Cover Stage */}
      <Link
        to={disableNavigation ? '#' : `/produk/${product.slug}`}
        onClick={(e) => {
          if (disableNavigation) e.preventDefault();
        }}
        className="flex items-center justify-center h-52 mb-4 rounded-xl bg-[#EAF0F7]/45 overflow-hidden"
        aria-label={`Lihat detail ${product.title}`}
      >
        <ProductCover3D
          src={product.cover_url}
          alt={`Sampul ${product.title}`}
          title={product.title}
          isBook={isBook}
          size="md"
        />
      </Link>

      {/* Product Info */}
      <div className="flex flex-col flex-1">
        <Link
          to={disableNavigation ? '#' : `/produk/${product.slug}`}
          onClick={(e) => {
            if (disableNavigation) e.preventDefault();
          }}
          className="block mb-1.5"
        >
          <h3 className="font-sans-ui text-base font-semibold text-[#26364A] leading-snug line-clamp-2 group-hover:text-[#345477] transition-colors">
            {product.title}
          </h3>
        </Link>

        <p className="text-sm text-[#7890AA] leading-relaxed line-clamp-2 mb-4">
          {product.summary}
        </p>

        {/* Price & 3 Required Actions Baseline */}
        <div className="mt-auto pt-4 border-t border-[#345477]/10 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            {product.is_free ? (
              <span className="font-mono-num text-lg font-bold text-[#345477]">Gratis</span>
            ) : hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="font-mono-num text-lg font-bold text-[#345477]">
                  {formatRupiah(product.discount_price!)}
                </span>
                <span className="font-mono-num text-xs text-[#7890AA] line-through">
                  {formatRupiah(product.price)}
                </span>
              </div>
            ) : (
              <span className="font-mono-num text-lg font-bold text-[#26364A]">
                {formatRupiah(product.price)}
              </span>
            )}

            <Link
              to={disableNavigation ? '#' : `/produk/${product.slug}`}
              onClick={(e) => {
                if (disableNavigation) e.preventDefault();
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#345477] hover:text-[#B89143] transition-colors whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Detail</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-[#D6B36A] text-[#26364A] hover:bg-[#c8a357] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{product.is_free ? 'Unduh' : 'Beli Sekarang'}</span>
            </button>

            <button
              type="button"
              onClick={() => !disableNavigation && addToCart(product)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors whitespace-nowrap cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#D6B36A]" />
              <span>Keranjang</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
