# NusaKlik — Toko Produk Digital

NusaKlik menggunakan React + TypeScript untuk storefront dan Express/Node.js untuk API. Backend produksi saat ini memakai SQLite (`node:sqlite`) serta direktori persisten untuk file produk privat, bukti pembayaran asli, dan aset publik. Pembayaran diverifikasi manual; unggah bukti tidak otomatis menyatakan pesanan lunas.

## Persyaratan

- Node.js 22.13+ (disarankan Node.js 24 LTS)
- npm
- Docker Compose untuk deployment container

## Menjalankan secara lokal

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Buka `http://localhost:3000`. Periksa build dan pengujian dengan:

```powershell
npm run lint
npm test
npm run build
```

Server produksi lokal dijalankan dengan `npm start` setelah build. Database dan unggahan lokal dibuat di `data/` serta `storage/`; keduanya dikecualikan dari Git. Database baru hanya mendapat daftar kategori dan pengaturan toko dasar—**tidak ada produk, pesanan, pelanggan, QRIS, rekening, atau transaksi contoh**. Tambahkan produk dan informasi pembayaran yang benar melalui `/admin`.

Untuk kebutuhan demonstrasi lokal saja, `SEED_DEMO_DATA=true` dapat membuat katalog contoh fiktif. Jangan aktifkan pada produksi atau menyajikan data tersebut sebagai katalog sungguhan.

## Environment dan pembuatan Admin pertama

Salin `.env.example` menjadi `.env` untuk pengembangan lokal. File `.env` tidak boleh dimasukkan ke repository.

- `SESSION_SECRET`: wajib di produksi, minimal 32 karakter. Buat nilai acak kuat:
  ```powershell
  node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
  ```
- `ADMIN_SETUP_TOKEN`: pada produksi, atur nilai acak terpisah minimal 32 karakter sebelum membuat Admin database pertama melalui `/admin`. Masukkan token tersebut hanya saat setup pertama; endpoint setup terkunci setelah Admin dibuat. Hapus variabel ini dari konfigurasi server setelah setup.
- `ADMIN_PASSCODE`: override login Admin bersama yang bersifat legacy, **bukan** token setup pertama. Siapa pun yang mengetahuinya dapat masuk sebagai identitas super-admin bersama. Sebaiknya biarkan kosong dan gunakan akun Admin database.
- `DATA_DIR` dan `STORAGE_DIR`: arahkan ke direktori pada volume persisten. Path relatif dihitung dari folder proyek.
- `PORT`: otomatis disediakan sebagian besar platform; default `3000`.
- `TRUST_PROXY`: opsional. Isi hanya jika aplikasi berada di belakang reverse proxy/load balancer yang benar-benar dipercaya; jangan aktifkan saat port aplikasi dapat diakses langsung oleh publik.
- `GEMINI_API_KEY` dan `APP_URL`: opsional.

Sesi Admin disimpan di database sebagai hash, kedaluwarsa setelah tujuh hari, dan dicabut saat logout. Token Admin/pelanggan di browser hanya disimpan dalam memori, bukan localStorage.

## Persiapan toko

1. Masuk ke `/admin` atau buat akun Admin pertama menggunakan `ADMIN_SETUP_TOKEN`.
2. Tambahkan produk yang benar. Unggah file digital melalui dashboard agar disimpan secara privat.
3. Isi rekening dan/atau unggah gambar QRIS milik toko yang sebenarnya pada **Pengaturan Toko**. Checkout berbayar menolak metode yang belum dikonfigurasi.
4. Atur kontak dan aset brand, lalu simpan.
5. Uji transaksi dengan file dan data uji sebelum membuka toko untuk pelanggan.

Pesanan berbayar menunggu pembayaran. Setelah pelanggan mengunggah bukti, status menjadi **Menunggu Verifikasi**—Admin harus memeriksa bukti asli dan menyetujui pembayaran secara eksplisit sebelum unduhan dibuka. Bukti pembayaran dan file produk tidak mempunyai URL publik. File bukti tidak dimodifikasi dan unggahan dibatasi 5 MB.

