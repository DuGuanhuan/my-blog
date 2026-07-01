# SEO 基础设施 + RSS 实现计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 让博客被搜索引擎正确收录、社交分享时有预览卡片、提供 RSS 订阅源。

**Architecture:** 在 Astro 静态构建层完成所有 SEO 输出——Shell 组件统一渲染 meta 标签，@astrojs/sitemap 自动生成站点地图，@astrojs/rss 生成 RSS feed，文章页加 JSON-LD 结构化数据。零运行时成本，构建时一次性产出。

**Tech Stack:** Astro 5、@astrojs/sitemap、@astrojs/rss、Notion CMS（现有）

**Site URL:** `https://my-blog-snowy-chi.vercel.app`（后续换自定义域名时只需改 astro.config.ts 一处）

---

## Task 1: 安装依赖 + 配置 astro.config.ts

**Objective:** 安装 sitemap 和 RSS 集成，配置 site URL（canonical、sitemap、RSS 都依赖这个）。

**Files:**
- Modify: `extra-ellipse/astro.config.ts`
- Modify: `extra-ellipse/package.json`（通过 npm 安装自动更新）

**Step 1: 安装依赖**

```bash
cd extra-ellipse
npm install @astrojs/sitemap @astrojs/rss
```

**Step 2: 修改 astro.config.ts**

将空配置替换为：

```ts
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://my-blog-snowy-chi.vercel.app',
  integrations: [sitemap()],
});
```

**Step 3: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功，`dist/` 目录下出现 `sitemap-index.xml` 和 `sitemap-0.xml`。

**Step 4: Commit**

```bash
git add extra-ellipse/astro.config.ts extra-ellipse/package.json extra-ellipse/package-lock.json
git commit -m "feat: add site URL and sitemap integration"
```

---

## Task 2: 增强 Shell.astro — 统一 SEO meta 标签

**Objective:** 让所有页面通过 Shell 组件自动输出 Open Graph、Twitter Card、canonical 标签。

**Files:**
- Modify: `extra-ellipse/src/components/Shell.astro`

**Step 1: 重写 Shell.astro 的 head 部分**

将整个文件替换为：

```astro
---
const {
  title = 'Blog',
  description = '一个安静的角落，记录成长、思考工具，以及真实生活的片刻。',
  image,
  type = 'website',
} = Astro.props;

const site = Astro.site ?? new URL('https://my-blog-snowy-chi.vercel.app');
const canonical = new URL(Astro.url.pathname, site);
const ogImage = image
  ? (image.startsWith('http') ? image : new URL(image, site).href)
  : new URL('/Blog-LOGO-removebg-preview.png', site).href;
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <meta name="description" content={description} />

    <!-- Canonical -->
    <link rel="canonical" href={canonical} />

    <!-- Open Graph -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={type} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:site_name" content="Plan B Blog" />
    <meta property="og:locale" content="zh_CN" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImage} />

    <link rel="icon" type="image/png" href="/Blog-tab-icon.png" />
    <link rel="shortcut icon" type="image/png" href="/Blog-tab-icon.png" />
    <link rel="apple-touch-icon" href="/Blog-tab-icon.png" />
    <!-- NOTE: Avoid Google Fonts in China mainland networks (often blocked/slow).
         Use system fonts or self-hosted fonts instead. -->
    <link rel="stylesheet" href="/styles/global.css" />

    <!-- RSS -->
    <link rel="alternate" type="application/rss+xml" title="Plan B Blog" href="/rss.xml" />
  </head>
  <body>
    <header>
      <div class="wrap">
        <div class="nav">
          <nav class="navlinks" aria-label="站点导航">
            <a href="/blog">Blog</a>
            <a href="/about">About</a>
            <span style="display:inline-flex; gap:10px; align-items:center;">
              <a class="btn primary" href="/subscribe">Subscribe</a>
            </span>
          </nav>
        </div>
      </div>
    </header>

    <main class="wrap">
      <slot />
      <footer>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <div>&copy; {new Date().getFullYear()} Plan B Blog</div>
            <div style="font-size: 12px; color: rgba(17,17,17,.52); margin-top: 2px;">Astro · Notion CMS · Claude Blog–inspired</div>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <a href="/blog">Blog</a>
            <span aria-hidden="true" style="opacity:.45;">·</span>
            <a href="/">Home</a>
            <span aria-hidden="true" style="opacity:.45;">·</span>
            <a href="/rss.xml">RSS</a>
          </div>
        </div>
      </footer>
    </main>
  </body>
</html>
```

**关键变更点：**
- 新增 props: `image`（OG 图片）、`type`（og:type，文章页用 `article`）
- 默认 description: 站点级描述
- 默认 OG image: 复用现有 logo `/Blog-LOGO-removebg-preview.png`
- 所有 URL 通过 `Astro.site` 拼接绝对路径
- Footer 品牌名从 `My Blog` 改为 `Plan B Blog`
- Footer 加 RSS 链接
- head 加 RSS `<link rel="alternate">`

**Step 2: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功，无报错。

**Step 3: Commit**

