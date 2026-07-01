// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://my-blog-snowy-chi.vercel.app',
  integrations: [sitemap()],
});
