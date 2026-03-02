import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const distHtml = resolve(distDir, "letak", "index.html");
const outputPdf = resolve(rootDir, "public", "letak-a4.pdf");

// ── 1. Build ──
execSync("npm run build", { stdio: "inherit", cwd: rootDir });

if (!existsSync(distHtml)) {
  throw new Error("Missing dist/letak/index.html. Build may have failed.");
}

mkdirSync(dirname(outputPdf), { recursive: true });

// ── 2. Start a local HTTP server over dist/ so all assets load ──
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
console.log(`Local server on http://127.0.0.1:${port}`);

// ── 3. Generate PDF with Playwright ──
try {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // A4 landscape dimensions (297mm × 210mm at 96 DPI)
  await page.setViewportSize({ width: 1123, height: 794 });

  await page.goto(`http://127.0.0.1:${port}/letak/`, { waitUntil: "networkidle" });

  // Switch to print media so @media print rules apply (hides buttons, etc.)
  await page.emulateMedia({ media: "print" });

  // Wait for fonts / images to settle
  await page.waitForTimeout(500);

  await page.pdf({
    path: outputPdf,
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: false,
    scale: 1,
  });

  await browser.close();
  console.log(`PDF generated: ${outputPdf}`);
} finally {
  server.close();
}
