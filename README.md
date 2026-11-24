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

### Rekomendasi hosting

Arsitektur yang paling sesuai tanpa memindahkan backend adalah VM Linux kecil yang menjalankan container Node ini, dengan block storage persisten untuk `data/` dan `storage/`. [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) mengiklankan komputasi dan block volume Always Free, tetapi verifikasi akun meminta kartu pembayaran, kapasitas VM bergantung region, dan syarat/kuota gratis harus dicek sebelum pembuatan resource. Jangan mengubah akun menjadi paket berbayar tanpa persetujuan pemilik. Tidak ada akun maupun deployment hosting yang dibuat dari workspace ini.

[Render Free Web Service](https://render.com/docs/free) **tidak cocok** untuk konfigurasi sekarang: filesystem-nya ephemeral sehingga SQLite dan file upload hilang saat restart, spin-down, atau redeploy; database Postgres gratisnya juga memiliki batas masa berlaku. Adapter Cloudflare pada `worker/` masih eksperimental dan belum mengimplementasikan API Admin, checkout, maupun pembayaran, sehingga bukan target produksi.

Sebelum deploy, periksa kembali aturan, kuota, kapasitas region, dan layar billing penyedia. Pemilik perlu membuat akun/resource, DNS/TLS, secret produksi, data Admin, informasi pembayaran, katalog asli, serta strategi backup/restore.

## Migrasi database

Migrasi SQL diterapkan otomatis saat server mulai dan dicatat dalam `schema_migrations`. Database lama tidak dihapus. Tambahkan perubahan skema sebagai file SQL bernomor berikutnya di `migrations/`; jangan menghapus `data/` saat memperbarui aplikasi.

## Keamanan GitHub

`.gitignore` dan `.dockerignore` mengecualikan `.env`, database lokal, bukti pembayaran, file produk privat, serta data runtime. Sebelum publikasi, periksa daftar file yang akan di-stage. Workspace ini bukan repository Git dan tidak memiliki remote; hubungkan repository milik pemilik setelah meninjau berkas serta kredensial.

## Struktur proyek

- `src/`: storefront React, akun, checkout, dan dashboard Admin
- `server.ts`, `server/`: Express API, SQLite, autentikasi, validasi dan akses file
- `migrations/`: migrasi SQL berurutan
- `storage/`: unggahan runtime; produk dan bukti pembayaran tidak dipublikasikan
- `worker/`: adapter Cloudflare eksperimental, belum mendukung transaksi produksi
- `Dockerfile`, `compose.yaml`: deployment Node satu instance dengan volume persisten