Alamat email toko adalah informasi kontak; pengiriman email transaksi otomatis belum dikonfigurasi.

## Persistensi dan pilihan hosting

Aplikasi mengharapkan **satu instance Node.js** dengan filesystem persisten yang dapat ditulis. SQLite dan folder unggahan harus bertahan melewati restart maupun deployment; jangan jalankan beberapa replika aplikasi yang berbagi database SQLite.

`Dockerfile` dan `compose.yaml` menyimpan `data/` serta `storage/` pada host. Di VM Linux, pasang Docker Compose, salin proyek dan `.env` ke server, isi secret hanya di server, lalu jalankan:

```sh
docker compose up -d --build
docker compose logs -f nusaklik
```

Letakkan reverse proxy TLS (misalnya Caddy) di depan port `3000`, atur DNS/HTTPS, dan batasi akses publik langsung ke port aplikasi. Jadwalkan backup di luar server untuk database **dan** `storage/`. Untuk backup salinan file sederhana, hentikan container sementara agar database SQLite/WAL tersalin secara konsisten.

### Batasan hosting gratis tanpa kartu

Per 25 November 2026, belum ada penyedia yang dapat diverifikasi memenuhi semuanya sekaligus: menjalankan backend Node/Express ini untuk toko transaksi nyata, memberi database dan penyimpanan berkas persisten, benar-benar gratis, dan tidak meminta kartu pembayaran.

