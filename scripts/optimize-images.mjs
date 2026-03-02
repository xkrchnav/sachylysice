/**
 * optimize-images.mjs
 *
 * Optimizes images that Astro does NOT process automatically (i.e. files in public/).
 * Run manually whenever you update the logo or add new images to public/:
 *
 *   npm run optimize-images
 *
 * What it does:
 *   1. Generates correctly-sized favicons from src/assets/images/logo.png
 *   2. Scans public/ recursively and compresses any large PNG / JPG / JPEG files in-place
 *
 * Note: Images in src/assets/images/ are handled by Astro's <Image /> component
 *       at build time — do NOT process those here.
 */

import sharp from "sharp";
import { readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";

const LOGO_SRC = "src/assets/images/logo.png";
const PUBLIC_DIR = "public";

// ── skip these filenames in public/ compression ──────────────────────────────
const SKIP_FILES = new Set(["favicon.png", "apple-touch-icon.png"]);

// ── helper: human-readable file size ─────────────────────────────────────────
const kb = (bytes) => `${Math.round(bytes / 1024)} kB`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. FAVICON GENERATION
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n📐 Generating favicons from logo.png …\n");

const logoBuffer = readFileSync(LOGO_SRC);

/** Resize + compress to target path */
async function generateFavicon(buffer, width, height, destPath, quality = 90) {
  const before = statSync(LOGO_SRC).size;
  await sharp(buffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, quality })
    .toFile(destPath);
  const after = statSync(destPath).size;
  console.log(`  ✅  ${destPath}  (${width}×${height})  ${kb(before)} → ${kb(after)}`);
}

await generateFavicon(logoBuffer, 32, 32, "public/favicon.png", 80);
await generateFavicon(logoBuffer, 180, 180, "public/apple-touch-icon.png", 90);

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPRESS LARGE IMAGES IN public/ (non-favicon PNG / JPG)
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_THRESHOLD_BYTES = 100 * 1024; // only compress files > 100 kB
const SUPPORTED_EXTS = new Set([".png", ".jpg", ".jpeg"]);

/** Walk a directory recursively, yield file paths */
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

const toCompress = [];
for (const filePath of walk(PUBLIC_DIR)) {
  const ext = extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTS.has(ext)) continue;
  if (SKIP_FILES.has(basename(filePath))) continue;
  const { size } = statSync(filePath);
  if (size > SIZE_THRESHOLD_BYTES) {
    toCompress.push({ filePath, size, ext });
  }
}

if (toCompress.length === 0) {
  console.log("\n✨  No large images found in public/ — nothing to compress.\n");
} else {
  console.log(`\n🗜️  Compressing ${toCompress.length} large image(s) in public/ …\n`);

  for (const { filePath, size, ext } of toCompress) {
    const buffer = readFileSync(filePath);
    let optimized;

    if (ext === ".png") {
      optimized = await sharp(buffer)
        .png({ compressionLevel: 9, quality: 85 })
        .toBuffer();
    } else {
      // jpg / jpeg
      optimized = await sharp(buffer)
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    }

    if (optimized.length < size) {
      writeFileSync(filePath, optimized);
      console.log(`  ✅  ${filePath}  ${kb(size)} → ${kb(optimized.length)}`);
    } else {
      console.log(`  ⏭️   ${filePath}  already optimal (${kb(size)})`);
    }
  }
}

console.log("\n🎉  Done!\n");
