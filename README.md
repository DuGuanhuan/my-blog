# My Blog — Astro + Notion (extra-ellipse)

> Language: **English** | [简体中文](./README.zh-CN.md)

This repo hosts a **static-first personal blog** built with **Astro** and powered by a **Notion database** as the CMS.

- **Site project**: `extra-ellipse/`
- **CMS**: Notion
- **Main Notion DB**: `Posts` (see `PLAN.md` for schema + Database ID)

> Design goal: a modern editorial look (Claude Blog–inspired), with a free/low-cost deployment path (Cloudflare Pages or Vercel).

---

## 1) Repo layout

```txt
my-blog/
  PLAN.md                 Project plan + Notion schema
  README.md               (this file)
  extra-ellipse/          Astro app
    src/                  Pages + components
    public/               Static assets (favicons, logo, global.css)
    .env                  Local env mapping
    package.json
```

The actual website lives under:

```bash
cd extra-ellipse
```

---

## 2) Requirements

- Node.js + npm
- A Notion integration secret available as env var:
  - `NOTION_API_KEY`
- Notion database ID available as env var or via `.env`:
  - `NOTION_DATABASE_ID`

### Notion permissions (IMPORTANT)

The Notion integration must be **connected** to the parent page (e.g. `Blog_claw`) that contains the `Posts` database:

Notion → open the page → **Connections** → **Add integration**.

If the integration is not connected, API calls will fail even if the key is correct.

---

## 3) Local development

From repo root:

```bash
cd extra-ellipse
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:4321).

---

## 4) Build / preview

### Build (static)

Astro build requires Notion env vars to be present **in the build process environment**.

If your key is stored via macOS `launchctl setenv`, you can inject it explicitly:

```bash
cd extra-ellipse
NOTION_API_KEY="$(launchctl getenv NOTION_API_KEY)" \
NOTION_DATABASE_ID="301b5a28fc988125a53fc0781262e71c" \
npm run build
```

### Preview the built site

```bash
cd extra-ellipse
npm run preview
```

---

## 5) Publishing workflow (write posts in Notion)

### The Notion database

The `Posts` database is the source of truth.

Common fields (see `PLAN.md` for full schema):

- **Name** (title)
- **Slug** (rich_text)
- **Status**: `Draft` | `Published`
- **PublishedAt** (date)
- **Excerpt** (rich_text)
- **Category** (select)
- **Tags** (multi_select)
- **Cover** (files)
- **SEO Title** / **SEO Description**
- **Featured** (checkbox)

### Create a new post (recommended manual flow)

1. Open the Notion `Posts` database.
2. Add a new row.
3. Fill in:
   - **Name** (title)
   - **Slug** (URL-safe)
   - **Status** = `Draft` while writing
   - **PublishedAt** (date)
   - **Excerpt** (optional)
   - **Category/Tags/Cover** (optional)
4. Write the article content in the Notion page body.
5. When ready: set **Status** = `Published`.
6. Rebuild/redeploy the site (or wait for the scheduled auto-redeploy; see **Auto redeploy (every 15 min)** below).

### Create a new post (CLI / automation)

This project can also create posts programmatically via Notion API.

Example (Node, from `extra-ellipse/`):

```bash
cd extra-ellipse
NOTION_API_KEY="$(launchctl getenv NOTION_API_KEY)" node - <<'NODE'
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = '301b5a28fc988125a53fc0781262e71c'.replace(/-/g,'');

const now = new Date();
const slug = `hello-${now.getTime()}`;

const page = await notion.pages.create({
  parent: { database_id: databaseId },
  properties: {
    Name: { title: [{ text: { content: 'Hello from API' } }] },
    Slug: { rich_text: [{ text: { content: slug } }] },
    Status: { select: { name: 'Draft' } },
    PublishedAt: { date: { start: now.toISOString() } },
    Excerpt: { rich_text: [{ text: { content: '' } }] },
    'SEO Title': { rich_text: [{ text: { content: '' } }] },
    'SEO Description': { rich_text: [{ text: { content: '' } }] },
    Featured: { checkbox: false },
  },
  children: [
    { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'Write here…' } }] } }
  ]
});