```bash
git add extra-ellipse/src/components/Shell.astro
git commit -m "feat: add OG/Twitter/canononical meta tags to Shell"
```

---

## Task 3: 创建 robots.txt

**Objective:** 告诉搜索引擎可以抓取所有页面，并指向 sitemap。

**Files:**
- Create: `extra-ellipse/public/robots.txt`

**Step 1: 创建 robots.txt**

```
User-agent: *
Allow: /

Sitemap: https://my-blog-snowy-chi.vercel.app/sitemap-index.xml
```

**Step 2: 验证**

```bash
cat extra-ellipse/public/robots.txt
```

Expected: 文件内容如上。

**Step 3: Commit**

```bash
git add extra-ellipse/public/robots.txt
git commit -m "feat: add robots.txt with sitemap reference"
```

---

## Task 4: 创建 RSS Feed 端点

**Objective:** 生成 `/rss.xml`，读者可以用 RSS 阅读器订阅。

**Files:**
- Create: `extra-ellipse/src/pages/rss.xml.ts`

**Step 1: 创建 RSS 端点**

```ts
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
```

**Step 2: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功，`dist/rss.xml` 存在。

```bash
head -20 extra-ellipse/dist/rss.xml
```

Expected: 看到 XML 格式的 RSS feed，包含 `<rss>` 根元素和文章条目。

**Step 3: Commit**

```bash
git add extra-ellipse/src/pages/rss.xml.ts
git commit -m "feat: add RSS feed endpoint"
```

---

## Task 5: 文章页加 JSON-LD 结构化数据 + 传 SEO props

**Objective:** 文章页输出 `BlogPosting` JSON-LD，帮助 Google 理解文章结构；同时把文章的 cover/excerpt 传给 Shell 做 OG。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro`

**Step 1: 修改 [slug].astro 的 frontmatter 和 Shell 调用**

在现有 frontmatter 之后（第 22 行附近），Shell 组件调用处修改为：

```astro
<Shell
  title={title}
  description={description}
  image={post.cover}
  type="article"
