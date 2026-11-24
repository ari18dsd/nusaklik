import { ArrowRight, BookOpen, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';

export function CategoriesPage() {
  const { categories } = useStore();

  return (
    <div className="bg-white min-h-[70vh]">
      <SeoHead
        title="Kategori Produk Digital"
        description="Jelajahi 12 kategori produk digital di NusaKlik mulai dari E-book, Template Website, Novel, Cerita Anak, hingga Materi Pendidikan."
      />

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <nav aria-label="Breadcrumb" className="text-xs text-[#7890AA] flex items-center gap-2">
            <Link to="/" className="hover:text-[#345477]">Beranda</Link>
            <span>/</span>
            <span className="text-[#26364A] font-medium">Kategori Produk</span>
          </nav>

          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143]">
              Koleksi Terstruktur
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#26364A]">
              Semua Kategori Produk Digital
            </h1>
            <p className="text-sm sm:text-base text-[#7890AA] leading-relaxed">
              Pilih kategori sesuai kebutuhan belajar, membaca, mengajar, maupun pengembangan proyek
              digital Anda.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/kategori/${cat.slug}`}
              className="group p-6 rounded-2xl bg-white border border-[#345477]/14 shadow-[0_6px_18px_-10px_rgba(38,54,74,0.1)] hover:border-[#D6B36A] hover:shadow-[0_14px_30px_-14px_rgba(52,84,119,0.22)] transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#EAF0F7] border border-[#345477]/15 flex items-center justify-center text-[#345477]">
                    {cat.is_book_format ? (
                      <BookOpen className="w-5 h-5" />
                    ) : (
                      <Layers className="w-5 h-5" />
                    )}
                  </div>
                  <span className="font-mono-num text-xs text-[#7890AA]">
                    {cat.product_count ?? 0} produk
                  </span>
                </div>
                <h2 className="font-sans-ui text-lg font-bold text-[#26364A] group-hover:text-[#345477]">
                  {cat.name}
                </h2>
                <p className="text-sm text-[#7890AA] leading-relaxed">{cat.description}</p>
              </div>

              <div className="pt-4 border-t border-[#345477]/10 flex items-center justify-between text-sm font-semibold text-[#345477]">
                <span>Jelajahi {cat.name}</span>
                <ArrowRight className="w-4 h-4 text-[#D6B36A] transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
