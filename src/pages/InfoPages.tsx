import { CheckCircle2, Mail, MessageCircle, MessageSquare, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { StaticDemoNotice } from '../components/StaticDemoNotice';
import { IS_STATIC_SITE } from '../config/staticSite';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import { isSafeUrl } from '../utils/format';

export function AboutPage() {
  const { settings } = useStore();
  return (
    <div className="bg-white">
      <SeoHead
        title={`Tentang ${settings.store_name}`}
        description={
          IS_STATIC_SITE
            ? 'Tentang katalog NusaKlik yang terhubung ke Google Sheets dan pemesanan manual melalui Google Form.'
            : settings.store_description
        }
      />
      {IS_STATIC_SITE && <StaticDemoNotice />}

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-12 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <nav className="text-xs text-[#7890AA] flex items-center gap-2">
            <Link to="/" className="hover:text-[#345477]">Beranda</Link>
            <span>/</span>
            <span className="text-[#26364A] font-medium">Tentang {settings.store_name}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143]">
            {settings.tagline_sub}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#26364A]">
            Tentang {settings.store_name}
          </h1>
          <p className="text-base sm:text-lg text-[#26364A]/80 leading-relaxed">
            {settings.tagline_main}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="space-y-6 text-base text-[#26364A] leading-relaxed">
          <p>
            {IS_STATIC_SITE
              ? 'Katalog publik NusaKlik memuat produk aktif dari Admin Google Sheets. Pemesanan dilakukan melalui Google Form; file produk hanya diberikan setelah pembayaran diverifikasi secara manual.'
              : settings.store_description}
          </p>
          <p>
            Kami percaya bahwa akses terhadap bacaan bermutu, materi pendidikan terstruktur, serta
            perangkat kerja digital yang rapi dapat membantu individu, pelajar, dan pelaku usaha di
            Indonesia berkembang lebih cepat secara mandiri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(IS_STATIC_SITE
            ? [
                {
                  title: 'Katalog Terhubung',
                  desc: 'Katalog publik mengambil data produk aktif langsung dari Google Sheets saat situs dibuka.',
                },
                {
                  title: 'Pemesanan Manual',
                  desc: 'Tombol Pesan Sekarang membuka Google Form; GitHub Pages tidak memproses checkout atau pembayaran.',
                },
                {
                  title: 'File Privat Tidak Disertakan',
                  desc: 'Tautan file produk privat tidak diambil atau ditampilkan di katalog publik.',
                },
              ]
            : [
            {
              title: 'Kurasi Mandiri',
              desc: 'Setiap produk yang masuk ke katalog diperiksa kejelasan materi, format berkas, dan lisensinya.',
            },
            {
              title: 'Transaksi Transparan',
              desc: 'Mendukung Transfer Bank dan QRIS dengan verifikasi bukti transfer yang teliti serta nota A4 resmi.',
            },
            {
              title: 'Pengiriman Terproteksi',
              desc: 'Berkas produk berbayar disimpan di penyimpanan privat dan hanya dapat diunduh setelah pembayaran Lunas.',
            },
          ]).map((card) => (
            <div key={card.title} className="p-6 rounded-2xl border border-[#D6B36A]/45 bg-[#F5F0E6] space-y-2">
              <h2 className="font-sans-ui text-base font-bold text-[#345477]">{card.title}</h2>
              <p className="text-sm text-[#26364A]/80 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Link
            to="/katalog"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462]"
          >
            Jelajahi Katalog Produk
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const cleanWa = (settings.whatsapp_number || '').replace(/[^\d]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/contact', {
        method: 'POST',
        body: { name, email, whatsapp, subject, message },
      });
      setSent(true);
      setName('');
      setEmail('');
      setWhatsapp('');
      setSubject('');
      setMessage('');
      showToast('Pesan Anda berhasil dikirim ke tim NusaKlik.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim pesan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white">
      <SeoHead
        title="Kontak"
        description={`Hubungi tim ${settings.store_name} untuk bantuan pesanan, pertanyaan produk digital, atau kerja sama.`}
      />

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-12 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#26364A]">
            Hubungi {settings.store_name}
          </h1>
          <p className="text-sm sm:text-base text-[#7890AA] mt-2 max-w-2xl">
            Memiliki pertanyaan seputar produk digital, verifikasi pembayaran, atau lisensi? Tim
            kami siap membantu Anda.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl border border-[#D6B36A]/45 bg-[#F5F0E6] space-y-5">
              {settings.email ? (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#345477] mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#7890AA] uppercase">Email Resmi</p>
                    <p className="font-semibold text-[#26364A]">{settings.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#7890AA]">Email resmi toko sedang disiapkan.</p>
              )}

              {cleanWa ? (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#345477] mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#7890AA] uppercase">Layanan WhatsApp</p>
                    <p className="font-mono-num font-semibold text-[#26364A]">+{cleanWa}</p>
                    <a
                      href={`https://wa.me/${cleanWa}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#345477] text-white hover:bg-[#294462]"
                    >
                      <MessageCircle className="w-4 h-4 text-[#D6B36A]" />
                      <span>Chat WhatsApp Sekarang</span>
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#7890AA]">Nomor WhatsApp layanan sedang disiapkan.</p>
              )}

              {(isSafeUrl(settings.social_instagram) ||
                isSafeUrl(settings.social_tiktok) ||
                isSafeUrl(settings.social_youtube)) && (
                <div className="flex items-start gap-3 pt-2 border-t border-[#345477]/12">
                  <MessageSquare className="w-5 h-5 text-[#B89143] mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[#7890AA] uppercase">Media Sosial</p>
                    <div className="flex flex-wrap gap-3 text-sm text-[#345477] font-medium pt-1">
                      {isSafeUrl(settings.social_instagram) && (
                        <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="underline">
                          Instagram
                        </a>
                      )}
                      {isSafeUrl(settings.social_tiktok) && (
                        <a href={settings.social_tiktok} target="_blank" rel="noreferrer" className="underline">
                          TikTok
                        </a>
                      )}
                      {isSafeUrl(settings.social_youtube) && (
                        <a href={settings.social_youtube} target="_blank" rel="noreferrer" className="underline">
                          YouTube
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl border border-[#345477]/15 bg-white shadow-[0_10px_28px_-16px_rgba(38,54,74,0.12)]">
            {sent ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#345477] mx-auto" />
                <h2 className="font-display text-xl font-bold text-[#26364A]">Pesan Terkirim</h2>
                <p className="text-sm text-[#7890AA]">
                  Terima kasih telah menghubungi {settings.store_name}. Kami akan membalas melalui
                  email atau WhatsApp Anda.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-[#345477]/25 text-[#345477] cursor-pointer"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="font-display text-xl font-bold text-[#26364A]">Kirim Pesan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">Nama *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26364A] mb-1">Subjek *</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26364A] mb-1">
                    Isi Pesan *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#345477]/20 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Pesan'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FULL_FAQS = [
  {
    q: 'Apa itu NusaKlik?',
    a: 'NusaKlik adalah toko produk digital mandiri yang menyediakan e-book, template website, materi pendidikan, cerita anak, novel, cerpen, lembar kerja, hingga aset desain grafis dalam format siap unduh.',
  },
  {
    q: 'Metode pembayaran apa saja yang didukung?',
    a: 'Saat ini NusaKlik mendukung pembayaran melalui Transfer Bank dan QRIS. Instruksi rekening dan kode QRIS resmi ditampilkan otomatis setelah Anda menyelesaikan checkout.',
  },
  {
    q: 'Kapan file produk digital dapat diunduh?',
    a: 'Untuk produk gratis yang dibuka akses publiknya, Anda dapat langsung mengunduh dari halaman detail produk. Untuk produk berbayar, unduhan akan otomatis terbuka setelah bukti pembayaran Anda diperiksa dan disetujui (berstatus Lunas) oleh admin.',
  },
  {
    q: 'Mengapa unduhan belum aktif setelah saya mengunggah bukti transfer?',
    a: 'Mengunggah bukti pembayaran akan mengubah status pesanan menjadi Menunggu Verifikasi. Tim admin akan memeriksa kesesuaian bukti transfer dan nominal sebelum mengubah status menjadi Lunas demi keamanan transaksi.',
  },
  {
    q: 'Bagaimana cara mencetak atau menyimpan invoice resmi?',
    a: 'Pada halaman Detail Pesanan (/pesanan/NOMOR-PESANAN), tersedia nota invoice A4 lengkap dengan logo dan watermark resmi NusaKlik. Klik tombol "Cetak / Simpan PDF" untuk mencetak atau menyimpannya sebagai PDF.',
  },
  {
    q: 'Apakah saya boleh membagikan ulang file yang sudah dibeli?',
    a: 'Tidak. Setiap produk memiliki lisensi penggunaan yang tercantum di halaman detail produk. Pembeli berhak menggunakan untuk kebutuhan pribadi/proyek sesuai lisensi, namun dilarang mendistribusikan ulang berkas asli.',
  },
];

const STATIC_FAQS = [
  {
    q: 'Apa yang ditampilkan oleh versi GitHub Pages?',
    a: 'Katalog mengambil produk aktif dari endpoint publik Google Sheets saat halaman dibuka. Jika endpoint tidak tersedia, situs menampilkan katalog cadangan.',
  },
  {
    q: 'Bagaimana cara memesan produk?',
    a: 'Gunakan tombol Pesan Sekarang pada kartu atau halaman detail produk untuk membuka Google Form. Ikuti instruksi pemesanan dan pembayaran yang tercantum di formulir.',
  },
  {
    q: 'Apakah tautan file produk ditampilkan di situs?',
    a: 'Tidak. Katalog publik hanya menampilkan informasi produk. Tautan PDF atau file privat tidak diambil dan tidak ditampilkan.',
  },
  {
    q: 'Kapan saya menerima file produk?',
    a: 'File diberikan secara manual kepada pembeli setelah pembayaran diverifikasi. Situs tidak menyediakan unduhan otomatis.',
  },
  {
    q: 'Apakah login, keranjang, dan Admin berfungsi?',
    a: 'Tidak. Fitur-fitur tersebut memerlukan backend dan sengaja tidak tersedia di GitHub Pages.',
  },
  {
    q: 'Bagaimana cara menghubungi pengelola?',
    a: 'Kontak resmi belum dikonfigurasi untuk versi statis ini. Jangan melakukan pembayaran berdasarkan informasi demo.',
  },
];

export function FaqPage() {
  const faqs = IS_STATIC_SITE ? STATIC_FAQS : FULL_FAQS;
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="bg-white">
      <SeoHead
        title={IS_STATIC_SITE ? 'FAQ Pratinjau Statis' : 'Pertanyaan Umum (FAQ)'}
        description={
          IS_STATIC_SITE
            ? 'Informasi katalog Google Sheets, pemesanan manual melalui Google Form, dan pengiriman file privat NusaKlik.'
            : 'Jawaban lengkap mengenai cara pembelian, verifikasi pembayaran, unduhan produk digital, dan invoice di NusaKlik.'
        }
        jsonLd={faqJsonLd}
      />
      {IS_STATIC_SITE && <StaticDemoNotice />}

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-12 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#26364A]">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h1>
          <p className="text-sm sm:text-base text-[#7890AA]">
            {IS_STATIC_SITE
              ? 'Informasi seputar katalog produk dan pemesanan manual NusaKlik.'
              : 'Temukan informasi seputar pemesanan, pembayaran, dan akses produk digital NusaKlik.'}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="divide-y divide-[#345477]/14 border-y border-[#345477]/14">
          {faqs.map((item) => (
            <div key={item.q} className="py-5 space-y-2">
              <h2 className="font-sans-ui text-base font-bold text-[#26364A]">{item.q}</h2>
              <p className="text-sm sm:text-base text-[#7890AA] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PolicyPage({
  type,
}: {
  type: 'privacy' | 'terms' | 'refund' | 'guide';
}) {
  const { settings } = useStore();

  const map = {
    privacy: {
      title: 'Kebijakan Privasi',
      body: settings.policy_privacy,
    },
    terms: {
      title: 'Syarat dan Ketentuan',
      body: settings.policy_terms,
    },
    refund: {
      title: 'Kebijakan Pengembalian Dana',
      body: settings.policy_refund,
    },
    guide: {
      title: 'Panduan Pembelian Produk Digital',
      body: settings.purchase_guide,
    },
  }[type];

  return (
    <div className="bg-white">
      <SeoHead title={map.title} description={`${map.title} resmi toko digital ${settings.store_name}.`} />

      <section className="bg-[#EAF0F7] border-b border-[#345477]/12 py-12 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-[#7890AA] flex items-center gap-2 mb-4">
            <Link to="/" className="hover:text-[#345477]">Beranda</Link>
            <span>/</span>
            <span className="text-[#26364A] font-medium">{map.title}</span>
          </nav>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#26364A]">
            {map.title}
          </h1>
          <p className="text-xs text-[#7890AA] mt-2">Berlaku di {settings.store_name}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-6 sm:p-8 rounded-2xl border border-[#345477]/14 bg-white text-sm sm:text-base text-[#26364A] leading-relaxed whitespace-pre-line shadow-[0_8px_24px_-16px_rgba(38,54,74,0.12)]">
          {map.body || 'Informasi kebijakan sedang diperbarui oleh pengelola toko.'}
        </div>
      </div>
    </div>
  );
}
