import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT_DIR = process.cwd();
export const DATA_DIR = path.resolve(ROOT_DIR, process.env.DATA_DIR || 'data');
export const STORAGE_DIR = path.resolve(ROOT_DIR, process.env.STORAGE_DIR || 'storage');
export const PRIVATE_PRODUCTS_DIR = path.join(STORAGE_DIR, 'private_products');
export const PAYMENT_PROOFS_DIR = path.join(STORAGE_DIR, 'payment_proofs');
export const PUBLIC_UPLOADS_DIR = path.join(STORAGE_DIR, 'public_uploads');

for (const dir of [DATA_DIR, PRIVATE_PRODUCTS_DIR, PAYMENT_PROOFS_DIR, PUBLIC_UPLOADS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'nusaklik.db');
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

for (const name of fs.readdirSync(path.join(ROOT_DIR, 'migrations')).filter((file) => file.endsWith('.sql')).sort()) {
  const applied = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(name);
  if (applied) continue;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(fs.readFileSync(path.join(ROOT_DIR, 'migrations', name), 'utf8'));
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Generates a real, valid, readable minimal PDF file for seeded digital products
 * so every product download delivers an authentic digital document.
 */
function createSimplePdfBuffer(title: string, subtitle: string, lines: string[]): Buffer {
  const escapePdf = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const textOps: string[] = [
    'BT',
    '/F1 20 Tf',
    '54 740 Td',
    `(${escapePdf(title)}) Tj`,
    '/F1 12 Tf',
    '0 -26 Td',
    `(${escapePdf(subtitle)}) Tj`,
    '0 -18 Td',
    '(----------------------------------------------------------------------) Tj',
  ];

  for (const line of lines) {
    textOps.push('0 -20 Td');
    textOps.push(`(${escapePdf(line)}) Tj`);
  }
  textOps.push('ET');
  const streamContent = textOps.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

export async function initializeSeedData() {
  // Seed categories if empty
  const catCountRow = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCountRow.count === 0) {
    const categories = [
      ['E-book', 'e-book', 'Buku digital praktis untuk pengembangan karier, bisnis, dan teknologi.', 1, 1],
      ['Template Website', 'template-website', 'Template antarmuka web modern siap pakai untuk bisnis dan portofolio.', 0, 2],
      ['Cerita Anak', 'cerita-anak', 'Buku cerita bergambar penuh nilai moral untuk anak usia dini dan SD.', 1, 3],
      ['Cerita Rakyat', 'cerita-rakyat', 'Kisah warisan budaya Nusantara yang dikemas rapi dan mudah dibaca.', 1, 4],
      ['Novel', 'novel', 'Karya fiksi panjang pilihan dengan alur mendalam dan tata letak nyaman.', 1, 5],
      ['Cerpen', 'cerpen', 'Kumpulan cerita pendek inspiratif untuk bacaan santai berkualitas.', 1, 6],
      ['Aset Desain Grafis', 'aset-desain-grafis', 'Ikon vektor, panduan merek, dan elemen grafis siap sunting.', 0, 7],
      ['Materi Pendidikan', 'materi-pendidikan', 'Modul ajar, panduan riset, dan bahan presentasi untuk pengajar maupun pelajar.', 1, 8],
      ['Lembar Kerja', 'lembar-kerja', 'Lembar latihan terstruktur dan perencana produktivitas siap cetak maupun isi digital.', 1, 9],
      ['Audio Digital', 'audio-digital', 'Rekaman audio narasi, meditasi fokus, dan efek suara bersih bebas royalti.', 0, 10],
      ['Video Digital', 'video-digital', 'Kelas rekaman singkat dan aset gerak untuk kreator konten.', 0, 11],
      ['Produk Digital Lainnya', 'produk-digital-lainnya', 'Perangkat bantu produktivitas, preset, dan paket dokumen praktis lainnya.', 0, 12],
    ] as const;

    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, description, is_book_format, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of categories) {
      insertCat.run(c[0], c[1], c[2], c[3], c[4]);
    }
  }

  // Seed initial catalog products if empty (real downloadable files in private_products)
  const prodCountRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (prodCountRow.count === 0 && process.env.SEED_DEMO_DATA === 'true' && process.env.NODE_ENV !== 'production') {
    const getCatId = (slug: string) => {
      const row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: number };
      return row.id;
    };

    const seedProducts = [
      {
        categorySlug: 'e-book',
        title: 'Strategi Digital UMKM: Dari Nol ke Pasar Nasional',
        slug: 'strategi-digital-umkm-pasar-nasional',
        summary: 'Panduan langkah demi langkah membangun katalog digital, pemasaran organik, dan sistem pembayaran rapi untuk usaha kecil dan menengah.',
        description:
          'Buku digital ini disusun secara sistematis bagi pelaku UMKM, kreator lokal, dan pemilik usaha rintisan yang ingin menata kehadiran digitalnya secara mandiri.\n\nSetiap bab membahas studi kasus nyata di Indonesia, mulai dari penentuan posisi produk, penyusunan penawaran bernilai tinggi, hingga pencatatan transaksi tanpa ketergantungan pada satu platform saja.',
        benefits:
          'Menyusun rencana pemasaran 90 hari yang terukur\nMengoptimalkan konversi halaman produk digital\nMemahami alur pembayaran langsung dan pelayanan pelanggan\nDilengkapi daftar periksa peluncuran produk',
        price: 125000,
        discount_price: 89000,
        is_free: 0,
        is_featured: 1,
        is_popular: 1,
        is_promo: 1,
        file_format: 'PDF',
        file_size_label: '148 Halaman · 4.2 MB',
        license_type: 'Lisensi Penggunaan Pribadi & Usaha Sendiri',
        cover_url: '/assets/covers/cover-ebook-bisnis.jpg',
        cover_aspect_type: 'book',
        fileName: 'strategi-digital-umkm-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Strategi Digital UMKM: Dari Nol ke Pasar Nasional',
          'NusaKlik Digital Publishing - Edisi Lengkap',
          [
            'Terima kasih telah membeli produk resmi di NusaKlik.',
            'Bab 1: Menentukan Fondasi Produk Digital yang Dibutuhkan Pasar',
            'Bab 2: Membangun Identitas Visual yang Konsisten dan Terpercaya',
            'Bab 3: Alur Checkout Sederhana dan Layanan Purna Jual',
            'Bab 4: Rencana Eksekusi 90 Hari untuk Pertumbuhan Berkelanjutan',
            'Hak Cipta dilindungi. Hanya untuk pemakaian pembeli terdaftar.',
          ]
        ),
      },
      {
        categorySlug: 'novel',
        title: 'Senja di Pelabuhan Lama',
        slug: 'senja-di-pelabuhan-lama',
        summary: 'Novel fiksi sastra berlatar kota pesisir Nusantara tentang pertemuan kembali dua perawat arsip maritim setelah lima belas tahun berpisah.',
        description:
          'Mengambil latar pelabuhan tua di pesisir timur Nusantara pada awal tahun 2000-an, novel ini memadukan ketelitian riset sejarah maritim dengan kisah personal tentang ingatan, surat-surat yang tak sempat terkirim, dan keberanian memaafkan masa lalu.',
        benefits:
          'Tata letak nyaman dibaca di tablet, ponsel, maupun e-reader\nDilengkapi glosarium istilah bahari Nusantara\nBebas DRM untuk perangkat pribadi pembeli',
        price: 79000,
        discount_price: null,
        is_free: 0,
        is_featured: 1,
        is_popular: 1,
        is_promo: 0,
        file_format: 'EPUB & PDF',
        file_size_label: '264 Halaman · 3.1 MB',
        license_type: 'Lisensi Baca Pribadi',
        cover_url: '/assets/covers/cover-novel-nusantara.jpg',
        cover_aspect_type: 'book',
        fileName: 'senja-di-pelabuhan-lama-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Senja di Pelabuhan Lama',
          'Novel Sastra Nusantara - Edisi Digital NusaKlik',
          [
            'Prolog: Angin Timur di Dermaga Kayu',
            'Pukul lima sore, lampu mercusuar di ujung tanjung selalu menyala lebih dulu',
            'sebelum kapal-kapal kayu merapat membawa garam dan kayu cendana.',
            'Edisi digital resmi diterbitkan melalui NusaKlik.',
          ]
        ),
      },
      {
        categorySlug: 'cerita-anak',
        title: 'Pelayaran Bulan Sabit: Petualangan Perahu Kertas',
        slug: 'pelayaran-bulan-sabit-perahu-kertas',
        summary: 'Cerita pengantar tidur penuh kehangatan tentang keberanian, rasa ingin tahu, dan persahabatan di bawah langit berbintang.',
        description:
          'Dirancang khusus untuk dibacakan orang tua bersama anak usia 4–9 tahun. Menggunakan kalimat berirama yang menenangkan, kosakata bahasa Indonesia yang santun, serta pesan kebaikan yang mudah dicerna.',
        benefits:
          'Mendukung kebiasaan membaca bersama keluarga sebelum tidur\nIlustrasi sampul menenangkan dan ramah anak\nSiap dicetak di kertas A4 maupun dibaca di tablet',
        price: 45000,
        discount_price: 29000,
        is_free: 0,
        is_featured: 1,
        is_popular: 0,
        is_promo: 1,
        file_format: 'PDF',
        file_size_label: '36 Halaman Berilustrasi · 6.8 MB',
        license_type: 'Lisensi Keluarga & Penggunaan Pribadi',
        cover_url: '/assets/covers/cover-cerita-anak.jpg',
        cover_aspect_type: 'book',
        fileName: 'pelayaran-bulan-sabit-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Pelayaran Bulan Sabit: Petualangan Perahu Kertas',
          'Seri Cerita Anak NusaKlik',
          [
            'Suatu malam yang tenang, perahu kertas emas berlayar mengikuti cahaya bulan.',
            'Ia menyapa ikan-ikan kecil dan bintang yang jatuh perlahan ke permukaan laut.',
            'Di akhir perjalanan, ia belajar bahwa rumah selalu menunggu dengan hangat.',
          ]
        ),
      },
      {
        categorySlug: 'template-website',
        title: 'Kit Antarmuka Web Arsitekta — Landing Page & Portofolio',
        slug: 'kit-antarmuka-web-arsitekta',
        summary: 'Sistem desain dan template halaman web responsif berdesain bersih untuk studio kreatif, konsultan, dan merek independen.',
        description:
          'Paket template HTML5, CSS modern, dan komponen UI terstruktur dengan palet putih bersih, biru slate, serta aksen emas lembut. Mudah disesuaikan tanpa ketergantungan framework yang rumit.',
        benefits:
          'Struktur kode bersih, semantik, dan ramah SEO\nDesain responsif untuk desktop, tablet, dan ponsel\nTermasuk panduan tipografi dan variabel warna',
        price: 175000,
        discount_price: 129000,
        is_free: 0,
        is_featured: 1,
        is_popular: 1,
        is_promo: 1,
        file_format: 'HTML/CSS/ZIP',
        file_size_label: '12 Bagian Halaman · 2.4 MB',
        license_type: 'Lisensi Proyek Komersial (1 Klien / Usaha)',
        cover_url: '/assets/covers/cover-template-web.jpg',
        cover_aspect_type: 'digital',
        fileName: 'kit-web-arsitekta-nusaklik.html',
        fileContent: Buffer.from(
          `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Arsitekta Template — NusaKlik</title><style>body{font-family:system-ui,sans-serif;color:#26364A;max-width:880px;margin:48px auto;padding:0 24px;line-height:1.6}h1{color:#345477}hr{border:none;border-top:1px solid #D6B36A;margin:24px 0}</style></head><body><h1>Kit Antarmuka Web Arsitekta</h1><p>Terima kasih telah mengunduh paket resmi dari NusaKlik. Gunakan file ini sebagai fondasi halaman profil atau portofolio usaha Anda.</p><hr><h2>Palet Warna Utama</h2><ul><li>Slate Blue: #345477</li><li>Soft Gold: #D6B36A</li><li>White: #FFFFFF</li></ul></body></html>`,
          'utf8'
        ),
      },
      {
        categorySlug: 'materi-pendidikan',
        title: 'Panduan Metode Riset & Penulisan Karya Ilmiah Modern',
        slug: 'panduan-metode-riset-karya-ilmiah',
        summary: 'Buku pegangan ringkas dan terstruktur untuk mahasiswa, dosen, dan peneliti pemula dalam merancang kerangka karya tulis.',
        description:
          'Menyajikan kerangka perumusan masalah, teknik telaah pustaka sistematis, etika kutipan, hingga penyusunan abstrak yang padat dan tepat sasaran.',
        benefits:
          'Contoh kerangka proposal siap pakai\nPanduan sitasi konsisten dan anti-plagiarisme\nCocok untuk skripsi, tesis, dan artikel jurnal',
        price: 65000,
        discount_price: null,
        is_free: 0,
        is_featured: 0,
        is_popular: 1,
        is_promo: 0,
        file_format: 'PDF & DOCX',
        file_size_label: '112 Halaman · 2.9 MB',
        license_type: 'Lisensi Penggunaan Akademik Pribadi',
        cover_url: '/assets/covers/cover-materi-edukasi.jpg',
        cover_aspect_type: 'book',
        fileName: 'panduan-riset-karya-ilmiah-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Panduan Metode Riset & Penulisan Karya Ilmiah Modern',
          'Materi Pendidikan NusaKlik',
          [
            'Bagian 1: Merumuskan Pertanyaan Penelitian yang Spesifik',
            'Bagian 2: Menyusun Tinjauan Pustaka secara Sistematis',
            'Bagian 3: Teknik Pengolahan Data dan Validasi Temuan',
            'Bagian 4: Menyunting Naskah Akhir Sebelum Publikasi',
          ]
        ),
      },
      {
        categorySlug: 'aset-desain-grafis',
        title: 'Paket Identitas Visual & 60 Ikon Arsitektur Minimalis',
        slug: 'paket-identitas-visual-60-ikon-minimalis',
        summary: 'Kumpulan ikon garis vektor SVG presisi tinggi dan lembar panduan gaya merek untuk desainer grafis maupun tim produk.',
        description:
          'Setiap ikon digambar pada grid 24x24 piksel dengan ketebalan garis konsisten 1.5px sehingga tampak tajam pada ukuran kecil maupun besar.',
        benefits:
          'Format SVG vektor murni mudah diubah warnanya\nDilengkapi template kartu nama dan palet warna\nBebas digunakan untuk kebutuhan presentasi dan antarmuka',
        price: 95000,
        discount_price: 69000,
        is_free: 0,
        is_featured: 0,
        is_popular: 1,
        is_promo: 1,
        file_format: 'SVG & PDF',
        file_size_label: '60 Ikon Vektor · 1.8 MB',
        license_type: 'Lisensi Komersial Standar',
        cover_url: '/assets/covers/cover-aset-grafis.jpg',
        cover_aspect_type: 'digital',
        fileName: 'paket-ikon-minimalis-nusaklik.svg',
        fileContent: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80" fill="none"><rect width="240" height="80" fill="#FFFFFF"/><rect x="16" y="16" width="48" height="48" rx="8" stroke="#345477" stroke-width="2"/><path d="M28 40L36 48L52 32" stroke="#D6B36A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="80" y="45" font-family="sans-serif" font-size="14" fill="#26364A">NusaKlik Vector Kit</text></svg>`,
          'utf8'
        ),
      },
      {
        categorySlug: 'lembar-kerja',
        title: 'Perencana Keuangan & Produktivitas Bulanan (Gratis)',
        slug: 'perencana-keuangan-produktivitas-gratis',
        summary: 'Lembar kerja praktis siap cetak dan dapat diisi secara digital untuk mencatat arus kas pribadi serta target mingguan.',
        description:
          'Unduh gratis sebagai bagian dari komitmen NusaKlik mendukung literasi perencanaan pribadi. Berisi lembar anggaran bulanan, pelacak kebiasaan, dan tinjauan akhir pekan.',
        benefits:
          'Siap pakai tanpa registrasi rumit\nFormat A4 bersih dan hemat tinta cetak\nMembantu menjaga fokus prioritas harian',
        price: 0,
        discount_price: null,
        is_free: 1,
        is_featured: 0,
        is_popular: 1,
        is_promo: 0,
        file_format: 'PDF',
        file_size_label: '16 Halaman A4 · 1.1 MB',
        license_type: 'Gratis untuk Penggunaan Pribadi',
        cover_url: '/assets/covers/cover-materi-edukasi.jpg',
        cover_aspect_type: 'book',
        fileName: 'perencana-keuangan-nusaklik-gratis.pdf',
        fileContent: createSimplePdfBuffer(
          'Perencana Keuangan & Produktivitas Bulanan',
          'Edisi Gratis Resmi NusaKlik',
          [
            'Lembar 1: Ringkasan Pemasukan & Pos Pengeluaran Pokok',
            'Lembar 2: Target Tabungan & Dana Darurat',
            'Lembar 3: Matriks Prioritas Mingguan',
            'Bagikan tautan resmi NusaKlik kepada rekan yang membutuhkan.',
          ]
        ),
      },
      {
        categorySlug: 'cerita-rakyat',
        title: 'Kumpulan Cerita Rakyat Nusantara Pilihan (Gratis)',
        slug: 'kumpulan-cerita-rakyat-nusantara-gratis',
        summary: 'Lima kisah klasik dari berbagai daerah di Indonesia yang disunting ulang dengan bahasa hangat dan ramah pembaca modern.',
        description:
          'Mengenalkan kembali kekayaan tutur daerah dari Sabang hingga Merauke dalam format digital yang nyaman dibaca oleh pelajar maupun keluarga.',
        benefits:
          'Memperkaya wawasan budaya Nusantara\nDisertai pesan moral di setiap akhir cerita\nGratis untuk pelajar, guru, dan orang tua',
        price: 0,
        discount_price: null,
        is_free: 1,
        is_featured: 1,
        is_popular: 0,
        is_promo: 0,
        file_format: 'PDF',
        file_size_label: '48 Halaman · 1.9 MB',
        license_type: 'Gratis untuk Edukasi & Pribadi',
        cover_url: '/assets/covers/cover-novel-nusantara.jpg',
        cover_aspect_type: 'book',
        fileName: 'cerita-rakyat-nusantara-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Kumpulan Cerita Rakyat Nusantara Pilihan',
          'Pustaka Budaya Gratis NusaKlik',
          [
            '1. Legenda Danau Toba (Sumatera Utara)',
            '2. Timun Mas (Jawa Tengah)',
            '3. Putri Mandalika (Nusa Tenggara Barat)',
            '4. Asal Mula Sungai Mahakam (Kalimantan Timur)',
            '5. Cenderawasih dari Pegunungan Papua',
          ]
        ),
      },
      {
        categorySlug: 'cerpen',
        title: 'Surat-Surat dari Kota Hujan: Antologi 12 Cerpen',
        slug: 'surat-surat-dari-kota-hujan-antologi-cerpen',
        summary: 'Dua belas cerita pendek kontemporer tentang keseharian pekerja kota, kopi pagi, dan keputusan-keputusan kecil yang mengubah hidup.',
        description:
          'Cocok menemani perjalanan atau waktu istirahat. Setiap cerpen dapat diselesaikan dalam 10–15 menit dengan gaya penuturan jernih.',
        benefits:
          '12 cerita lengkap dalam satu berkas rapi\nTipografi nyaman untuk pembacaan malam maupun siang\nTermasuk catatan proses kreatif penulis',
        price: 39000,
        discount_price: null,
        is_free: 0,
        is_featured: 0,
        is_popular: 0,
        is_promo: 0,
        file_format: 'PDF & EPUB',
        file_size_label: '128 Halaman · 1.5 MB',
        license_type: 'Lisensi Baca Pribadi',
        cover_url: '/assets/covers/cover-novel-nusantara.jpg',
        cover_aspect_type: 'book',
        fileName: 'surat-kota-hujan-cerpen-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Surat-Surat dari Kota Hujan: Antologi 12 Cerpen',
          'Koleksi Cerpen NusaKlik',
          [
            'Daftar Isi: 1. Hujan Pertama di Stasiun Selatan',
            '2. Toko Buku yang Tutup Pukul Sembilan',
            '3. Catatan di Balik Struk Belanja',
            'Selamat membaca karya sastra digital Indonesia.',
          ]
        ),
      },
      {
        categorySlug: 'audio-digital',
        title: 'Panduan Audio Fokus & Relaksasi Belajar (Ringkasan Teknis)',
        slug: 'panduan-audio-fokus-relaksasi-belajar',
        summary: 'Paket skrip narasi fokus dan file informasi audio berkualitas jernih untuk membantu konsentrasi kerja dan belajar.',
        description:
          'Dirancang bagi pelajar dan pekerja kreatif yang membutuhkan suasana tenang saat membaca atau menulis.',
        benefits:
          'Bebas gangguan iklan\nDapat diputar secara luring di perangkat mana saja\nDisertai panduan teknik jeda kerja 25 menit',
        price: 55000,
        discount_price: 35000,
        is_free: 0,
        is_featured: 0,
        is_popular: 0,
        is_promo: 1,
        file_format: 'PDF & Skrip Audio',
        file_size_label: 'Paket Panduan · 1.2 MB',
        license_type: 'Lisensi Penggunaan Pribadi',
        cover_url: '/assets/covers/cover-aset-grafis.jpg',
        cover_aspect_type: 'digital',
        fileName: 'panduan-fokus-audio-nusaklik.pdf',
        fileContent: createSimplePdfBuffer(
          'Panduan Audio Fokus & Relaksasi Belajar',
          'Koleksi Audio & Produktivitas NusaKlik',
          [
            'Sesi 1: Persiapan Ruang Kerja Tenang (25 Menit)',
            'Sesi 2: Pernapasan Teratur untuk Konsentrasi Mendalam',
            'Sesi 3: Penutup Hari dan Evaluasi Ringan',
          ]
        ),
      },
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        category_id, title, slug, summary, description, benefits,
        price, discount_price, is_free, allow_public_free_download,
        is_featured, is_popular, is_promo, is_active, allow_quantity,
        file_format, file_size_label, license_type, cover_url, cover_aspect_type,
        digital_file_key, digital_file_name, download_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    for (const p of seedProducts) {
      const catId = getCatId(p.categorySlug);
      const filePath = path.join(PRIVATE_PRODUCTS_DIR, p.fileName);
      fs.writeFileSync(filePath, p.fileContent);
      insertProd.run(
        catId,
        p.title,
        p.slug,
        p.summary,
        p.description,
        p.benefits,
        p.price,
        p.discount_price,
        p.is_free,
        p.is_featured,
        p.is_popular,
        p.is_promo,
        p.file_format,
        p.file_size_label,
        p.license_type,
        p.cover_url,
        p.cover_aspect_type,
        p.fileName,
        p.fileName
      );
    }
  }

  // Seed default store settings if missing
  const defaultSettings: Record<string, string> = {
    store_name: 'NusaKlik',
    tagline_main: 'Temukan Produk Digital, Buka Peluang Baru.',
    tagline_sub: 'Baca • Belajar • Berkarya • Berkreasi.',
    store_description:
      'NusaKlik adalah toko produk digital independen Indonesia yang menghadirkan e-book, template website, materi pendidikan, karya sastra, dan aset kreatif terkurasi dengan pengiriman instan setelah verifikasi pembayaran.',
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
    footer_text: 'Toko Produk Digital Independen Indonesia. Semua produk dilengkapi lisensi resmi dan akses unduhan aman.',
    policy_privacy:
      'NusaKlik menjaga kerahasiaan data pribadi pembeli meliputi nama, alamat email, nomor WhatsApp, serta catatan transaksi. Data hanya digunakan untuk verifikasi pembayaran, penerbitan invoice, dan pengiriman akses unduhan produk digital resmi.',
    policy_terms:
      'Setiap produk digital yang dibeli di NusaKlik dilindungi oleh hak cipta dan lisensi penggunaan yang tertera pada halaman detail produk. Pembeli dilarang mendistribusikan ulang, menjual kembali berkas asli tanpa izin tertulis, atau membagikan tautan unduhan pribadi kepada pihak ketiga.',
    policy_refund:
      'Mengingat sifat produk digital yang dapat langsung diakses dan diunduh setelah verifikasi pembayaran, pembelian yang sudah berstatus Lunas pada dasarnya bersifat final. Pengajuan pengembalian dana tetap dilayani apabila terjadi kendala teknis berkas rusak yang tidak dapat diperbaiki oleh tim NusaKlik dalam 3x24 jam atau terjadi transfer ganda yang terverifikasi.',
    purchase_guide:
      '1. Pilih produk digital yang Anda butuhkan dari halaman Katalog atau Kategori.\n2. Tambahkan ke keranjang atau klik Beli Sekarang.\n3. Isi data pembeli (nama, email aktif, dan nomor WhatsApp) lalu pilih metode pembayaran Transfer Bank atau QRIS.\n4. Lakukan transfer sesuai nominal tagihan dan unggah bukti pembayaran asli pada halaman Konfirmasi Pembayaran.\n5. Tim admin NusaKlik memverifikasi bukti pembayaran. Setelah berstatus Lunas, tautan unduhan resmi dan invoice A4 langsung tersedia di halaman pesanan maupun Riwayat Pesanan.',
  };

  const upsertSetting = db.prepare(
    'INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)'
  );
  for (const [key, value] of Object.entries(defaultSettings)) {
    upsertSetting.run(key, value);
  }

  // Clear legacy initial placeholder contact/bank/QRIS values if still untouched
  const legacyPlaceholders: Array<[string, string]> = [
    ['whatsapp_number', '6281234567890'],
    ['email', 'halo@nusaklik.id'],
    ['bank_name', 'Bank BCA'],
    ['bank_account_number', '1234-5678-90'],
    ['bank_account_holder', 'PT NusaKlik Digital Indonesia'],
    ['qris_image_url', '/uploads/qris-nusaklik-default.png'],
    ['qris_nmid', 'ID102003004005001'],
    ['social_instagram', 'https://instagram.com/nusaklik.id'],
    ['social_tiktok', 'https://tiktok.com/@nusaklik.id'],
    ['social_youtube', 'https://youtube.com/@nusaklik'],
  ];
  const clearLegacy = db.prepare("UPDATE store_settings SET value = '' WHERE key = ? AND value = ?");
  for (const [k, v] of legacyPlaceholders) {
    clearLegacy.run(k, v);
  }

  db.prepare('UPDATE store_settings SET value = ? WHERE key = ? AND value = ?').run(
    'Lihat produk digital dan informasi promo yang diaktifkan oleh pengelola toko.',
    'banner_promo_subtitle',
    'Hemat hingga 30% untuk e-book strategi, template website, dan paket aset grafis pilihan minggu ini.'
  );
}

export function getStoreSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM store_settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
