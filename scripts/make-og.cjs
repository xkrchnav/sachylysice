
// Generuje OG obrázky 1200x630 (sociální sítě, Google) z fotografií v src/assets.
// Spuštění: node scripts/make-og.cjs
const sharp = require('sharp');
const fs = require('fs');

const jobs = [
  ['src/assets/images/gallery01/da165b68_original.jpg', 'public/og/turnaj-2026.jpg'],
  ['src/assets/images/gallery02/dc1a212c_original.jpg', 'public/og/sachylysice.jpg'],
];

(async () => {
  fs.mkdirSync('public/og', { recursive: true });
  for (const [src, out] of jobs) {
    await sharp(src)
      .resize(1200, 630, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(out);
    console.log(out, Math.round(fs.statSync(out).size / 1024) + ' kB');
  }
})();
