# Blog 功能建设计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 提升博客的读者体验和信息架构——阅读时间、上下篇导航、代码高亮、暗色模式、标签页、归档页、导航首页链接、邮件订阅、About 联系方式。

**Architecture:** 所有功能在 Astro 静态构建层完成。阅读时间和上下篇在 `getStaticPaths` 阶段计算；代码高亮用 Astro 内置 Shiki；暗色模式用 CSS `prefers-color-scheme` + 手动 toggle；标签页和归档页是新的静态路由；邮件订阅用 Buttondown 嵌入表单。

**Tech Stack:** Astro 5、Notion CMS、Shiki（Astro 内置）、Buttondown（邮件订阅）

**Site URL:** `https://guanhuan.top`

**Key Files:**
- `extra-ellipse/src/lib/notion.ts` — Post 类型定义、listPosts、getPostBySlug、listBlocks
- `extra-ellipse/src/lib/renderNotion.ts` — Notion blocks → HTML 渲染
- `extra-ellipse/src/components/Shell.astro` — 全局 layout，meta 标签输出
- `extra-ellipse/src/pages/blog/[slug].astro` — 文章页
- `extra-ellipse/src/pages/blog/index.astro` — 博客列表页
- `extra-ellipse/src/pages/index.astro` — 首页
- `extra-ellipse/src/pages/about.astro` — About 页
- `extra-ellipse/src/pages/subscribe.astro` — 订阅页
- `extra-ellipse/public/styles/global.css` — 全局样式，CSS 变量定义

**Post 数据结构（notion.ts:23-36）:**
```ts
type Post = {
  id: string;
  title: string;
  slug: string;
  status: 'Draft' | 'Published' | string;
  publishedAt?: string;
  excerpt?: string;
  category?: string;
  tags: string[];
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  cover?: string;
};
```

**CSS 变量（global.css:7-21）:**
```css
--paper:#f6f3ed; --ink:#111; --muted:rgba(17,17,17,.66);
--surface:rgba(255,255,255,.65); --line:rgba(17,17,17,.10);
--sans: ui-sans-serif, system-ui, ...; --serif: ui-serif, "Songti SC", ...;
```

---

## Phase 1: 文章页体验增强（P1）

### Task 1: 阅读时间估算

**Objective:** 文章页 meta 区域显示预估阅读时间（如"约 8 分钟"）。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro` (frontmatter + meta 区域)

**Step 1: 在 [slug].astro frontmatter 中计算阅读时间**

在 `const html = renderBlocksToHtml(blocks as any);` 之后（第 18 行后）添加：

```ts
// 阅读时间估算：中文 300 字/分钟，英文 200 词/分钟，取加权平均
function estimateReadingTime(html: string): number {
  // 移除 HTML 标签，保留纯文本
  const text = html.replace(/<[^>]+>/g, '');
  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词数
  const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, '').match(/\b\w+\b/g) || []).length;
  // 加权：中文 300 字/分钟，英文 200 词/分钟
  const minutes = Math.ceil(chineseChars / 300 + englishWords / 200);
  return Math.max(1, minutes);
}

const readingTime = estimateReadingTime(html);
```

**Step 2: 在 meta 区域显示阅读时间**

找到文章页 meta div（约第 269-273 行）：

```astro
<div class="meta" style="color: rgba(17,17,17,0.5); font-size: 14px;">
  <span>{post.publishedAt ?? ''}</span>
  {post.category ? <span aria-hidden="true" style="opacity:.5"> · </span> : null}
  {post.category ? <span>{post.category}</span> : null}
</div>
```

改为：

```astro
<div class="meta" style="color: rgba(17,17,17,0.5); font-size: 14px;">
  <span>{post.publishedAt ?? ''}</span>
  {post.category ? <span aria-hidden="true" style="opacity:.5"> · </span> : null}
  {post.category ? <span>{post.category}</span> : null}
  <span aria-hidden="true" style="opacity:.5"> · </span>
  <span>约 {readingTime} 分钟</span>
