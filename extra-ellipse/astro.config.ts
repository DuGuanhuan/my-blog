// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// sitemap via src/pages/sitemap.xml.ts endpoint (more reliable than @astrojs/sitemap on Vercel)
export default defineConfig({
  site: 'https://guanhuan.top',
});
