import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const dirs = [
  'public/assets/logo',
  'public/assets/banner',
  'public/assets/watermark',
  'public/assets/favicon',
  'public/assets/covers',
  'public/assets/images',
];

for (const dir of dirs) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}

// Icon mark SVG: Refined geometric open-page book + archipelago diamond + soft gold click fold
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" fill="none">
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#345477"/>
  <path d="M17 20C17 18.3431 18.3431 17 20 17H31V47H20C18.3431 47 17 45.6569 17 44V20Z" fill="#FFFFFF" fill-opacity="0.95"/>
  <path d="M33 17H44C45.6569 17 47 18.3431 47 20V44C47 45.6569 45.6569 47 44 47H33V17Z" fill="#FFFFFF" fill-opacity="0.82"/>
  <path d="M31 17H33V47H31V17Z" fill="#345477"/>
  <path d="M38 17L47 26H40C38.8954 26 38 25.1046 38 24V17Z" fill="#D6B36A"/>
  <path d="M21 25H27M21 31H27M21 37H25" stroke="#345477" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="40" cy="36" r="3.5" fill="#D6B36A"/>
</svg>`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#345477"/>
  <path d="M16 19C16 17.8954 16.8954 17 18 17H31V47H18C16.8954 47 16 46.1046 16 45V19Z" fill="#FFFFFF"/>
  <path d="M33 17H46C47.1046 17 48 17.8954 48 19V45C48 46.1046 47.1046 47 46 47H33V17Z" fill="#FFFFFF" fill-opacity="0.86"/>
  <path d="M39 17L48 26H41C39.8954 26 39 25.1046 39 24V17Z" fill="#D6B36A"/>
  <circle cx="40.5" cy="36.5" r="4" fill="#D6B36A"/>
</svg>`;

const logoHorizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" width="640" height="144" fill="none">
  <rect x="4" y="8" width="56" height="56" rx="14" fill="#345477"/>
  <path d="M17 22C17 20.3431 18.3431 19 20 19H31V49H20C18.3431 49 17 47.6569 17 46V22Z" fill="#FFFFFF" fill-opacity="0.96"/>
  <path d="M33 19H44C45.6569 19 47 20.3431 47 22V46C47 47.6569 45.6569 49 44 49H33V19Z" fill="#FFFFFF" fill-opacity="0.82"/>
  <path d="M38 19L47 28H40C38.8954 28 38 27.1046 38 26V19Z" fill="#D6B36A"/>
  <path d="M21 27H27M21 33H27M21 39H25" stroke="#345477" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="40" cy="38" r="3.5" fill="#D6B36A"/>
  <text x="76" y="45" font-family="Plus Jakarta Sans, system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" letter-spacing="-0.8" fill="#345477">Nusa<tspan fill="#D6B36A">Klik</tspan></text>
</svg>`;

const logoWhiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" width="640" height="144" fill="none">
  <rect x="4" y="8" width="56" height="56" rx="14" fill="#FFFFFF" fill-opacity="0.14" stroke="#D6B36A" stroke-width="2"/>
  <path d="M17 22C17 20.3431 18.3431 19 20 19H31V49H20C18.3431 49 17 47.6569 17 46V22Z" fill="#FFFFFF"/>
  <path d="M33 19H44C45.6569 19 47 20.3431 47 22V46C47 47.6569 45.6569 49 44 49H33V19Z" fill="#FFFFFF" fill-opacity="0.84"/>
  <path d="M38 19L47 28H40C38.8954 28 38 27.1046 38 26V19Z" fill="#D6B36A"/>
  <path d="M21 27H27M21 33H27M21 39H25" stroke="#345477" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="40" cy="38" r="3.5" fill="#D6B36A"/>
  <text x="76" y="45" font-family="Plus Jakarta Sans, system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" letter-spacing="-0.8" fill="#FFFFFF">Nusa<tspan fill="#D6B36A">Klik</tspan></text>
</svg>`;

const watermarkBlueSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" width="1040" height="440" fill="none">
  <g opacity="0.18" transform="translate(260, 110) rotate(-18) translate(-220, -65)">
    <rect x="10" y="18" width="84" height="84" rx="20" stroke="#345477" stroke-width="4" fill="none"/>
    <path d="M30 38C30 35.7909 31.7909 34 34 34H50V82H34C31.7909 82 30 80.2091 30 78V38Z" stroke="#345477" stroke-width="3.5"/>
    <path d="M54 34H70C72.2091 34 74 35.7909 74 38V78C74 80.2091 72.2091 82 70 82H54V34Z" stroke="#345477" stroke-width="3.5"/>
    <path d="M62 34L74 46H64C62.8954 46 62 45.1046 62 44V34Z" fill="#D6B36A"/>
    <text x="112" y="72" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="52" font-weight="700" letter-spacing="-1" fill="#345477">NusaKlik</text>
    <text x="114" y="98" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="3.5" fill="#345477">DOKUMEN TRANSAKSI RESMI</text>
  </g>
