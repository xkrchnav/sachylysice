import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const distHtml = resolve(distDir, "letak", "index.html");
const publicDir = resolve(rootDir, "public");

// ── 1. Build ──
console.log("🏗️  Building project...");
execSync("npm run build", { stdio: "inherit", cwd: rootDir });

if (!existsSync(distHtml)) {
  throw new Error("Missing dist/letak/index.html. Build may have failed.");
}

mkdirSync(publicDir, { recursive: true });

// ── 2. Start local HTTP server ──
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const server = createServer((req, res) => {
  let filePath = join(distDir, decodeURIComponent(req.url.split("?")[0]));
  if (statSync(filePath, { throwIfNoEntry: false })?.isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
});

await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;
console.log(`✅ Local server running on http://127.0.0.1:${port}`);

// ── 3. Generate PDFs with Playwright ──
try {
  const browser = await chromium.launch();
  const baseUrl = `http://127.0.0.1:${port}/letak/`;

  // ── PDF 1: A5 (2x on landscape A4) ──
  console.log("\n📄 Generating letak-a5.pdf (2x A5 on A4 landscape)...");
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1123, height: 794 });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    
    // Hide A4 flyer and separator for A5 export
    await page.evaluate(() => {
      const a4Sheet = document.querySelector(".a4-sheet-full");
      const separator = document.querySelector(".flyer-section");
      const backLink = document.querySelector("div[style*='margin-top']");
      if (a4Sheet) a4Sheet.style.display = "none";
      if (separator) separator.style.display = "none";
      if (backLink) backLink.style.display = "none";
    });

    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(500);

    await page.pdf({
      path: resolve(publicDir, "letak-a5.pdf"),
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: false,
      scale: 1,
    });

    await page.close();
    console.log(`✅ Generated: ${resolve(publicDir, "letak-a5.pdf")}`);
  }

  // ── PDF 2: A4 (full page) ──
  console.log("\n📄 Generating letak-a4.pdf (A4 portrait)...");
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    
    // Hide A5 flyersand separator for A4 export
    await page.evaluate(() => {
      const a5Sheet = document.querySelector(".a4-sheet");
      const separator = document.querySelector(".flyer-section");
      const backLink = document.querySelector("div[style*='margin-top']");
      if (a5Sheet) a5Sheet.style.display = "none";
      if (separator) separator.style.display = "none";
      if (backLink) backLink.style.display = "none";
    });

    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(500);

    await page.pdf({
      path: resolve(publicDir, "letak-a4.pdf"),
      format: "A4",
      landscape: false,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: false,
      scale: 1,
    });

    await page.close();
    console.log(`✅ Generated: ${resolve(publicDir, "letak-a4.pdf")}`);
  }

  // ── PNG: A4 flyer screenshot for image sharing ──
  console.log("\n🖼️  Generating letak-a4.png (A4 for sharing)...");
  {
    const w = 794;
    const h = 1123;
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    // Isolate the A4 flyer
    await page.evaluate(() => {
      const a5Sheet = document.querySelector(".a4-sheet");
      const separator = document.querySelector(".flyer-section");
      const backLink = document.querySelector("div[style*='margin-top']");
      const controls = document.querySelector(".screen-controls");
      const hint = document.querySelector(".hint");
      if (a5Sheet) a5Sheet.style.display = "none";
      if (separator) separator.style.display = "none";
      if (backLink) backLink.style.display = "none";
      if (controls) controls.style.display = "none";
      if (hint) hint.style.display = "none";
    });

    await page.waitForTimeout(500);

    const el = await page.$(".a4-sheet-full");
    await el.screenshot({
      path: resolve(publicDir, "letak-a4.png"),
      type: "png",
    });

    await context.close();
    console.log(`✅ Generated: ${resolve(publicDir, "letak-a4.png")}`);
  }

  await browser.close();
  console.log("\n✨ All PDFs generated successfully!");
} finally {
  server.close();
}