- [AlwaysData Free](https://www.alwaysdata.com/en/offers/) mencantumkan harga €0, 1 GB disk, RAM 256 MB, dan CPU ¼. Namun, halaman [pendaftarannya](https://www.alwaysdata.com/en/register/?p=2012) secara eksplisit mewajibkan validasi kartu kredit, termasuk untuk membatasi penyalahgunaan. Karena itu paket ini tidak memenuhi syarat tanpa kartu.
- [Render Free](https://render.com/docs/free) bukan target produksi yang aman: dokumentasi Render menyebut free instance tidak untuk aplikasi produksi, filesystem-nya ephemeral (SQLite dan unggahan hilang saat restart/spin-down/redeploy), dan database Postgres gratis berakhir setelah 30 hari. Pengalaman pendaftaran pemilik juga meminta kartu.
- [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) menyediakan hingga 100.000 request/hari dan 10 ms CPU/request. [D1 Free](https://developers.cloudflare.com/d1/platform/limits/) membatasi satu database hingga 500 MB, total akun 5 GB, 5 juta baris dibaca/hari, dan 100.000 baris ditulis/hari. [R2 Free](https://developers.cloudflare.com/r2/pricing/) mencakup 10 GB-bulan, 1 juta operasi Class A, dan 10 juta Class B. Namun, dokumentasi R2 mengharuskan penambahan subscription melalui checkout dan kebijakan billing Cloudflare mengizinkan pre-authorization metode pembayaran untuk layanan berbasis penggunaan. Jadi, pemakaian R2 tanpa kartu tidak dapat dijamin.

Selain itu, backend saat ini menggunakan `node:sqlite` dan filesystem lokal. Workers tidak menyediakan implementasi `node:sqlite` yang dapat dipakai sebagai database aplikasi; pada konfigurasi kompatibilitas yang mengaktifkannya, modul tersebut hanya stub nonfungsional. D1/R2 memerlukan perubahan cara database dan berkas diakses. Adapter di `worker/` baru mencakup beberapa endpoint baca dan belum menyediakan autentikasi Admin, katalog yang dapat dikelola, checkout, pembayaran, atau unduhan privat. Memakai Cloudflare untuk toko sungguhan akan membutuhkan port backend dan pengujian ulang menyeluruh, bukan sekadar mengisi `wrangler.toml`.

Karena tidak ada opsi yang memenuhi kendala yang ditentukan dan bisa diverifikasi sebagai aman untuk transaksi, **jangan deploy toko ke layanan free yang filesystem-nya ephemeral**. `Dockerfile` dan `compose.yaml` tetap disediakan untuk satu server Node dengan volume host persisten; keduanya tidak dengan sendirinya menyediakan server gratis. Tidak ada akun, subscription, resource, atau deployment yang dibuat. Sebelum memakai penyedia lain, pastikan pemilik dapat mendaftar tanpa kartu, kuota gratis tidak auto-upgrade, dan database serta berkas benar-benar persisten.

## Migrasi database

Migrasi SQL diterapkan otomatis saat server mulai dan dicatat dalam `schema_migrations`. Database lama tidak dihapus. Tambahkan perubahan skema sebagai file SQL bernomor berikutnya di `migrations/`; jangan menghapus `data/` saat memperbarui aplikasi.

## Keamanan GitHub

`.gitignore` dan `.dockerignore` mengecualikan `.env`, database lokal, bukti pembayaran, file produk privat, serta data runtime. Sebelum publikasi, periksa daftar file yang akan di-stage. Pertahankan repository utama sebagai private; hanya hasil statis yang sudah diperiksa yang boleh dipublikasikan ke repository terpisah.

## GitHub Pages dan katalog Admin

Mode GitHub Pages membangun storefront statis untuk repository `nusaklik-site`, memakai base path `/nusaklik-site/` dan HashRouter. Build menggunakan kembali layout storefront, navigasi, kartu produk, kategori, dan aset publik NusaKlik. Backend Express, SQLite, akun, checkout, pembayaran, serta unduhan tidak ikut berjalan di GitHub Pages.

Saat halaman dibuka, `src/services/publicCatalog.ts` memuat katalog publik Admin Google Sheets melalui JSONP. Respons Admin menggantikan katalog cadangan sepenuhnya; produk tidak digabung dengan data lama. Kategori dicocokkan dengan kategori storefront, dan kolom Link PDF tidak dibaca atau disalin ke produk publik. `src/config/staticCatalog.ts` hanya dipakai jika endpoint gagal, sehingga situs masih dapat menampilkan katalog cadangan. Form pemesanan manual tetap menjadi tujuan tombol Pesan Sekarang. File produk tidak disimpan di source maupun disalin ke `dist/`; pembeli menerimanya setelah pembayaran diverifikasi secara manual.

Endpoint saat ini tidak mengirim kolom Status dalam JSON. Karena itu, endpoint Apps Script harus hanya mengembalikan produk Aktif; jika kolom Status disertakan, storefront juga menyaring nilai selain Aktif. Apps Script dan struktur Google Sheets tidak diubah. Jangan menaruh secret, kredensial, QRIS privat, detail rekening, atau tautan file produk privat di konfigurasi maupun respons katalog publik.

Build di root proyek:

```powershell
npm ci
npm run build:pages
```

Hasil siap publik ada di `dist/`. Setelah memeriksa isinya, publikasikan **isi** `dist/` melalui workflow atau branch GitHub Pages `nusaklik-site` yang sudah digunakan. Jangan membuat ulang repository atau mengubah konfigurasi deployment yang ada. Build ini menggunakan HashRouter agar navigasi halaman bekerja pada GitHub Pages tanpa konfigurasi server.

Periksa kembali `dist/` sebelum publikasi. Folder ini hanya berisi hasil frontend, seed katalog demo, dan aset publik yang disalin dari `public/`; jangan menyalin `.env`, `data/`, `storage/`, database, bukti pembayaran, atau berkas produk. Tidak ada push atau deployment otomatis yang disiapkan.

## Struktur proyek

- `src/`: storefront React, akun, checkout, dan dashboard Admin
- `server.ts`, `server/`: Express API, SQLite, autentikasi, validasi dan akses file
- `migrations/`: migrasi SQL berurutan
- `storage/`: unggahan runtime; produk dan bukti pembayaran tidak dipublikasikan
- `worker/`: adapter Cloudflare eksperimental, belum mendukung transaksi produksi
- `Dockerfile`, `compose.yaml`: deployment Node satu instance dengan volume persisten
