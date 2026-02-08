# My Blog — Astro + Notion (extra-ellipse)

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
6. Rebuild/redeploy the site.

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

## 6) Updating site branding (favicon + header mark)

Current setup lives in:

- `extra-ellipse/public/favicon.ico`
- `extra-ellipse/public/favicon.svg`
- `extra-ellipse/src/components/Shell.astro` (header logo)

### Claude mark assets (current)

We currently use a Claude mark image for both:

- `extra-ellipse/public/claude-logo.png` (source)
- `extra-ellipse/public/claude-mark-28.png` (header-sized)
- `extra-ellipse/public/favicon-16.png`, `favicon-32.png`
- `extra-ellipse/public/favicon.ico` (generated)

If you swap `claude-logo.png`, regenerate the sizes:

```bash
cd extra-ellipse/public
sips -Z 32 claude-logo.png --out favicon-32.png
sips -Z 16 claude-logo.png --out favicon-16.png
sips -Z 28 claude-logo.png --out claude-mark-28.png

# (optional) regenerate favicon.ico (requires pillow)
/usr/bin/python3 -m pip install --user pillow
/usr/bin/python3 - <<'PY'
from PIL import Image
imgs=['favicon-16.png','favicon-32.png']
images=[Image.open(p) for p in imgs]
images[0].save('favicon.ico', format='ICO', sizes=[(16,16),(32,32)])
print('wrote favicon.ico')
PY
```

---

## 7) Common issues / troubleshooting

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

---

## 8) Where to change key config

- `PLAN.md` is the canonical human-readable plan + schema reference.
- `extra-ellipse/.env` contains local defaults/mappings.
- Deployment (Cloudflare Pages/Vercel): set env vars there as well:
  - `NOTION_API_KEY`
  - `NOTION_DATABASE_ID`

---

## 9) Next steps (from PLAN)

See `PLAN.md` for the full milestone list. Short version:

- Featured strip (use `Featured` property)
- Post page typography + previous/next
- RSS + sitemap
- Deploy (Cloudflare Pages or Vercel)
- Optional: scheduled rebuild via GitHub Actions
