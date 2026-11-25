import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  return {
    base: mode === 'github-pages' ? '/nusaklik/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'github-pages-preview-metadata',
        transformIndexHtml(html) {
          if (mode !== 'github-pages') {
            return html;
          }
          return html
            .replace(
              /NusaKlik — Toko Produk Digital/g,
              'NusaKlik — Pratinjau Storefront DEMO'
            )
            .replace(
              /Toko produk digital NusaKlik\. Temukan produk untuk membaca, belajar, dan berkarya\./g,
              'Pratinjau desain storefront NusaKlik dengan data produk contoh DEMO. Pesanan, pembayaran, akun, dan unduhan tidak tersedia.'
            );
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          if (mode === 'github-pages') {
            fs.rmSync(path.join(distDir, 'sitemap.xml'), { force: true });
            fs.writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
            return;
          }
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