>
```

**Step 2: 在 `<article>` 标签前添加 JSON-LD script**

在 `</aside>` 之后、`<article class="post">` 之前插入：

```astro
<script type="application/ld+json" set:html={JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt || description,
  datePublished: post.publishedAt,
  image: post.cover ? [post.cover] : undefined,
  author: {
    '@type': 'Person',
    name: 'DuGuanhuan',
    url: 'https://my-blog-snowy-chi.vercel.app/about'
  },
  publisher: {
    '@type': 'Person',
    name: 'DuGuanhuan',
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': new URL(Astro.url.pathname, Astro.site).href
  },
  keywords: (post.tags || []).join(', '),
})} />
```

**Step 3: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功。检查输出 HTML 包含 JSON-LD：

```bash
grep -l "BlogPosting" extra-ellipse/dist/blog/*/index.html | head -3
```

Expected: 至少一个文件匹配。

**Step 4: Commit**

```bash
git add extra-ellipse/src/pages/blog/[slug].astro
git commit -m "feat: add BlogPosting JSON-LD and article OG tags"
```

---

## Task 6: 补充页面 meta description + 传 image

**Objective:** 首页、博客列表页、About 页、Subscribe 页都传 description 给 Shell。文章列表卡片图也传给 OG。

**Files:**
- Modify: `extra-ellipse/src/pages/index.astro`（第 13 行 Shell 调用）
- Modify: `extra-ellipse/src/pages/blog/index.astro`（第 11 行 Shell 调用）
- Modify: `extra-ellipse/src/pages/about.astro`（第 5 行 Shell 调用，已有 description）
- Modify: `extra-ellipse/src/pages/subscribe.astro`（第 5 行 Shell 调用，已有 description）

**Step 1: 修改 index.astro 的 Shell 调用**

```astro
<Shell
  title="Plan B Blog — Becoming in Public"
  description="记录成长、思考工具，以及真实生活的片刻。一个从 Notion 到 Astro 的公开蜕变实验场。"
>
```

**Step 2: 修改 blog/index.astro 的 Shell 调用**

```astro
<Shell
  title="Blog — Plan B"
  description="所有文章，涵盖 Becoming、Thinking Tools、Lived Experience 与 Quiet Essays 四个主题。"
>
```

**Step 3: About 和 Subscribe 页已有 description，无需改动**

About: `description="About this blog and the person behind it."` — 够用。
Subscribe: `description="Subscribe to new essays from this blog."` — 够用。

**Step 4: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功。

**Step 5: Commit**

```bash
git add extra-ellipse/src/pages/index.astro extra-ellipse/src/pages/blog/index.astro
git commit -m "feat: add meta descriptions for home and blog list pages"
```

---

## Task 7: 订阅页接入 RSS

**Objective:** subscribe.astro 从占位变成可用——展示 RSS 订阅链接，告诉读者怎么用。

**Files:**
- Modify: `extra-ellipse/src/pages/subscribe.astro`

**Step 1: 更新 subscribe.astro**

```astro
---
import Shell from '../components/Shell.astro';
---
<Shell title="Subscribe" description="订阅 Plan B Blog，获取新文章更新。">
  <section class="post subscribe-page">
    <style>
      .subscribe-page {
        max-width: 680px;
        margin: 0 auto;
      }
      .subscribe-page h1 {
        margin-bottom: 14px;
      }
      .subscribe-copy {
        font-family: var(--serif);
        font-size: 18px;
        line-height: 1.85;
        color: rgba(17,17,17,.78);
      }
      .subscribe-copy p {
        margin-bottom: 1.5em;
      }
      .subscribe-option {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 20px;
        border: 1px solid rgba(17,17,17,.12);
        border-radius: 14px;
        background: rgba(255,255,255,.70);
        margin-bottom: 14px;
        transition: background .16s ease;
      }
      .subscribe-option:hover {
        background: rgba(255,255,255,.86);
      }
      .subscribe-option-icon {
        font-size: 24px;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .subscribe-option h3 {
        margin: 0 0 6px;
        font-family: var(--serif);
        font-size: 18px;
        font-weight: 700;
      }
      .subscribe-option p {
        margin: 0 0 10px;
        font-family: var(--sans);
        font-size: 14px;
        line-height: 1.7;
        color: rgba(17,17,17,.66);
      }
      .subscribe-option a {
        font-size: 13px;
        font-weight: 600;
        color: rgba(17,17,17,.86);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .subscribe-actions {
        margin-top: 30px;
      }
    </style>

    <h1>Subscribe</h1>
    <div class="subscribe-copy">
      <p>
        想第一时间看到新文章？可以通过以下方式订阅。
      </p>
    </div>

    <div class="subscribe-option">
      <span class="subscribe-option-icon">📡</span>
      <div>
        <h3>RSS Feed</h3>
        <p>用 RSS 阅读器（如 NetNewsWire、Feedly、Inoreader）订阅，新文章自动推送。</p>
        <a href="/rss.xml">复制 RSS 地址 →</a>
      </div>
    </div>

    <div class="subscribe-option">
      <span class="subscribe-option-icon">📧</span>
      <div>
        <h3>邮件订阅</h3>
        <p>邮件订阅服务即将上线。在此之前，可以通过 RSS 或小红书关注获取更新。</p>
      </div>
    </div>

    <div class="subscribe-actions">
      <a class="btn primary" href="/blog">Browse Blog</a>
    </div>
  </section>
</Shell>
```

**Step 2: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功。

**Step 3: Commit**

```bash
git add extra-ellipse/src/pages/subscribe.astro
git commit -m "feat: subscribe page with RSS option"
```

---

## Task 8: 全量构建验证 + 推送

**Objective:** 确认所有功能一起工作，推送到远程触发 Vercel 部署。

**Step 1: 完整构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建成功，无 error。

**Step 2: 检查产出物**

```bash
echo "=== SITEMAP ===" && ls -la dist/sitemap-*.xml
echo "=== RSS ===" && ls -la dist/rss.xml
echo "=== ROBOTS ===" && ls -la dist/robots.txt
echo "=== JSON-LD ===" && grep -rl "BlogPosting" dist/blog/ | head -3
```

Expected: 全部存在。

**Step 3: 抽检 HTML meta 标签**

```bash
# 首页应该有 og:title
grep 'og:title' dist/index.html | head -1
# 文章页应该有 og:type=article 和 JSON-LD
grep 'og:type.*article' dist/blog/*/index.html | head -1
```

Expected: 都有匹配。

**Step 4: 推送**

```bash
git push origin main
```

Expected: 推送成功，Vercel 自动触发构建（或等 15 分钟 GitHub Action 触发）。

**Step 5: 线上验证（部署完成后）**

```bash
# 通过代理访问
PROXY="http://127.0.0.1:7890"

# robots.txt
curl -x $PROXY -s https://my-blog-snowy-chi.vercel.app/robots.txt

# sitemap
curl -x $PROXY -s https://my-blog-snowy-chi.vercel.app/sitemap-index.xml

# RSS
curl -x $PROXY -s https://my-blog-snowy-chi.vercel.app/rss.xml | head -30

# OG tags in homepage
curl -x $PROXY -s https://my-blog-snowy-chi.vercel.app | grep 'og:title'
```

Expected: 全部返回正确内容。

---

## 验收清单

- [ ] `robots.txt` 可访问，指向 sitemap
- [ ] `sitemap-index.xml` 可访问，包含所有页面 URL
- [ ] `rss.xml` 可访问，包含所有已发布文章
- [ ] 首页 HTML 包含 og:title、og:description、og:image、twitter:card
- [ ] 文章页 HTML 包含 og:type=article、JSON-LD BlogPosting
- [ ] 博客列表页有 meta description
- [ ] Footer 有 RSS 链接
- [ ] Subscribe 页有 RSS 订阅入口
- [ ] canonical URL 正确指向站点域名

## 后续可选（不在本次范围）

- 自定义域名（改 astro.config.ts 的 site 即可，Vercel 绑域名）
- Email 订阅（接入 Buttondown / Resend）
- 代码语法高亮（Shiki）
- 暗色模式
- 文章页封面图展示
