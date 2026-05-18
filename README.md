# Pocket3Lab

**The Lab for DJI Pocket 3 Creators** — a fast, SEO-first static site built with Astro 6, Tailwind CSS 4, and MDX.

**Live site:** https://lutkylab.com

---

## Tech stack

- **Astro 6** (static output)
- **Tailwind CSS 4** (CSS-native config)
- **MDX** for content with custom components
- **Astro Content Collections** for typed posts
- **@astrojs/sitemap** for automatic sitemap
- **@astrojs/rss** for RSS feed
- Deploy target: **Cloudflare Pages**

---

## Local development

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # builds to ./dist/
npm run preview      # preview the build locally
```

---

## Adding a new post

Run the scaffolder:

```bash
npm run new-post
```

It will ask for category, title, slug, and description, then create a pre-filled MDX file in the correct content collection folder.

**Manual steps after scaffolding:**
1. Add a hero image to `public/images/your-slug-hero.jpg` (recommended: 1280×720px, <200KB)
2. Update the Amazon ASINs in `amazonProducts` frontmatter
3. Write your content
4. Add real `faq` entries — they feed the FAQPage JSON-LD schema automatically

**Content collections:**
- `src/content/reviews/` → URL: `/reviews/your-slug`
- `src/content/tutorials/` → URL: `/tutorials/your-slug`
- `src/content/comparisons/` → URL: `/comparisons/your-slug`
- `src/content/guides/` → URL: `/guides/your-slug`
- `src/content/luts/` → URL: (no auto slug page yet — edit `/pages/luts/index.astro`)

---

## Frontmatter reference

```yaml
---
title: "Your Title (max 60 chars for SEO)"
description: "Meta description between 140-160 chars. Include primary keyword."
pubDate: 2026-01-15
updatedDate: 2026-05-01    # optional — shows as "Updated" date
heroImage: "/images/filename.jpg"
heroImageAlt: "Descriptive alt text for accessibility + image SEO"
category: "review"         # review | tutorial | comparison | guide
tags: ["dji-pocket-3", "review"]
author: "Jun Hao"
featured: false            # true = appears in Featured section on homepage
rating: 4.5                # optional, 1-5; enables Review schema + star display
amazonProducts:
  - asin: "B0XXXXXXXXX"
    title: "Product display name"
    ctaText: "Check Price on Amazon"
faq:
  - question: "What question do people ask?"
    answer: "Clear answer. Used in FAQ schema and rendered at bottom of post."
---
```

---

## Swapping in real AdSense code

1. Get approved for AdSense and note your publisher ID (`ca-pub-XXXXXXXXXXXXXXXXX`)
2. Add your publisher ID to `.env`:
   ```
   ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXXX
   ```
3. Open `src/components/AdSlot.astro`
4. Replace the comment block inside the `{isProd && adClient ? (` branch with your real `<ins class="adsbygoogle">` code and `<script>` tag
5. Add the AdSense `<script>` tag to `src/layouts/BaseLayout.astro` inside `<head>`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXX" crossorigin="anonymous"></script>
   ```

The `AdSlot` component is already placed in three positions in `PostLayout.astro`:
- After the hero image (in-article)
- Between sections (you control placement per-post with `<AdSlot slot="between-section" />`)
- End of post

---

## Adding LUT products

Edit `src/pages/luts/index.astro` directly. Add product sections with `<AffiliateBox>` components:

```astro
<AffiliateBox
  asin="B0XXXXXXXXX"
  title="Product name"
  ctaText="Download / Buy Now"
  price="$XX"
  imageUrl="/images/product-thumb.jpg"
/>
```

For future digital product delivery, you can add a download link or Gumroad embed.

---

## Deploying to Cloudflare Pages

1. Push this repo to GitHub or GitLab.
2. In Cloudflare Dashboard → **Pages** → **Create a project** → Connect Git.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 22 (set in Environment Variables: `NODE_VERSION=22`)
4. Add environment variables in Cloudflare Pages → Settings → Environment variables:
   - `AMAZON_TAG` = your Amazon Associates tag
   - `ADSENSE_CLIENT_ID` = your AdSense publisher ID (after approval)
5. Deploy. Cloudflare will build and deploy automatically on every push.

**Custom domain:** In Pages → Custom Domains → Add Domain → point your DNS CNAME at `*.pages.dev`.

---

## SEO validation checklist

After each deploy:

- **JSON-LD structured data:** Paste any post URL into [Google's Rich Results Test](https://search.google.com/test/rich-results) — should show Article, Review (if applicable), and FAQPage schemas.
- **Sitemap:** Visit `https://lutkylab.com/sitemap-index.xml` — should list all pages.
- **RSS:** Visit `https://lutkylab.com/rss.xml` — should validate at [W3C Feed Validator](https://validator.w3.org/feed/).
- **Lighthouse:** Run in Chrome DevTools → Lighthouse tab. Target: Performance 95+, SEO 100, Accessibility 95+.
- **Open Graph:** Test any URL at [opengraph.xyz](https://www.opengraph.xyz/).

---

## Hero images

Hero images go in `public/images/`. Recommended spec:
- Size: 1280 × 720px (16:9)
- Format: WebP or optimized JPEG
- File size: under 200KB

The site references them via `heroImage: "/images/filename.jpg"` in frontmatter and renders them with standard `<img>` tags with width/height attributes set for CLS prevention.

---

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

`.env` is gitignored. Never commit it.