console.log(page.url);
NODE
```

---

## 6) Auto redeploy (every 15 minutes)

This repo includes a GitHub Actions workflow that triggers a **Vercel Deploy Hook** every 15 minutes, so Notion edits get picked up without manual deploys.

- Workflow: `.github/workflows/vercel-redeploy-every-15m.yml`
- Required GitHub secret: `VERCEL_DEPLOY_HOOK_URL`

### One-time setup

1) In Vercel project → **Settings → Git → Deploy Hooks** → create a hook (branch: `main`).
2) Copy the hook URL.
3) In GitHub repo → **Settings → Secrets and variables → Actions** → add repository secret:
   - Name: `VERCEL_DEPLOY_HOOK_URL`
   - Value: (the hook URL)
4) (Optional) GitHub repo → **Actions** → run the workflow once via **Run workflow** to verify.

Notes:
- GitHub schedule can drift by a few minutes; that’s normal.
- This does not update instantly; the expected freshness is **≤ 15 minutes**.

---

## 7) Updating site branding (favicon + header mark)

Current setup lives in:

- `extra-ellipse/public/favicon.ico`
- `extra-ellipse/public/favicon.svg`
- `extra-ellipse/src/components/Shell.astro` (header logo)

### Current brand assets

- Header logo:
  - `extra-ellipse/public/Blog-LOGO-removebg-preview.png`
- Browser tab icon:
  - `extra-ellipse/public/Blog-tab-icon.png`
- Source/backup image used for icon crop:
  - `extra-ellipse/public/Blog.backup-before-crop.png`

Icon and logo links are configured in:

- `extra-ellipse/src/components/Shell.astro`

---

## 8) Common issues / troubleshooting

### A) Build fails: `Missing required env var: NOTION_API_KEY`

Cause: the build process does not see the env var.

Fix: inject explicitly when building:

```bash
cd extra-ellipse
NOTION_API_KEY="$(launchctl getenv NOTION_API_KEY)" npm run build
```

(Or set it in your shell profile and restart the terminal.)

### B) Notion API returns “unauthorized” / empty results

Likely causes:

- Integration secret is wrong
- Integration is **not connected** to the Notion page / database

Fix: In Notion, open the parent page containing the database → **Connections** → add the integration.

### C) Post page 404

Check in Notion:

- `Status` must be `Published`
- `Slug` must be set, unique, and URL-safe

Then rebuild.

### D) Build is slow or flaky

Notion API calls happen at build time. If rate-limited, retry after a moment.

### E) `notion.databases.query is not a function`

Cause: newer Notion SDK versions moved query APIs toward `dataSources.query`.

Current code already handles both query styles in:

- `extra-ellipse/src/lib/notion.ts`

### F) `/blog/[slug]` opens slowly or times out on large pages

Cause: deeply nested/large Notion pages can trigger request timeout when fetching blocks.

Current mitigation in code:

- Increased client timeout (configurable via `NOTION_TIMEOUT_MS`)
- Retry wrapper for Notion API calls (`NOTION_RETRY_TIMES`)
- Limited-concurrency recursive child block fetching (`NOTION_CHILD_CONCURRENCY`)
- Max depth guard for recursive blocks (`NOTION_MAX_BLOCK_DEPTH`)

Optional local tuning in `.env`:

```bash
NOTION_TIMEOUT_MS=60000
NOTION_RETRY_TIMES=3
NOTION_CHILD_CONCURRENCY=8
```

---

## 9) Session updates (2026-02-24)

### Rendering + resilience
- Improved Notion data fetch resilience in `extra-ellipse/src/lib/notion.ts`:
  - retries for query/block APIs
  - configurable timeout and recursion constraints
  - safer child-block recursion under heavy pages

### Article table style (Notion-like wireframe)
- Updated table styles to a minimal line-grid style in:
  - `extra-ellipse/public/styles/global.css` (runtime source)
  - `extra-ellipse/src/styles/global.css` (kept in sync)
- Removed zebra/card-heavy visuals; kept thin borders and compact spacing.

### Post page right-side TOC
- Added right-side heading navigation on post pages:
  - file: `extra-ellipse/src/pages/blog/[slug].astro`
- TOC now:
  - extracts only `h1/h2/h3` headings
  - supports click jump + active-section sync
  - uses a Notion-style slim rail by default
  - shows expanded TOC panel on hover
  - hides rail while panel is shown; restores rail on mouse leave
  - includes hover bridge to prevent premature panel dismissal

---

## 10) Where to change key config

- `PLAN.md` is the canonical human-readable plan + schema reference.
- `extra-ellipse/.env` contains local defaults/mappings.
- Deployment (Cloudflare Pages/Vercel): set env vars there as well:
  - `NOTION_API_KEY`
  - `NOTION_DATABASE_ID`

---

## 10) Next steps (from PLAN)

See `PLAN.md` for the full milestone list. Short version:

- Featured strip (use `Featured` property) ✅
- Post page typography + previous/next
- RSS + sitemap
- Deploy (Cloudflare Pages or Vercel) ✅
- Optional: scheduled rebuild via GitHub Actions ✅

## 11) Recent Updates (2026-02-10)

- **Grid/List View Optimized**: Aligned with Claude Blog reference (cover images, consistent chips, compact list rows).
- **Multi-select Filters**: Replaced native select with custom multi-select dropdowns for Category/Tag (OR logic).
- **Unified UX**: Applied consistent styles and behavior across Home (`/`) and Blog (`/blog`) pages.

## 12) Recent Updates (2026-02-23)

- Added a real `About` page and wired nav route:
  - route: `/about`
  - page file: `extra-ellipse/src/pages/about.astro`
  - nav link update: `extra-ellipse/src/components/Shell.astro`
- Updated homepage hero copy:
  - title: `Becoming in Public`
  - subtitle: `Write to become. Build to be free.`
- Updated homepage topic entry links to:
  - `Becoming`
  - `Thinking Tools`
  - `Lived Experience`
  - `Quiet Essays`
- Updated branding assets:
  - header logo: `extra-ellipse/public/Blog-LOGO-removebg-preview.png`
  - browser tab icon: `extra-ellipse/public/Blog-tab-icon.png`
- Improved Notion rendering and data compatibility:
  - recursive block fetching (nested children)
  - renderer support for `toggle`, `callout`, `table`, `to_do`, nested list item children
  - compatibility for both `databases.query` (old) and `dataSources.query` (SDK v5+)
- Tag/Category filters remain dynamic from Notion published posts (frontend does not hardcode values).