</div>
```

**Step 3: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建在 Notion auth 处失败（本地无 key），但无语法错误。

**Step 4: Commit**

```bash
git add extra-ellipse/src/pages/blog/[slug].astro
git commit -m "feat: add reading time estimate to article pages"
```

---

### Task 2: 上一篇/下一篇导航

**Objective:** 文章底部"Back to Blog"区域增加上一篇/下一篇链接，提高页面间跳转率。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro` (frontmatter + 底部导航区域)

**Step 1: 在 getStaticPaths 中获取所有文章并传递相邻文章**

将 `getStaticPaths` 改为：

```ts
export async function getStaticPaths() {
  const posts = await listPosts({ includeDrafts: false });
  // posts 已按 PublishedAt 降序排列（notion.ts:225）
  return posts.map((p, i) => ({
    params: { slug: p.slug },
    props: {
      prev: posts[i + 1] || null,  // 更旧的一篇
      next: posts[i - 1] || null,  // 更新的一篇
    },
  }));
}
```

**Step 2: 在 frontmatter 中接收 props**

在 `const { slug } = Astro.params;` 之后添加：

```ts
const { prev, next } = Astro.props;
```

**Step 3: 替换底部导航区域**

找到文章底部区域（约第 278-280 行）：

```astro
<div style="margin-top: 60px; padding-top: 24px; border-top: 1px solid rgba(17,17,17,.10);">
  <a class="btn" href="/blog" style="color: rgba(17,17,17,0.6);">← Back to Blog</a>
</div>
```

替换为：

```astro
<div style="margin-top: 60px; padding-top: 24px; border-top: 1px solid rgba(17,17,17,.10);">
  <div style="display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;">
    {prev ? (
      <a href={`/blog/${prev.slug}`} style="text-decoration: none; flex: 1; min-width: 200px;">
        <div style="font-size: 12px; color: rgba(17,17,17,.48); margin-bottom: 4px;">← 上一篇</div>
        <div style="font-family: var(--serif); font-size: 16px; color: rgba(17,17,17,.82); font-weight: 600;">{prev.title}</div>
      </a>
    ) : <div style="flex: 1; min-width: 200px;"></div>}
    {next ? (
      <a href={`/blog/${next.slug}`} style="text-decoration: none; flex: 1; min-width: 200px; text-align: right;">
        <div style="font-size: 12px; color: rgba(17,17,17,.48); margin-bottom: 4px;">下一篇 →</div>
        <div style="font-family: var(--serif); font-size: 16px; color: rgba(17,17,17,.82); font-weight: 600;">{next.title}</div>
      </a>
    ) : <div style="flex: 1; min-width: 200px;"></div>}
  </div>
  <a class="btn" href="/blog" style="color: rgba(17,17,17,0.6);">← Back to Blog</a>
</div>
```

**Step 4: 验证构建**

```bash
cd extra-ellipse && npm run build
```

Expected: 构建在 Notion auth 处失败，无语法错误。

**Step 5: Commit**

```bash
git add extra-ellipse/src/pages/blog/[slug].astro
git commit -m "feat: add prev/next navigation to article pages"
```

---

### Task 3: 代码语法高亮（Shiki）

**Objective:** 技术类文章的代码块有语法高亮，提升可读性。

**Files:**
- Modify: `extra-ellipse/astro.config.ts`
- Modify: `extra-ellipse/src/lib/renderNotion.ts` (code block 渲染)

**Step 1: 在 astro.config.ts 中配置 Shiki**

```ts
// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://guanhuan.top',
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
```

**Step 2: 检查 renderNotion.ts 的 code block 输出**

当前 `renderNotion.ts` 第 115-118 行输出：
```ts
case 'code': {
  const v = block as any;
  const lang = v.code?.language || 'plain';
  const code = esc((v.rich_text || []).map((t: any) => t.plain_text || '').join(''));
  return `<pre><code data-language="${lang}">${code}</code></pre>`;
}
```

Shiki 在 Markdown 构建阶段生效，但 Notion blocks 是手动渲染的，Shiki 不会自动处理。需要用 Astro 的 `codeToHtml` 在构建时手动高亮。

