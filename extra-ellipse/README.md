# extra-ellipse (Astro Blog App)

Astro frontend for the `my-blog` repo, with Notion as CMS.

## Local dev

```bash
npm install
npm run dev
```

Default URL: `http://localhost:4321`

## Build

```bash
NOTION_API_KEY="..." NOTION_DATABASE_ID="..." npm run build
```

## Key files

- Layout + head (nav, logo, favicon): `src/components/Shell.astro`
- Homepage: `src/pages/index.astro`
- Blog list: `src/pages/blog/index.astro`
- Post page: `src/pages/blog/[slug].astro`
- About page: `src/pages/about.astro`
- Notion data layer: `src/lib/notion.ts`
- Notion renderer: `src/lib/renderNotion.ts`

## Current branding assets

- Header logo: `public/Blog-LOGO-removebg-preview.png`
- Tab icon: `public/Blog-tab-icon.png`
