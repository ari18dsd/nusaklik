import { Eye, FileEdit, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { ProductCover3D } from '../components/ProductCover3D';
import { apiRequest } from '../services/api';
import type { Category, Product } from '../types';
import { formatRupiah } from '../utils/format';

interface AdminProductModalProps {
  adminToken: string;
  categories: Category[];
  initialProduct: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminProductModal({
  adminToken,
  categories,
  initialProduct,
  onClose,
  onSaved,
}: AdminProductModalProps) {
  const [title, setTitle] = useState(initialProduct?.title || '');
  const [categoryId, setCategoryId] = useState(
    initialProduct?.category_id || categories[0]?.id || 1
  );
  const [summary, setSummary] = useState(initialProduct?.summary || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [benefits, setBenefits] = useState(initialProduct?.benefits || '');
  const [price, setPrice] = useState(String(initialProduct?.price ?? 0));
  const [discountPrice, setDiscountPrice] = useState(
    initialProduct?.discount_price !== null && initialProduct?.discount_price !== undefined
      ? String(initialProduct.discount_price)
      : ''
  );
  const [isFree, setIsFree] = useState(Boolean(initialProduct?.is_free));
  const [allowPublicFree, setAllowPublicFree] = useState(
    initialProduct ? Boolean(initialProduct.allow_public_free_download) : true
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(initialProduct?.is_featured));
  const [isPopular, setIsPopular] = useState(Boolean(initialProduct?.is_popular));
  const [isPromo, setIsPromo] = useState(Boolean(initialProduct?.is_promo));
  const [isActive, setIsActive] = useState(
    initialProduct ? Boolean(initialProduct.is_active) : true
  );
  const [allowQuantity, setAllowQuantity] = useState(Boolean(initialProduct?.allow_quantity));
  const [fileFormat, setFileFormat] = useState(initialProduct?.file_format || 'PDF');
  const [fileSizeLabel, setFileSizeLabel] = useState(initialProduct?.file_size_label || '');
  const [licenseType, setLicenseType] = useState(
    initialProduct?.license_type || 'Lisensi Penggunaan Pribadi'
  );
  const [coverUrl, setCoverUrl] = useState(initialProduct?.cover_url || '');
  const [coverAspectType, setCoverAspectType] = useState<'book' | 'digital'>(
    initialProduct?.cover_aspect_type || 'book'
  );
  const [digitalFileKey, setDigitalFileKey] = useState('');
  const [digitalFileName, setDigitalFileName] = useState(
    initialProduct?.digital_file_name || ''
  );

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalTab, setModalTab] = useState<'form' | 'preview'>('form');

  const selectedCat = categories.find((c) => c.id === Number(categoryId));
  const previewProduct: Product = {
    id: initialProduct?.id ?? 0,
    category_id: Number(categoryId),
    category_name: selectedCat?.name || 'Produk Digital',
    category_slug: selectedCat?.slug || 'produk-digital',
    is_book_format: coverAspectType === 'book' ? 1 : 0,
    title: title.trim() || 'Judul Produk Digital Anda',
    slug: initialProduct?.slug || 'preview-produk',
    summary: summary.trim() || 'Ringkasan singkat produk digital akan tampil di sini.',
    description: description.trim() || 'Deskripsi lengkap produk digital akan tampil pada halaman detail.',
    benefits: benefits || '',
    price: isFree ? 0 : Number(price) || 0,
    discount_price:
      !isFree && discountPrice.trim() !== '' && Number(discountPrice) > 0
        ? Number(discountPrice)
        : null,
    is_free: isFree ? 1 : 0,
    allow_public_free_download: allowPublicFree ? 1 : 0,
    is_featured: isFeatured ? 1 : 0,
    is_popular: isPopular ? 1 : 0,
    is_promo: isPromo ? 1 : 0,
    is_active: isActive ? 1 : 0,
    allow_quantity: allowQuantity ? 1 : 0,
    file_format: fileFormat || 'PDF',
    file_size_label: fileSizeLabel || 'Siap Unduh',
    license_type: licenseType || 'Lisensi Penggunaan Pribadi',
    cover_url: coverUrl,
    cover_aspect_type: coverAspectType,
    digital_file_name: digitalFileName,
    download_count: initialProduct?.download_count ?? 0,
    created_at: initialProduct?.created_at || new Date().toISOString(),
    updated_at: initialProduct?.updated_at || new Date().toISOString(),
  };

  const handleUploadCover = async (file: File) => {
    setError('');
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar cover maksimal 5 MB.');
      return;
    }
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiRequest<{ url: string }>('/admin/upload/cover', {
        method: 'POST',
        token: adminToken,
        body: fd,
        isFormData: true,
      });
      setCoverUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah cover.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadDigitalFile = async (file: File) => {
    setError('');
    if (file.size > 50 * 1024 * 1024) {
      setError('Ukuran berkas digital maksimal 50 MB.');
      return;
    }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiRequest<{ fileKey: string; fileName: string }>(
        '/admin/upload/digital-file',
        {
          method: 'POST',
          token: adminToken,
          body: fd,
          isFormData: true,
        }
      );
      setDigitalFileKey(res.fileKey);
      setDigitalFileName(res.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah berkas digital.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title,
        category_id: Number(categoryId),
        summary,
        description,
        benefits,
        price: isFree ? 0 : Number(price) || 0,
        discount_price: !isFree && discountPrice.trim() !== '' ? Number(discountPrice) : null,
        is_free: isFree,
        allow_public_free_download: allowPublicFree,
        is_featured: isFeatured,
        is_popular: isPopular,
        is_promo: isPromo,
        is_active: isActive,
        allow_quantity: allowQuantity,
        file_format: fileFormat,
        file_size_label: fileSizeLabel,
        license_type: licenseType,
        cover_url: coverUrl,
        cover_aspect_type: coverAspectType,
        digital_file_key: digitalFileKey,
        digital_file_name: digitalFileName,
      };

      if (initialProduct) {
        await apiRequest(`/admin/products/${initialProduct.id}`, {
          method: 'PUT',
          token: adminToken,
          body: payload,
        });
      } else {
        await apiRequest('/admin/products', {
          method: 'POST',
          token: adminToken,
          body: payload,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#26364A]/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#345477]/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#345477]/12 pb-4">
          <h2 className="font-display text-2xl font-bold text-[#26364A]">
            {initialProduct ? 'Edit Produk Digital' : 'Tambah Produk Digital Baru'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#345477]/20 p-0.5 bg-[#EAF0F7]/50 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('form')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                  modalTab === 'form' ? 'bg-[#345477] text-white' : 'text-[#26364A]'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Form Produk</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                  modalTab === 'preview' ? 'bg-[#345477] text-white' : 'text-[#26364A]'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-[#D6B36A]" />
                <span>Preview Sebelum Tayang</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup modal"
              className="p-2 rounded-lg text-[#7890AA] hover:text-[#26364A] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg border border-[#991B1B]/30 bg-[#991B1B]/5 text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        {modalTab === 'preview' ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#EAF0F7]/70 border border-[#345477]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#345477]">
                Pratinjau Tampilan Produk di Katalog & Halaman Detail
              </span>
              <span
                className={`px-2.5 py-1 rounded-md font-semibold ${
                  isActive
                    ? 'bg-white text-[#345477] border border-[#345477]/20'
                    : 'bg-[#F5F0E6] text-[#8F6E2B] border border-[#D6B36A]/50'
                }`}
              >
                Status: {isActive ? 'Aktif (Ditampilkan di Toko)' : 'Nonaktif (Disembunyikan)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5">
                <p className="text-xs font-semibold text-[#7890AA] mb-2">
                  Tampilan Kartu Katalog
                </p>
                <ProductCard product={previewProduct} disableNavigation />
              </div>

              <div className="md:col-span-7 p-5 rounded-2xl border border-[#345477]/15 bg-[#F5F0E6]/50 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B89143]">
                  Ringkasan Halaman Detail
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-[#7890AA]">
                    {previewProduct.category_name} · {previewProduct.file_format} ·{' '}
                    {previewProduct.file_size_label}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#26364A]">
                    {previewProduct.title}
                  </h3>
                  <p className="font-mono-num text-lg font-bold text-[#345477]">
                    {previewProduct.is_free
                      ? 'Gratis'
                      : previewProduct.discount_price
                        ? `${formatRupiah(previewProduct.discount_price)} (Normal: ${formatRupiah(previewProduct.price)})`
                        : formatRupiah(previewProduct.price)}
                  </p>
                </div>

                <div className="text-xs text-[#26364A] space-y-2 border-t border-[#345477]/12 pt-3">
                  <p className="font-semibold text-[#345477]">Deskripsi Lengkap:</p>
                  <p className="whitespace-pre-line leading-relaxed text-[#26364A]/90">
                    {previewProduct.description}
                  </p>
                </div>

                <div className="text-xs text-[#7890AA] border-t border-[#345477]/12 pt-3 flex flex-wrap justify-between gap-2">
                  <span>Lisensi: {previewProduct.license_type}</span>
                  <span>
                    Berkas Digital: {digitalFileName || 'Belum ada berkas diunggah'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#345477]/12">
              <button
                type="button"
                onClick={() => setModalTab('form')}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#345477]/25 text-[#345477] cursor-pointer"
              >
                Kembali Edit Form
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Cover Preview & Upload */}
            <div className="md:col-span-5 space-y-3 border border-[#345477]/12 rounded-xl p-4">
              <p className="text-xs font-semibold text-[#26364A]">
                Preview Cover (Rasio Asli & Efek 3D)
              </p>
              <div className="min-h-[220px] flex items-center justify-center border border-[#345477]/10 rounded-lg p-3 bg-white">
                <ProductCover3D
                  src={coverUrl}
                  alt={title || 'Preview Cover'}
                  title={title || 'Judul Produk'}
                  isBook={coverAspectType === 'book'}
                  size="md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26364A] mb-1">
                  Tipe Tampilan Cover
                </label>
                <select
                  value={coverAspectType}
                  onChange={(e) => setCoverAspectType(e.target.value as 'book' | 'digital')}
                  className="w-full px-3 py-2 rounded-lg border border-[#345477]/20 text-xs"
                >
                  <option value="book">Buku 3D (Rasio 2:3)</option>
                  <option value="digital">Showcase Digital (Proporsional)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#345477]/25 text-[#345477] hover:bg-[#345477]/5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingCover ? 'Mengunggah...' : 'Unggah Cover'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadCover(f);
                    }}
                  />
                </label>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    aria-label="Hapus cover"
                    className="p-2 rounded-lg border border-[#991B1B]/25 text-[#991B1B] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Product Fields */}
            <div className="md:col-span-7 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#26364A] mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Kategori *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Format File
                  </label>
                  <input
                    type="text"
                    value={fileFormat}
                    onChange={(e) => setFileFormat(e.target.value)}
                    placeholder="PDF / EPUB / ZIP"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Harga Normal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={isFree}
                    value={isFree ? '0' : price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm font-mono-num disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Harga Diskon (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={isFree}
                    value={isFree ? '' : discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="Kosongkan jika tidak diskon"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm font-mono-num disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Ukuran / Isi Produk
                  </label>
                  <input
                    type="text"
                    value={fileSizeLabel}
                    onChange={(e) => setFileSizeLabel(e.target.value)}
                    placeholder="120 Halaman · 3.5 MB"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Lisensi Penggunaan
                  </label>
                  <input
                    type="text"
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
              </div>

              {/* Upload Private Digital File */}
              <div className="p-3.5 rounded-lg border border-[#345477]/15 space-y-2">
                <p className="text-xs font-semibold text-[#26364A]">
                  Berkas Produk Digital (Penyimpanan Privat)
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[#7890AA] truncate max-w-[240px]">
                    {digitalFileName || 'Belum ada berkas diunggah'}
                  </span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#345477] text-white cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#D6B36A]" />
                    <span>{uploadingFile ? 'Mengunggah...' : 'Unggah Berkas'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadDigitalFile(f);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1">
              Ringkasan Singkat
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">
                Deskripsi Lengkap
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#26364A] mb-1">
                Manfaat Produk (1 baris per poin)
              </label>
              <textarea
                rows={4}
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#345477]/20 text-sm"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#345477]/12 text-xs">
            {[
              { label: 'Produk Gratis', checked: isFree, set: setIsFree },
              { label: 'Unduh Publik Gratis', checked: allowPublicFree, set: setAllowPublicFree },
              { label: 'Produk Unggulan', checked: isFeatured, set: setIsFeatured },
              { label: 'Produk Populer', checked: isPopular, set: setIsPopular },
              { label: 'Label Promo', checked: isPromo, set: setIsPromo },
              { label: 'Produk Aktif', checked: isActive, set: setIsActive },
              { label: 'Dukung Kuantitas', checked: allowQuantity, set: setAllowQuantity },
            ].map((opt) => (
              <label key={opt.label} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opt.checked}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="rounded border-[#345477]/30 accent-[#345477]"
                />
                <span className="text-[#26364A] font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#345477]/12">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#345477]/20 text-[#26364A] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