**注意：** 这一步需要额外研究 `shiki` 包的 API 在 Astro 构建中的使用方式。可能需要在 `renderNotion.ts` 中 import `shiki` 并调用 `codeToHtml`。由于 `renderNotion.ts` 是纯函数渲染 HTML 字符串，需要改为 async 或在构建时预处理。

**替代方案（更简单）：** 使用 Prism.js 客户端高亮。在 Shell.astro 中加载 Prism CSS + JS，code block 的 `data-language` 属性已就绪，Prism 会自动高亮。

**推荐替代方案步骤：**

在 `Shell.astro` 的 `<head>` 中，`</head>` 之前添加：

```html
<!-- Prism.js for client-side code highlighting -->
<link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js" is:inline></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js" is:inline></script>
```

然后在 `renderNotion.ts` 的 code block 输出中，把 `data-language` 改为 `class="language-${lang}"`：

```ts
case 'code': {
  const v = block as any;
  const lang = v.code?.language || 'plain';
  const code = esc((v.rich_text || []).map((t: any) => t.plain_text || '').join(''));
  return `<pre class="language-${lang}"><code class="language-${lang}">${code}</code></pre>`;
}
```

**Step 3: 验证构建**

```bash
cd extra-ellipse && npm run build
```

**Step 4: Commit**

```bash
git add extra-ellipse/astro.config.ts extra-ellipse/src/components/Shell.astro extra-ellipse/src/lib/renderNotion.ts
git commit -m "feat: add Prism.js code syntax highlighting"
```

---

### Task 4: 邮件订阅（Buttondown 嵌入）

**Objective:** subscribe 页面从"即将上线"变成可用的邮件订阅入口。

**Prerequisite:** 用户需要先在 https://buttondown.email 注册账号，获取 newsletter URL（类似 `https://buttondown.email/api/emails/embed-subscribe/yournewsletter`）。

**Files:**
- Modify: `extra-ellipse/src/pages/subscribe.astro`

**Step 1: 替换邮件订阅区块**

找到 subscribe.astro 中的邮件订阅占位区块（第 84-90 行）：

```astro
<div class="subscribe-option">
  <span class="subscribe-option-icon">📧</span>
  <div>
    <h3>邮件订阅</h3>
    <p>邮件订阅服务即将上线。在此之前，可以通过 RSS 或小红书关注获取更新。</p>
  </div>
</div>
```

替换为 Buttondown 嵌入表单：

```astro
<div class="subscribe-option">
  <span class="subscribe-option-icon">📧</span>
  <div>
    <h3>邮件订阅</h3>
    <p>输入邮箱地址，新文章会自动发送到你的邮箱。通过 Buttondown 提供，随时可退订。</p>
    <form
      action="https://buttondown.email/api/emails/embed-subscribe/PLANBNEWSLETTER"
      method="post"
      target="popupwindow"
      onsubmit="window.open('https://buttondown.email/PLANBNEWSLETTER', 'popupwindow', 'scrollbars=yes,width=600,height=600'); return true;"
      style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;"
    >
      <input
        type="email"
        name="email"
        placeholder="your@email.com"
        required
        style="flex: 1; min-width: 200px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(17,17,17,.14); font-size: 14px; background: rgba(255,255,255,.80);"
      />
      <input type="hidden" value="1" name="embed" />
      <button
        type="submit"
        class="btn primary"
        style="white-space: nowrap;"
      >订阅</button>
    </form>
  </div>
</div>
```

**注意：** `PLANBNEWSLETTER` 是占位符，需要用户注册 Buttondown 后替换为实际的 newsletter 名称。

**Step 2: 验证构建**

```bash
cd extra-ellipse && npm run build
```

**Step 3: Commit**

```bash
git add extra-ellipse/src/pages/subscribe.astro
git commit -m "feat: add Buttondown email subscription form"
```

---

## Phase 2: 暗色模式（P2）

### Task 5: CSS 暗色模式变量

**Objective:** 通过 `prefers-color-scheme` 自动适配系统暗色模式，并提供手动 toggle。

