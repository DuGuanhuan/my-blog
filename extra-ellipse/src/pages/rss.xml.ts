import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { listPosts } from '../lib/notion';

export async function GET(context: APIContext) {
  const posts = await listPosts({ includeDrafts: false });

  return rss({
    title: 'Plan B Blog',
    description: '一个安静的角落，记录成长、思考工具，以及真实生活的片刻。',
    site: context.site ?? 'https://my-blog-snowy-chi.vercel.app',
    items: posts.map((p) => ({
      title: p.title,
      pubDate: p.publishedAt ? new Date(p.publishedAt) : new Date(),
      description: p.excerpt || '',
      link: `/blog/${p.slug}/`,
      categories: p.tags || [],
    })),
    customData: `<language>zh-cn</language>`,
  });
}
