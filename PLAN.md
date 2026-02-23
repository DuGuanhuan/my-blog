# My Blog (Astro + Notion) — Plan

## Chosen solution
**Goal:** A personal blog website that looks/feels like a modern editorial site (Claude Blog–inspired), while keeping costs as close to **zero** as possible.

**Stack (Route B, zero-cost first):**
- **CMS / writing:** Notion
- **Website / frontend:** Astro (static-first)
- **Hosting:** Vercel (chosen; free tier is enough for MVP)
- **Comments (optional):** Giscus (GitHub Discussions)
- **Search (optional):** Local index generated at build-time (no paid service)

**Publishing workflow:**
- Write/edit posts in Notion → mark as `Published` → site rebuilds (via GitHub Actions scheduled redeploy on Vercel, every 15 minutes)

---

## Notion setup (already created)
Parent page: `Blog_claw` (Notion page)

### Database: `Posts`
- Database ID: `301b5a28-fc98-8125-a53f-c0781262e71c`
- Database URL: https://www.notion.so/301b5a28fc988125a53fc0781262e71c

### Properties (schema)
- **Name** (title)
- **Slug** (rich_text)
- **Status** (select): `Draft` | `Published`
- **PublishedAt** (date)
- **Excerpt** (rich_text)
- **Category** (select)
- **Tags** (multi_select)
- **Cover** (files)
- **SEO Title** (rich_text)
- **SEO Description** (rich_text)
- **Featured** (checkbox)

### Example posts (seed data)
- `Hello, Notion → Astro` (Draft)
- `Reliability is a love language` (Published)

---

## Requirements

### Accounts / services (free tier)
- Notion account
- GitHub account (for repo + optional Actions + optional Giscus)
- Cloudflare Pages **or** Vercel account (choose later)

### Local tooling
- Node.js (already present)
- npm (already present)
- `notion` CLI (already installed)

### Secrets / configuration
- `NOTION_API_KEY` (Notion integration secret)
  - Stored in local env (already set via `~/.zshrc`, `~/.zprofile`, and `launchctl setenv`).
- Later, in deployment platform env vars:
  - `NOTION_API_KEY`
  - `NOTION_DATABASE_ID=301b5a28fc988125a53fc0781262e71c`

### Notion integration permissions
- The Notion integration must be connected to the `Blog_claw` page (Connections → Add integration)

---

## Design reference (do not forget)
- Primary style reference: `/Users/airr/Developer/playground/temo/index.html`
  - This file contains the Claude Blog–inspired layout we want to replicate (warm paper background, serif display headings, editorial hero + featured strip + filter-and-sort list).
  - The Astro site should reuse the same visual tokens (colors/typography/spacing) and information architecture where possible.

## Site requirements (product requirements)

### Must-have (MVP)
- Home page
  - Hero section (Claude Blog–inspired)
  - Featured / latest posts
- Blog list page (`/blog`)
  - Filter: Category/Tags
  - Search
  - Grid/List toggle (optional for MVP, can be Phase 2)
- Post page (`/blog/[slug]`)
  - Title, date, reading time (estimated)
  - Cover image (if set)
  - Content rendering from Notion blocks
  - SEO meta tags (title/description)
- RSS feed (`/rss.xml`)
- Sitemap (`/sitemap.xml`)

### Nice-to-have
- Draft preview (restricted)
- Pagination
- Related posts
- Comments (Giscus)
- Local full-text search index
- OpenGraph image generation

---

## Overall plan (milestones)

### Phase 1 — MVP (1–2 sessions)
1. **Bootstrap Astro project**
   - Create repo structure
   - Add base layout + tokens (Claude Blog–style)
2. **Notion fetch layer**
   - Config: database id + api key
   - Query posts with `Status=Published`, sort by `PublishedAt desc`
3. **Routing**
   - `/blog` list page
   - `/blog/[slug]` post page