</svg>`;

const watermarkWhiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 220" width="1040" height="440" fill="none">
  <g opacity="0.22" transform="translate(260, 110) rotate(-18) translate(-220, -65)">
    <rect x="10" y="18" width="84" height="84" rx="20" stroke="#FFFFFF" stroke-width="4" fill="none"/>
    <path d="M30 38C30 35.7909 31.7909 34 34 34H50V82H34C31.7909 82 30 80.2091 30 78V38Z" stroke="#FFFFFF" stroke-width="3.5"/>
    <path d="M54 34H70C72.2091 34 74 35.7909 74 38V78C74 80.2091 72.2091 82 70 82H54V34Z" stroke="#FFFFFF" stroke-width="3.5"/>
    <text x="112" y="72" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="52" font-weight="700" letter-spacing="-1" fill="#FFFFFF">NusaKlik</text>
  </g>
</svg>`;

// Write SVGs
fs.writeFileSync(path.join(root, 'public/assets/logo/logo-icon.svg'), iconSvg);
fs.writeFileSync(path.join(root, 'public/assets/logo/logo-horizontal.svg'), logoHorizontalSvg);
fs.writeFileSync(path.join(root, 'public/assets/logo/logo-white.svg'), logoWhiteSvg);
fs.writeFileSync(path.join(root, 'public/assets/favicon/favicon.svg'), faviconSvg);
fs.writeFileSync(path.join(root, 'public/assets/watermark/watermark-blue.svg'), watermarkBlueSvg);
fs.writeFileSync(path.join(root, 'public/assets/watermark/watermark-white.svg'), watermarkWhiteSvg);

// Render transparent PNGs with sharp
await sharp(Buffer.from(iconSvg)).resize(256, 256).png().toFile(path.join(root, 'public/assets/logo/logo-icon.png'));
await sharp(Buffer.from(logoHorizontalSvg)).resize(640, 144).png().toFile(path.join(root, 'public/assets/logo/logo-horizontal.png'));
await sharp(Buffer.from(logoWhiteSvg)).resize(640, 144).png().toFile(path.join(root, 'public/assets/logo/logo-white.png'));
await sharp(Buffer.from(watermarkBlueSvg)).resize(1040, 440).png().toFile(path.join(root, 'public/assets/watermark/watermark-blue.png'));
await sharp(Buffer.from(watermarkWhiteSvg)).resize(1040, 440).png().toFile(path.join(root, 'public/assets/watermark/watermark-white.png'));

await sharp(Buffer.from(faviconSvg)).resize(16, 16).png().toFile(path.join(root, 'public/assets/favicon/favicon-16x16.png'));
await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toFile(path.join(root, 'public/assets/favicon/favicon-32x32.png'));
await sharp(Buffer.from(faviconSvg)).resize(48, 48).png().toFile(path.join(root, 'public/assets/favicon/favicon-48x48.png'));

// Organize generated JPGs into public/assets/banner and public/assets/covers
const srcImagesDir = path.join(root, 'src/assets/images');
if (fs.existsSync(srcImagesDir)) {
  const files = fs.readdirSync(srcImagesDir);
  const mapCopy = [
    ['hero_nusaklik_banner', 'public/assets/banner/hero-nusaklik.jpg'],
    ['promo_nusaklik_banner', 'public/assets/banner/promo-nusaklik.jpg'],
    ['cover_ebook_bisnis', 'public/assets/covers/cover-ebook-bisnis.jpg'],
    ['cover_novel_nusantara', 'public/assets/covers/cover-novel-nusantara.jpg'],
    ['cover_cerita_anak', 'public/assets/covers/cover-cerita-anak.jpg'],
    ['cover_template_web', 'public/assets/covers/cover-template-web.jpg'],
    ['cover_materi_edukasi', 'public/assets/covers/cover-materi-edukasi.jpg'],
    ['cover_aset_grafis', 'public/assets/covers/cover-aset-grafis.jpg'],
  ];
  for (const [prefix, dest] of mapCopy) {
    const match = files.find((f) => f.startsWith(prefix));
    if (match) {
      fs.copyFileSync(path.join(srcImagesDir, match), path.join(root, dest));
    }
  }
}

console.log('Brand assets generated successfully.');
