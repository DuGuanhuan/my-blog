import type { APIContext } from 'astro';
import { listPosts } from '../lib/notion';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  priority: string;
  changefreq: string;
}

export async function GET(context: APIContext) {
  const site = context.site ?? new URL('https://guanhuan.top');
  const today = new Date().toISOString().split('T')[0];

  // 静态页面
  const staticUrls: SitemapEntry[] = [
    { loc: new URL('/', site).href, lastmod: today, priority: '1.0', changefreq: 'weekly' },
    { loc: new URL('/blog', site).href, lastmod: today, priority: '0.9', changefreq: 'weekly' },
    { loc: new URL('/blog/archive', site).href, lastmod: today, priority: '0.6', changefreq: 'weekly' },
    { loc: new URL('/about', site).href, lastmod: today, priority: '0.7', changefreq: 'monthly' },
    { loc: new URL('/subscribe', site).href, lastmod: today, priority: '0.7', changefreq: 'monthly' },
  ];

  // 从 Notion 获取所有已发布文章
  let postUrls: SitemapEntry[] = [];
  let tagUrls: SitemapEntry[] = [];
  try {
    const posts = await listPosts({ includeDrafts: false });
    postUrls = posts.map((p) => ({
      loc: new URL(`/blog/${p.slug}/`, site).href,
      lastmod: (p.publishedAt || today).split('T')[0],
      priority: '0.8',
      changefreq: 'monthly',
    }));

    // 标签页
    const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || [])));
    tagUrls = allTags.map((tag) => ({
      loc: new URL(`/blog/tag/${encodeURIComponent(tag)}`, site).href,
      lastmod: today,
      priority: '0.5',
      changefreq: 'weekly',
    }));
  } catch {
    // 构建时如果 Notion 不可用，只输出静态页面
  }

  const allUrls = [...staticUrls, ...postUrls, ...tagUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
