import { Mail, MessageCircle, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { STATIC_SITE_CONFIG } from '../config/staticSite';

const email = STATIC_SITE_CONFIG.contactEmail.trim();
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const whatsapp = STATIC_SITE_CONFIG.whatsappNumber.replace(/\D/g, '');
const validWhatsapp = /^\d{9,15}$/.test(whatsapp);

function ManualOrderNotice() {
  const hasContact = validEmail || validWhatsapp;

  return (
    <div className="rounded-2xl border border-[#D6B36A]/55 bg-[#F5F0E6] p-6 sm:p-8 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#B89143] mt-0.5 shrink-0" />
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-[#26364A]">Pemesanan manual</h2>
          <p className="text-sm text-[#26364A]/80 leading-relaxed">
            Pesan produk yang tersedia melalui Google Form pada halaman produk. Situs ini tidak
            memproses pembayaran; file produk diberikan setelah pembayaran diverifikasi secara
            manual.
          </p>
        </div>
      </div>

      {hasContact ? (
        <div className="flex flex-wrap gap-3 border-t border-[#345477]/12 pt-4">
          {validEmail && (
            <a
              href={`mailto:${encodeURIComponent(email)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#345477] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Mail className="w-4 h-4 text-[#D6B36A]" />
              Hubungi melalui email
            </a>
          )}
          {validWhatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[#345477]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#345477]"
            >
              <MessageCircle className="w-4 h-4" />
              Hubungi melalui WhatsApp
            </a>
          )}
        </div>
      ) : (
        <p className="border-t border-[#345477]/12 pt-4 text-sm text-[#345477]">
          Kontak umum belum dikonfigurasi. Lihat katalog untuk menemukan produk yang tersedia.
        </p>
      )}

      <Link
        to="/katalog"
        className="inline-flex items-center justify-center rounded-lg bg-[#345477] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#294462]"
      >
        Lihat Katalog Produk
      </Link>

      {STATIC_SITE_CONFIG.paymentInstructions.trim() && (
        <div className="border-t border-[#345477]/12 pt-4">
          <h3 className="text-sm font-semibold text-[#345477]">Instruksi pembayaran manual</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-[#26364A]/80">
            {STATIC_SITE_CONFIG.paymentInstructions.trim()}
          </p>
        </div>
      )}
    </div>
  );
}

export function StaticContactPage() {
  return (
    <div className="min-h-[70vh] bg-white">
      <SeoHead
        title="Pemesanan dan Kontak"
        description="Informasi kontak dan status pemesanan manual NusaKlik."
      />
      <section className="border-b border-[#345477]/12 bg-[#EAF0F7] py-10 sm:py-12">
        <div className="mx-auto max-w-4xl space-y-3 px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B89143]">
            Informasi layanan
          </p>
          <h1 className="font-display text-3xl font-bold text-[#26364A] sm:text-4xl">
            Pemesanan dan Kontak
          </h1>
          <p className="text-sm leading-relaxed text-[#7890AA] sm:text-base">
            Produk aktif dimuat dari Admin Google Sheets. Pemesanan dan pembayaran ditangani secara
            manual; file hanya diberikan setelah verifikasi.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <ManualOrderNotice />
      </div>
    </div>
  );
}
