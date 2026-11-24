import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import type { CustomerUser } from '../types';

export function LoginPage() {
  const navigate = useNavigate();
  const { setCustomerSession, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; customer: CustomerUser }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setCustomerSession(res.token, res.customer);
      showToast(`Selamat datang kembali, ${res.customer.name}.`);
      navigate('/akun');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke akun.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-[70vh] py-14 px-4">
      <SeoHead
        title="Masuk Akun Pelanggan"
        description="Masuk ke akun pelanggan NusaKlik untuk mengelola riwayat pesanan dan mengunduh produk digital Anda."
      />
      <div className="max-w-md mx-auto border border-[#345477]/16 rounded-2xl p-7 sm:p-8 bg-white space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
            Masuk Akun Pelanggan
          </h1>
          <p className="text-sm text-[#7890AA]">
            Akses riwayat pesanan, invoice resmi, dan produk digital yang telah Anda beli.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg border border-[#991B1B]/30 bg-[#991B1B]/5 text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm focus:outline-none focus:border-[#345477]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1.5">Kata Sandi</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm focus:outline-none focus:border-[#345477]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="text-sm text-center text-[#7890AA] pt-2 border-t border-[#345477]/10">
          Belum memiliki akun?{' '}
          <Link to="/daftar" className="font-semibold text-[#345477] hover:text-[#B89143]">
            Daftar Sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setCustomerSession, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; customer: CustomerUser }>('/auth/register', {
        method: 'POST',
        body: { name, email, whatsapp, password },
      });
      setCustomerSession(res.token, res.customer);
      showToast('Akun pelanggan berhasil dibuat.');
      navigate('/akun');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftarkan akun.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-[70vh] py-14 px-4">
      <SeoHead
        title="Daftar Akun Pelanggan"
        description="Buat akun pelanggan NusaKlik untuk menyimpan koleksi produk digital dan riwayat transaksi Anda."
      />
      <div className="max-w-md mx-auto border border-[#345477]/16 rounded-2xl p-7 sm:p-8 bg-white space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#26364A]">
            Daftar Akun Baru
          </h1>
          <p className="text-sm text-[#7890AA]">
            Simpan produk digital yang Anda beli dan pantau status pembayaran dengan mudah.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg border border-[#991B1B]/30 bg-[#991B1B]/5 text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap Anda"
              className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm focus:outline-none focus:border-[#345477]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm focus:outline-none focus:border-[#345477]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1.5">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="0812xxxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm focus:outline-none focus:border-[#345477]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#26364A] mb-1.5">
              Kata Sandi (Min. 8 karakter)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full px-4 py-2.5 rounded-lg border border-[#345477]/20 text-sm focus:outline-none focus:border-[#345477]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#345477] text-white hover:bg-[#294462] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Mendaftarkan...' : 'Buat Akun'}
          </button>
        </form>

        <p className="text-sm text-center text-[#7890AA] pt-2 border-t border-[#345477]/10">
          Sudah punya akun?{' '}
          <Link to="/masuk" className="font-semibold text-[#345477] hover:text-[#B89143]">
            Masuk di Sini
          </Link>
        </p>
      </div>
    </div>
  );
}