**Files:**
- Modify: `extra-ellipse/public/styles/global.css` (添加暗色变量)
- Modify: `extra-ellipse/src/components/Shell.astro` (添加 toggle 按钮 + 主题切换脚本)

**Step 1: 在 global.css 的 `:root` 之后添加暗色模式变量**

在 `:root { ... }` 块之后添加：

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #1a1816;
    --paper2: #15130f;
    --ink: #e8e4dc;
    --muted: rgba(232,228,220,.66);
    --soft: rgba(232,228,220,.52);
    --line: rgba(232,228,220,.12);
    --line2: rgba(232,228,220,.16);
    --surface: rgba(40,38,35,.65);
    --surface2: rgba(50,48,45,.82);
    --accent: #e8e4dc;
  }
}

:root[data-theme="dark"] {
  --paper: #1a1816;
  --paper2: #15130f;
  --ink: #e8e4dc;
  --muted: rgba(232,228,220,.66);
  --soft: rgba(232,228,220,.52);
  --line: rgba(232,228,220,.12);
  --line2: rgba(232,228,220,.16);
  --surface: rgba(40,38,35,.65);
  --surface2: rgba(50,48,45,.82);
  --accent: #e8e4dc;
}
```

**Step 2: 在 global.css 末尾添加暗色模式适配规则**

现有组件中大量使用了硬编码的 `rgba(17,17,17,...)` 而非 CSS 变量。需要在暗色模式下覆盖这些。在 global.css 末尾添加：

```css
/* === Dark Mode Overrides === */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) body {
    background: var(--paper);
    color: var(--ink);
  }
  :root:not([data-theme="light"]) .card,
  :root:not([data-theme="light"]) .list-row {
    background: var(--surface) !important;
    border-color: var(--line) !important;
  }
  :root:not([data-theme="light"]) .card:hover,
  :root:not([data-theme="light"]) .list-row:hover {
    background: var(--surface2) !important;
  }
  :root:not([data-theme="light"]) .post .content {
    color: rgba(232,228,220,.88);
  }
  :root:not([data-theme="light"]) .content blockquote {
    color: rgba(232,228,220,.72);
    background: rgba(232,91,43,.04);
    border-left-color: rgba(232,91,43,.7);
  }
  :root:not([data-theme="light"]) .content img {
    border-color: rgba(232,228,220,.10);
  }
}

:root[data-theme="dark"] body {
  background: var(--paper);
  color: var(--ink);
}
:root[data-theme="dark"] .card,
:root[data-theme="dark"] .list-row {
  background: var(--surface) !important;
  border-color: var(--line) !important;
}
:root[data-theme="dark"] .card:hover,
:root[data-theme="dark"] .list-row:hover {
  background: var(--surface2) !important;
}
:root[data-theme="dark"] .post .content {
  color: rgba(232,228,220,.88);
}
:root[data-theme="dark"] .content blockquote {
  color: rgba(232,228,220,.72);
  background: rgba(232,91,43,.04);
  border-left-color: rgba(232,91,43,.7);
}
:root[data-theme="dark"] .content img {
  border-color: rgba(232,228,220,.10);
}
```

**注意：** 因为大量内联样式用了 `rgba(17,17,17,...)`，完全覆盖暗色模式需要逐个处理。这里只覆盖最关键的元素（body、card、content、blockquote、img）。后续可以逐步将内联样式迁移到 CSS 变量。

**Step 3: 在 Shell.astro 导航栏添加主题 toggle 按钮**

在 Shell.astro 的 `<nav class="navlinks">` 中，Subscribe 按钮之后添加：

```astro
<button
  type="button"
  id="theme-toggle"
  aria-label="Toggle theme"
  style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: .6; transition: opacity .15s;"
  title="切换明暗主题"
>
  <span class="theme-icon-light">☀️</span>
  <span class="theme-icon-dark" style="display:none;">🌙</span>
