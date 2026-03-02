# Šachy Lysice — Deployment Guide

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- A [GitHub](https://github.com/) account with this repo pushed

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:4321)
npm run dev

# Production build (output in ./dist)
npm run build

# Preview production build locally
npm run preview
```

---

## Deploy to GitHub Pages (primary)

Deployment is fully automated via GitHub Actions (`.github/workflows/deploy.yml`).
Every push to `main` triggers a build and deploy — no manual steps needed.

### 1. Enable GitHub Pages in repo settings

1. Go to your GitHub repo → **Settings** → **Pages**
2. Under **Source** select **GitHub Actions**
3. Save

### 2. Push your code

```bash
git add .
git commit -m "Initial Astro site"
git push origin main
```

GitHub Actions will build and deploy automatically. First deploy takes ~1–2 minutes.
Your site will be live at `https://<your-username>.github.io/<repo-name>/`
or at `https://www.sachylysice.cz` if DNS is configured (see below).

### 3. Custom domain (sachylysice.cz)

The file `public/CNAME` already contains `www.sachylysice.cz` — GitHub Pages picks it up automatically.

In your **Wedos DNS admin** set:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| `ALIAS` | `@` (root) | `<your-username>.github.io` | 300 |
| `CNAME` | `www` | `<your-username>.github.io` | 300 |

Then in GitHub repo → **Settings** → **Pages** → **Custom domain**:
- Enter `www.sachylysice.cz` and save
- Wait for the green **DNS check passed** ✅
- Tick **Enforce HTTPS** (free SSL via Let's Encrypt)

### Anti-spam email records (no email on domain)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| `TXT` | `@` | `v=spf1 -all` | 300 |
| `TXT` | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;` | 300 |

---

## Subsequent Deployments

Just `git push` — GitHub Actions rebuilds and redeploys automatically.

---

## Alternative: Deploy to Cloudflare Pages

If you switch back to Cloudflare Pages:

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Compute (Workers)** → **Workers & Pages**.
3. Click **Create** → **Pages** → **Connect to Git** → select repo.
4. Build settings:

   | Setting | Value |
   |---------|-------|
   | **Framework preset** | `Astro` |
   | **Build command** | `npm run build` |
   | **Build output directory** | `dist` |

5. Click **Save and Deploy**.

Deploy with Wrangler CLI (manual):

```bash
npm run build
npx wrangler pages deploy ./dist
```

---

## Project Structure

```
├── .carrd/                  # Original legacy site (gitignored, kept for reference)
├── public/                  # Static files (favicon, apple-touch-icon)
├── src/
│   ├── assets/images/       # Images optimized by Astro at build time
│   ├── layouts/
│   │   └── BaseLayout.astro # HTML shell, global CSS, font loading
│   └── pages/
│       └── index.astro      # One-page site with all content
├── astro.config.mjs         # Astro configuration
├── wrangler.jsonc            # Cloudflare Pages config
├── package.json
└── tsconfig.json
```

## Key Decisions

- **Static output** (`output: "static"` default) — no server adapter needed, fits Cloudflare free tier
- **Zero client-side JavaScript** — pure HTML + CSS
- **Astro `<Image />`** — all images auto-converted to WebP with aggressive compression at build time (14 images, ~4 MB of originals → ~540 KB total)
- **Semantic HTML** — proper `<nav>`, `<main>`, `<section>`, `<figure>`, `<table>` elements with ARIA labels
- **CSS only** — sticky nav, responsive grid gallery, unified type scale via `clamp()`
- **Google Fonts removed from external link** — replaced with `@font-face` with `font-display: swap` for better performance
