import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { Product } from '../types';

interface CatalogPageProps {
  presetFilter?: 'gratis' | 'promo' | 'unggulan';
  pageTitle?: string;
  pageDescription?: string;
}

export function CatalogPage({ presetFilter, pageTitle, pageDescription }: CatalogPageProps) {
  const { slug: categorySlugParam } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, showToast } = useStore();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    categorySlugParam || searchParams.get('category') || ''
  );
  const [selectedFilter, setSelectedFilter] = useState(
    presetFilter || searchParams.get('filter') || ''
  );
  const [sort, setSort] = useState(searchParams.get('sort') || 'terbaru');
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categorySlugParam !== undefined) {
      setSelectedCategory(categorySlugParam);
    }
  }, [categorySlugParam]);

  useEffect(() => {
    if (presetFilter !== undefined) {
      setSelectedFilter(presetFilter);
    }
  }, [presetFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedFilter) params.set('filter', selectedFilter);
    if (sort) params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '12');

    apiRequest<{
      products: Product[];
      total: number;
      totalPages: number;
    }>(`/products?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setProducts((prev) => (page === 1 ? res.products : [...prev, ...res.products]));
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
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
  }, [query, selectedCategory, selectedFilter, sort, page, showToast]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const computedTitle =
    pageTitle ||
    (activeCategoryObj ? `Kategori ${activeCategoryObj.name}` : 'Katalog Produk Digital');
  const computedDesc =
    pageDescription ||
    (activeCategoryObj
      ? activeCategoryObj.description
      : 'Temukan seluruh e-book, template website, novel, materi belajar, dan aset digital NusaKlik.');

  const resetAll = () => {
    setQuery('');
    if (!categorySlugParam) setSelectedCategory('');
    if (!presetFilter) setSelectedFilter('');
    setSort('terbaru');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="bg-white min-h-[70vh]">
      <SeoHead title={computedTitle} description={computedDesc} />

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-[#7890AA] flex items-center gap-2">
            <Link to="/" className="hover:text-[#345477]">Beranda</Link>
            <span>/</span>
            <Link to="/katalog" className="hover:text-[#345477]">Katalog</Link>
            {activeCategoryObj && (
              <>
                <span>/</span>
                <span className="text-[#26364A] font-medium">{activeCategoryObj.name}</span>
              </>
            )}
          </nav>

          {/* Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#26364A]">
                {computedTitle}
              </h1>
              <p className="text-sm sm:text-base text-[#7890AA]">{computedDesc}</p>
            </div>
            <p className="font-mono-num text-sm text-[#345477] font-semibold shrink-0">
              Menampilkan {products.length} dari {total} produk
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Search, Category Filter & Sort Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#7890AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari judul e-book, template, atau topik..."
              aria-label="Cari produk digital"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#345477]/20 bg-white text-sm text-[#26364A] placeholder:text-[#7890AA] focus:outline-none focus:border-[#345477]"
            />
          </div>

          {!categorySlugParam && (
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter berdasarkan kategori"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 bg-white text-sm text-[#26364A] focus:outline-none focus:border-[#345477]"
              >
                <option value="">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!presetFilter && (
            <div className="md:col-span-2">
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter label produk"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 bg-white text-sm text-[#26364A] focus:outline-none focus:border-[#345477]"
              >
                <option value="">Semua Label</option>
                <option value="unggulan">Unggulan</option>
                <option value="populer">Populer</option>
                <option value="promo">Promo</option>
                <option value="gratis">Gratis</option>
              </select>
            </div>
          )}

          <div className={categorySlugParam || presetFilter ? 'md:col-span-4' : 'md:col-span-2'}>
            <div className="relative flex items-center">
              <SlidersHorizontal className="w-4 h-4 text-[#7890AA] absolute left-3 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                aria-label="Urutkan produk"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#345477]/20 bg-white text-sm text-[#26364A] focus:outline-none focus:border-[#345477]"
              >
                <option value="terbaru">Terbaru</option>
                <option value="populer">Terpopuler</option>
                <option value="harga_terendah">Harga Terendah</option>
                <option value="harga_tertinggi">Harga Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {(query || (selectedCategory && !categorySlugParam) || (selectedFilter && !presetFilter)) && (
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-[#345477] font-semibold hover:text-[#B89143] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Atur Ulang Filter</span>
            </button>
          </div>
        )}

        {/* Product Grid */}
        {loading && page === 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-96 rounded-xl border border-[#345477]/12 animate-pulse bg-white" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center border border-[#345477]/14 rounded-2xl bg-white space-y-4">
            <p className="font-display text-xl font-semibold text-[#26364A]">
              Belum ada produk yang cocok
            </p>
            <p className="text-sm text-[#7890AA] max-w-md mx-auto">
              Coba ubah kata kunci pencarian atau pilih kategori lain untuk menjelajahi koleksi kami.
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] cursor-pointer"
            >
              Tampilkan Semua Produk
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {page < totalPages && (
              <div className="pt-6 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-3 rounded-lg text-sm font-semibold border border-[#345477]/30 text-[#345477] hover:bg-[#345477] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Memuat produk...' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