</button>
```

**Step 4: 在 Shell.astro `</body>` 之前添加主题切换脚本**

```html
<script is:inline>
  (() => {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const lightIcon = toggle.querySelector('.theme-icon-light');
    const darkIcon = toggle.querySelector('.theme-icon-dark');

    function updateIcon() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        || (document.documentElement.getAttribute('data-theme') !== 'light'
            && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (lightIcon) lightIcon.style.display = isDark ? 'none' : '';
      if (darkIcon) darkIcon.style.display = isDark ? '' : 'none';
    }

    // 初始化：读取 localStorage
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
    updateIcon();

    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        || (document.documentElement.getAttribute('data-theme') !== 'light'
            && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateIcon();
    });

    // 系统主题变化时更新图标
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateIcon);
  })();
</script>
```

**Step 5: 验证构建**

```bash
cd extra-ellipse && npm run build
```

**Step 6: Commit**

```bash
git add extra-ellipse/public/styles/global.css extra-ellipse/src/components/Shell.astro
git commit -m "feat: add dark mode with system preference and manual toggle"
```

---

## Phase 3: 信息架构（P3）

### Task 6: 标签页路由 `/blog/tag/[tag]`

**Objective:** 读者可以按标签浏览文章，如 `guanhuan.top/blog/tag/工作`。

**Files:**
- Create: `extra-ellipse/src/pages/blog/tag/[tag].astro`

**Step 1: 创建标签页路由**

```astro
---
import Shell from '../../../components/Shell.astro';
import { listPosts } from '../../../lib/notion';

export async function getStaticPaths() {
  const posts = await listPosts({ includeDrafts: false });
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || [])));
  return allTags.map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts.filter((p) => p.tags?.includes(tag)),
    },
  }));
}

const { tag, posts } = Astro.props;
const title = `${tag} — Plan B Blog`;
const description = `标签「${tag}」下的所有文章。`;
---

<Shell title={title} description={description}>
  <section class="post" style="max-width: 760px; margin: 0 auto; padding: 40px 0 80px;">
    <div style="margin-bottom: 32px;">
      <a href="/blog" style="color: rgba(17,17,17,.5); font-size: 14px; text-decoration: none;">← Blog</a>
      <h1 style="font-family: var(--serif); font-size: 32px; margin: 12px 0 8px;">#{tag}</h1>
      <p style="color: rgba(17,17,17,.6); font-size: 14px;">{posts.length} 篇文章</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 20px;">
      {posts.map((p) => (
        <a href={`/blog/${p.slug}`} style="text-decoration: none; display: block; padding: 18px 20px; border: 1px solid rgba(17,17,17,.12); border-radius: 14px; background: rgba(255,255,255,.70); transition: background .16s ease;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <h3 style="margin: 0; font-family: var(--serif); font-size: 18px; color: rgba(17,17,17,.92); font-weight: 700;">{p.title}</h3>
            <span style="color: rgba(17,17,17,.48); font-size: 12.5px;">{p.publishedAt ?? ''}</span>
          </div>
          {p.excerpt && <p style="margin: 8px 0 0; color: rgba(17,17,17,.66); font-family: var(--serif); font-size: 14px; line-height: 1.7;">{p.excerpt}</p>}
        </a>
      ))}
    </div>
  </section>
</Shell>
```

**Step 2: 在博客列表页和文章页的标签 chip 上加链接**

在 `blog/index.astro` 的 `row()` 函数中（约第 500 行），标签 chip 改为：

```js
${tags.length ? `<div style="margin-top: 12px; display:flex; gap:8px; flex-wrap:wrap;">${tags.map(t=>`<a href="/blog/tag/${t}" class="chip" style="text-decoration:none;">${t}</a>`).join('')}</div>` : ''}
```

在 `blog/[slug].astro` 的 meta 区域，如果有 tags 显示为可点击 chip：

在 meta div 下方添加（post-header 内）：

```astro
{post.tags && post.tags.length > 0 && (
  <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
    {post.tags.map((t) => (
      <a href={`/blog/tag/${t}`} class="chip" style="text-decoration: none;">{t}</a>
    ))}
  </div>
)}
```

**Step 3: 验证构建**

```bash
cd extra-ellipse && npm run build
```

**Step 4: Commit**

```bash
git add extra-ellipse/src/pages/blog/tag/[tag].astro extra-ellipse/src/pages/blog/index.astro extra-ellipse/src/pages/blog/[slug].astro
git commit -m "feat: add tag pages and clickable tag chips"
```

---

### Task 7: 归档页 `/blog/archive`

**Objective:** 按时间线展示所有文章，提供另一个浏览维度。

**Files:**
- Create: `extra-ellipse/src/pages/blog/archive.astro`

**Step 1: 创建归档页**

```astro
---
import Shell from '../../components/Shell.astro';
import { listPosts } from '../../lib/notion';