4. **Rendering**
   - Render basic Notion blocks: headings, paragraphs, lists, code, images, quotes
5. **SEO basics**
   - Per-post meta (title/description)
   - RSS + sitemap

**Exit criteria:**
- Publish a post in Notion → rebuild → post appears at `/blog/[slug]`.

### Phase 2 — “Feels like a real editorial site” (next)
- Featured rail / section pages (by Category)
- Grid/List toggle + empty states
- Better typography and spacing polish
- Reading time estimate and TOC

### Phase 3 — Automation & ops (later)
- Deploy to Cloudflare Pages or Vercel
- Automatic rebuild strategy:
  - Start: manual deploy
  - Then: GitHub Actions schedule (e.g., every 30–60 minutes)
- Add Giscus comments
- Add local search index

---

## Open questions (need decisions)
1. **Domain:** use `*.vercel.app` first or bind custom domain
2. **Language preference:** English-first vs Chinese-first vs mixed
3. **Content scope:** purely blog posts vs also “Now/About/Projects” pages

---

## Implementation notes (what’s already done)
- Astro project has been initialized under:
  - `/Users/airr/Developer/playground/my-blog/extra-ellipse`
- Notion integration code + initial routes have been scaffolded.
  - Home: `/`
  - Blog list: `/blog`
  - Post: `/blog/[slug]`

## Next actions (Blog page MVP → V1 plan)

### P0 — Blog page MVP (core usefulness)
1. **Filter & sort panel (left column)** ✅ (implemented)
   - Sort by: Newest / Oldest (uses `PublishedAt`) ✅
   - Category filter (select) ✅
   - Tag filter (single-select first) ✅
   - “Clear all filters” empty-state action ✅
2. **Search** ✅ (implemented)
   - Search by title + excerpt (client-side for now) ✅
   - Empty-state message: “No posts for those filters” ✅
3. **Grid/List toggle** ✅ (implemented)
   - Match the `temo/index.html` interaction and microcopy ✅
   - Persist toggle state (optional: localStorage)

### P1 — Blog content quality (editorial polish)
4. **Post cards** ✅ (implemented)
   - Reading time estimate (simple heuristic)
   - Optional cover/illustration handling (fallback when missing) ✅
   - Consistent category/tag chips ✅
   - **New**: Multi-select dropdowns for Category/Tags (OR logic) ✅
   - **New**: Unified Grid/List view styles across Home/Blog ✅
5. **Featured strip**
   - Use Notion `Featured` boolean to populate ✅

### P2 — Navigation + SEO basics
6. **Post page enhancements**
   - Previous/Next post links
   - Improved typography for Notion blocks
7. **SEO essentials**
   - RSS (`/rss.xml`)
   - Sitemap (`/sitemap.xml`)
   - Canonical + OG meta tags (use `SEO Title/Description` when present)

### P3 — Ops / deploy (still free-tier)
8. **Deploy to Vercel (chosen)** ✅
   - Prereq: push repo to GitHub
   - In Vercel → **Add New… → Project** → import the GitHub repo
   - **Root Directory**: `extra-ellipse`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - Environment variables (Project → Settings → Environment Variables):
     - `NOTION_API_KEY` (Notion integration secret)
     - `NOTION_DATABASE_ID=301b5a28fc988125a53fc0781262e71c`
   - Deploy once, verify:
     - `/` loads
     - `/blog` lists posts
     - `/blog/[slug]` opens a post
   - Note: This site is **static-first**. New Notion posts require a rebuild to show up.
   - **Custom Domain**: `guanhuan.top` (configured via Vercel CLI + Alibaba Cloud DNS) ✅

