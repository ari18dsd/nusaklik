import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCover3D } from '../components/ProductCover3D';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { formatRupiah, getEffectivePrice } from '../utils/format';

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useStore();

  return (
    <div className="bg-white min-h-[70vh]">
      <SeoHead
        title="Keranjang Belanja"
        description="Tinjau produk digital pilihan Anda sebelum melanjutkan ke proses checkout di NusaKlik."
      />

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#26364A]">Keranjang Belanja</h1>
            <p className="text-sm text-[#7890AA] mt-1">
              Periksa kembali produk, jumlah item, dan subtotal sebelum melanjutkan ke pembayaran.
            </p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-[#7890AA] hover:text-[#991B1B] transition-colors cursor-pointer"
            >
              Kosongkan Keranjang
            </button>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {cart.length === 0 ? (
          <div className="py-16 text-center border border-[#345477]/14 rounded-2xl bg-[#EAF0F7]/40 space-y-4">
            <ShoppingBag className="w-10 h-10 text-[#345477] mx-auto" />
            <h2 className="font-display text-xl font-semibold text-[#26364A]">
              Keranjang Belanja Anda Masih Kosong
            </h2>
            <p className="text-sm text-[#7890AA] max-w-md mx-auto">
              Jelajahi koleksi e-book, template website, dan materi digital berkualitas di katalog
              kami.
            </p>
            <Link
              to="/katalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462]"
            >
              <span>Jelajahi Katalog</span>
              <ArrowRight className="w-4 h-4 text-[#D6B36A]" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 divide-y divide-[#345477]/12 border border-[#345477]/15 rounded-2xl bg-white px-5 sm:px-6 shadow-[0_10px_28px_-16px_rgba(38,54,74,0.16)]">
              {cart.map(({ product, quantity }) => {
                const unitPrice = getEffectivePrice(
                  product.price,
                  product.discount_price,
                  product.is_free
                );
                const itemSubtotal = unitPrice * quantity;
                const isBook = product.cover_aspect_type === 'book' || product.is_book_format === 1;
                return (
                  <div
                    key={product.id}
                    className="py-5 flex flex-col sm:flex-row sm:items-center gap-5"
                  >
                    <Link to={`/produk/${product.slug}`} className="shrink-0">
                      <ProductCover3D
                        src={product.cover_url}
                        alt={product.title}
                        title={product.title}
                        isBook={isBook}
                        size="sm"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-[#7890AA]">
                        {product.category_name} · {product.file_format}
                      </p>
                      <Link
                        to={`/produk/${product.slug}`}
                        className="font-semibold text-base text-[#26364A] hover:text-[#345477] block"
                      >
                        {product.title}
                      </Link>
                      <p className="font-mono-num text-sm text-[#7890AA]">
                        Harga satuan: <span className="font-semibold text-[#345477]">{formatRupiah(unitPrice)}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4">
                      {product.allow_quantity ? (
                        <div className="inline-flex items-center border border-[#345477]/20 rounded-lg bg-[#EAF0F7]/35">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            aria-label={`Kurangi jumlah ${product.title}`}
                            className="p-2.5 text-[#26364A] hover:text-[#345477] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono-num text-sm font-semibold px-3 min-w-[2.2rem] text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            aria-label={`Tambah jumlah ${product.title}`}
                            className="p-2.5 text-[#26364A] hover:text-[#345477] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="px-3 py-2 rounded-lg border border-[#345477]/15 bg-[#EAF0F7]/35 text-xs text-[#7890AA]">
                          1 item
                        </span>
                      )}

                      <div className="text-right min-w-[96px]">
                        <p className="text-[11px] text-[#7890AA]">Subtotal</p>
                        <p className="font-mono-num text-sm font-bold text-[#26364A]">
                          {formatRupiah(itemSubtotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Hapus ${product.title}`}
                        className="p-2.5 rounded-lg text-[#7890AA] hover:text-[#991B1B] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Card */}
            <aside className="lg:col-span-4 border border-[#D6B36A]/50 rounded-2xl bg-[#F5F0E6] p-6 space-y-5 shadow-[0_10px_28px_-16px_rgba(38,54,74,0.14)]">
              <h2 className="font-display text-xl font-bold text-[#26364A]">Ringkasan Belanja</h2>

              <div className="space-y-3 text-sm border-y border-[#345477]/15 py-4">
                <div className="flex justify-between text-[#7890AA]">
                  <span>Total Item</span>
                  <span className="font-mono-num text-[#26364A] font-medium">
                    {cart.reduce((s, i) => s + i.quantity, 0)} item
                  </span>
                </div>
                <div className="flex justify-between text-[#7890AA]">
                  <span>Subtotal</span>
                  <span className="font-mono-num text-[#26364A] font-medium">
                    {formatRupiah(cartTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#26364A]">Total Pembayaran</span>
                <span className="font-mono-num text-2xl font-bold text-[#345477]">
                  {formatRupiah(cartTotal)}
                </span>
              </div>

              <Link
                to="/checkout"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] transition-colors"
              >
                <span>Lanjut ke Pembayaran</span>
                <ArrowRight className="w-4 h-4 text-[#D6B36A]" />
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