const posts = await listPosts({ includeDrafts: false });

// 按年份分组
const byYear = new Map<string, typeof posts>();
for (const p of posts) {
  const year = p.publishedAt ? new Date(p.publishedAt).getFullYear().toString() : '未知';
  if (!byYear.has(year)) byYear.set(year, []);
  byYear.get(year)!.push(p);
}

const years = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a));
---

<Shell title="Archive — Plan B Blog" description="所有文章按时间线排列。">
  <section class="post" style="max-width: 760px; margin: 0 auto; padding: 40px 0 80px;">
    <div style="margin-bottom: 32px;">
      <a href="/blog" style="color: rgba(17,17,17,.5); font-size: 14px; text-decoration: none;">← Blog</a>
      <h1 style="font-family: var(--serif); font-size: 32px; margin: 12px 0 8px;">Archive</h1>
      <p style="color: rgba(17,17,17,.6); font-size: 14px;">共 {posts.length} 篇文章</p>
    </div>

    {years.map((year) => (
      <div style="margin-bottom: 36px;">
        <h2 style="font-family: var(--serif); font-size: 22px; margin: 0 0 16px; color: rgba(17,17,17,.78);">{year}</h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          {byYear.get(year)!.map((p) => (
            <a href={`/blog/${p.slug}`} style="text-decoration: none; display: flex; align-items: baseline; gap: 16px; padding: 12px 16px; border-radius: 10px; transition: background .14s ease;">
              <span style="color: rgba(17,17,17,.48); font-size: 13px; min-width: 60px; font-variant-numeric: tabular-nums;">
                {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : ''}
              </span>
              <span style="font-family: var(--serif); font-size: 16px; color: rgba(17,17,17,.86); font-weight: 600;">{p.title}</span>
            </a>
          ))}
        </div>
      </div>
    ))}
  </section>
</Shell>
```

**Step 2: 在博客列表页导航区域加归档入口**

在 `blog/index.astro` 的 `<section aria-label="Posts">` 之前，或 content-top 区域添加一个归档链接：

```astro
<a href="/blog/archive" style="font-size: 13px; color: rgba(17,17,17,.6); text-decoration: none; padding: 10px 0;">📅 Archive</a>
```

**Step 3: 验证构建**

```bash
cd extra-ellipse && npm run build
```

**Step 4: Commit**

```bash
git add extra-ellipse/src/pages/blog/archive.astro extra-ellipse/src/pages/blog/index.astro
git commit -m "feat: add archive page with timeline view"
```

---

### Task 8: 导航栏 Logo/首页链接

**Objective:** 导航栏左侧加一个可点击的站名/Logo，点击回首页。

**Files:**
- Modify: `extra-ellipse/src/components/Shell.astro`

**Step 1: 在 Shell.astro 导航栏添加首页链接**

在 `<nav class="navlinks">` 之前添加：

```astro
<a href="/" style="font-family: var(--serif); font-weight: 700; font-size: 16px; color: rgba(17,17,17,.88); text-decoration: none; margin-right: auto;">
  Plan B
</a>
```

完整导航结构变为：

```astro
<nav class="navlinks" aria-label="站点导航">
  <a href="/" style="font-family: var(--serif); font-weight: 700; font-size: 16px; color: rgba(17,17,17,.88); text-decoration: none; margin-right: auto;">Plan B</a>
  <a href="/blog">Blog</a>
  <a href="/about">About</a>
  <span style="display:inline-flex; gap:10px; align-items:center;">
    <a class="btn primary" href="/subscribe">Subscribe</a>
  </span>