9. **Auto-refresh strategy (Notion → Site)** ✅
   - Goal: Notion edits automatically appear on the site without manual deploy.
   - Implemented (simple + stable): **GitHub Actions cron every 15 minutes** triggers a **Vercel Deploy Hook**.
     - Workflow file: `.github/workflows/vercel-redeploy-every-15m.yml`
     - One-time setup (already done):
       1) In Vercel project → Settings → Git → **Deploy Hooks** → created a hook (e.g. `cron-15m`).
       2) Added GitHub repo secret: `VERCEL_DEPLOY_HOOK_URL`.
       3) Workflow enabled in the Actions tab.
   - Notes:
     - Expected freshness is **≤ 15 minutes**, not instant.
     - Schedule can drift by a few minutes; normal.
   - Alternative: use Vercel CLI (`vercel deploy --prod`) + `VERCEL_TOKEN` (more moving parts).
   - Advanced: event-based trigger on Notion publish (requires middleware / 3rd-party automation).

### P4 — Optional upgrades
10. **Comments**: Giscus
11. **Search upgrade**: build-time index + client search UI
12. **Renderer coverage**: callout, toggle, table, bookmark

---

## Session updates (2026-02-23)

### Brand + navigation
- Replaced header brand from Claude mark/text to custom Plan B assets.
- Added real `About` route and connected nav link:
  - `extra-ellipse/src/pages/about.astro`
  - `extra-ellipse/src/components/Shell.astro`
- Removed `Contact` button from top nav (kept `Subscribe`).

### Homepage content alignment
- Updated hero copy to:
  - `Becoming in Public`
  - `Write to become. Build to be free.`
- Updated homepage topic entries to:
  - `Becoming`
  - `Thinking Tools`
  - `Lived Experience`
  - `Quiet Essays`

### Notion compatibility + rendering
- Fixed Notion SDK compatibility issue (`databases.query` vs `dataSources.query`) in:
  - `extra-ellipse/src/lib/notion.ts`
- Implemented recursive block fetching for nested Notion blocks.
- Expanded renderer support to include:
  - `toggle`, `callout`, `table`, `to_do`, nested children in list items
  - files: `extra-ellipse/src/lib/notion.ts`, `extra-ellipse/src/lib/renderNotion.ts`

### Favicon + logo workflow
- Tab icon now uses a cropped square asset:
  - `extra-ellipse/public/Blog-tab-icon.png`
- Header logo now uses:
  - `extra-ellipse/public/Blog-LOGO-removebg-preview.png`
- Kept source/backup asset for future recrop:
  - `extra-ellipse/public/Blog.backup-before-crop.png`

---

## Session updates (2026-02-24)

### Notion fetch stability for heavy pages
- Hardened Notion request flow in `extra-ellipse/src/lib/notion.ts`:
  - Configurable request timeout: `NOTION_TIMEOUT_MS` (default 45000ms)
  - Retry wrapper for key Notion API calls: `NOTION_RETRY_TIMES` (default 2 retries)
  - Concurrent child-block recursion with cap: `NOTION_CHILD_CONCURRENCY` (default 6)
  - Recursive depth guard: `NOTION_MAX_BLOCK_DEPTH` (default 12)
- Goal: reduce `/blog/[slug]` stalls/timeouts on large nested posts (e.g. `Plan_B`).

### Notion table rendering polish
- Refined article table style to a minimal Notion-like line-grid:
  - Runtime stylesheet: `extra-ellipse/public/styles/global.css`
  - Synced source stylesheet: `extra-ellipse/src/styles/global.css`
- Changes: lighter wireframe borders, compact spacing, removed zebra striping and heavy card background.

### Right-side TOC interaction (Notion-inspired)
- Added right-side TOC in `extra-ellipse/src/pages/blog/[slug].astro` with:
  - Heading extraction constrained to `h1/h2/h3`
  - Click-to-jump and active-section highlighting
  - Unified active-state logic between click navigation and scroll position
  - Slim fixed rail by default; hover reveals panel
  - Rail hides while panel is visible, reappears on mouse leave
  - Hover bridge region to prevent panel disappearing during pointer transition