</nav>
```

**Step 2: 验证构建**

```bash
cd extra-ellipse && npm run build
```

**Step 3: Commit**

```bash
git add extra-ellipse/src/components/Shell.astro
git commit -m "feat: add home logo link to navigation"
```

---

## Phase 4: 细节打磨（P4）

### Task 9: About 页补联系方式

**Objective:** About 页 Contact 区域加上实际联系方式链接。

**Files:**
- Modify: `extra-ellipse/src/pages/about.astro` (第 54-57 行)

**Step 1: 替换 Contact 区域**

找到：

```astro
<h2>Contact</h2>
<p>
  若某篇文章与你产生共鸣，可以通过导航栏的 Contact 与我联系。
</p>
```

替换为（用户需提供实际联系方式，这里用占位符）：

```astro
<h2>Contact</h2>
<p>
  若某篇文章与你产生共鸣，或想交流想法，可以通过以下方式找到我：
</p>
<ul style="list-style: none; padding: 0; margin: 16px 0; display: flex; flex-direction: column; gap: 10px;">
  <li>
    <a href="mailto:EMAIL_PLACEHOLDER" style="color: rgba(17,17,17,.82); text-decoration: underline; text-underline-offset: 3px;">📧 Email</a>
  </li>
  <li>
    <a href="XIAOHONGSHU_PLACEHOLDER" target="_blank" rel="noopener" style="color: rgba(17,17,17,.82); text-decoration: underline; text-underline-offset: 3px;">📕 小红书</a>
  </li>
  <li>
    <a href="https://github.com/DuGuanhuan" target="_blank" rel="noopener" style="color: rgba(17,17,17,.82); text-decoration: underline; text-underline-offset: 3px;">💻 GitHub</a>
  </li>
</ul>
```

**注意：** `EMAIL_PLACEHOLDER` 和 `XIAOHONGSHU_PLACEHOLDER` 需要用户提供实际值后替换。

**Step 2: 导航栏 Contact 链接修正**

当前导航栏没有 Contact 链接，而 About 页提到"导航栏的 Contact"。可以在导航栏 About 旁边加一个 Contact，或者直接把 About 页的文案改为"通过以下方式联系"（已在 Step 1 中处理）。

**Step 3: Commit**

```bash
git add extra-ellipse/src/pages/about.astro
git commit -m "feat: add contact links to About page"
```

---

### Task 10: GitHub Repo 优化

**Objective:** 填充 GitHub repo 的 description 和 topics，提升 repo 可发现性。

**Files:** 无代码修改，使用 `gh` CLI。

**Step 1: 设置 repo description 和 topics**

```bash
gh repo edit DuGuanhuan/my-blog \
  --description "Plan B Blog — Becoming in Public. An Astro + Notion CMS blog about career transitions, thinking tools, and honest self-reflection." \
  --add-topic astro \
  --add-topic notion-cms \
  --add-topic blog \
  --add-topic seo \
  --add-topic rss \
  --add-topic personal-blog \
  --homepage "https://guanhuan.top"
```

**Step 2: 验证**

```bash
gh repo view DuGuanhuan/my-blog --json description,homepageUrl,repositoryTopics
```

Expected: description、homepageUrl、topics 均已设置。

---

## 执行顺序建议

按优先级和依赖关系：

1. **Task 1** — 阅读时间（独立，快速）
2. **Task 2** — 上下篇导航（独立，快速）
3. **Task 8** — 导航首页链接（独立，快速）
4. **Task 3** — 代码高亮（独立）
5. **Task 4** — 邮件订阅（需用户注册 Buttondown）
6. **Task 6** — 标签页（独立）
7. **Task 7** — 归档页（独立）
8. **Task 5** — 暗色模式（工作量最大，放后面）
9. **Task 9** — About 联系方式（需用户提供联系信息）
10. **Task 10** — GitHub Repo 优化（CLI 操作）

**预计总工作量：** ~4-5 小时（不含暗色模式的内联样式迁移）

## 需要用户提供的信息

- [ ] Buttondown newsletter 名称（Task 4）
- [ ] Email 地址（Task 9）
- [ ] 小红书主页链接（Task 9）
