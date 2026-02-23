# 我的博客 — Astro + Notion（extra-ellipse）

> 语言：**简体中文** | [English](./README.md)

这个仓库是一个 **以静态站点为主（static-first）** 的个人博客：使用 **Astro** 搭建前端，并用 **Notion 数据库** 作为 CMS（内容管理）。

- **站点项目目录**：`extra-ellipse/`
- **CMS**：Notion
- **Notion 主数据库**：`Posts`（字段与 Database ID 见 `PLAN.md`）

> 设计目标：现代编辑部/杂志风格（Claude Blog–inspired），并保持尽量低成本（Vercel / Cloudflare Pages 均可）。

---

## 1）仓库结构

```txt
my-blog/
  PLAN.md                 项目计划 + Notion schema
  README.md               English README
  README.zh-CN.md         中文版 README（本文件）
  extra-ellipse/          Astro 应用
    src/                  页面与组件
    public/               静态资源（favicon、logo、global.css）
    .env                  本地 env 映射
    package.json
```

网站工程在：

```bash
cd extra-ellipse
```

---

## 2）环境要求

- Node.js + npm
- Notion Integration Secret（环境变量）：
  - `NOTION_API_KEY`
- Notion Database ID（环境变量或 `.env`）：
  - `NOTION_DATABASE_ID`

### Notion 权限（重要）

Notion integration 必须被 **连接（Connect）** 到包含 `Posts` 数据库的父页面（例如 `Blog_claw`）：

Notion → 打开该页面 → **Connections** → **Add integration**。

如果没有连接，即使 API key 正确也会出现 unauthorized / 空数据。

---

## 3）本地开发

在仓库根目录：

```bash
cd extra-ellipse
npm install
npm run dev
```

打开终端输出的本地地址（通常是 http://localhost:4321）。

---

## 4）构建 / 预览

### 构建（静态）

Astro build 会在 **构建时** 拉取 Notion 数据，所以构建进程里必须能拿到 Notion 的 env vars。

如果你的 key 存在 macOS 的 `launchctl setenv` 里，可以这样注入：

```bash
cd extra-ellipse
NOTION_API_KEY="$(launchctl getenv NOTION_API_KEY)" \
NOTION_DATABASE_ID="301b5a28fc988125a53fc0781262e71c" \
npm run build
```

### 预览构建产物

```bash
cd extra-ellipse
npm run preview
```

---

## 5）发布流程（在 Notion 写文章）

### Notion 数据库

`Posts` 数据库是唯一真相来源（source of truth）。常用字段（完整 schema 见 `PLAN.md`）：

- **Name**（标题）
- **Slug**（rich_text）
- **Status**：`Draft` / `Published`
- **PublishedAt**（date）
- **Excerpt**（rich_text）
- **Category**（select）
- **Tags**（multi_select）
- **Cover**（files）
- **SEO Title** / **SEO Description**
- **Featured**（checkbox）

### 新建文章（推荐手动流程）

1. 打开 Notion 的 `Posts` 数据库。
2. 新增一行。
3. 填写：
   - **Name**（title）
   - **Slug**（URL-safe）
   - **Status** = `Draft`（写作中）
   - **PublishedAt**（date）
   - **Excerpt**（可选）
   - **Category/Tags/Cover**（可选）
4. 在该页面正文中写文章内容。
5. 准备发布时：将 **Status** 设为 `Published`。
6. 触发站点重新构建/部署（或等待**每 15 分钟自动 redeploy**，见下文）。

### 新建文章（CLI / 自动化）

本项目也支持通过 Notion API 编程创建文章（从 `extra-ellipse/` 目录执行）：

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

## 6）自动 redeploy（每 15 分钟）

本仓库包含一个 GitHub Actions workflow，会 **每 15 分钟** 触发一次 **Vercel Deploy Hook**，从而让 Notion 的改动无需手动部署也能被站点拉取更新。

- Workflow：`.github/workflows/vercel-redeploy-every-15m.yml`
- 需要的 GitHub Secret：`VERCEL_DEPLOY_HOOK_URL`

### 一次性配置步骤

1) Vercel 项目 → **Settings → Git → Deploy Hooks** → 创建一个 hook（branch 选 `main`）。
2) 复制生成的 hook URL。
3) GitHub 仓库 → **Settings → Secrets and variables → Actions** → 新增 repository secret：
   - Name：`VERCEL_DEPLOY_HOOK_URL`
   - Value：粘贴 hook URL
4)（可选）GitHub → **Actions** → 手动点 **Run workflow** 触发一次验证。

说明：
- GitHub 的 schedule 可能会有几分钟漂移，属正常。
- 这不是即时更新；期望内容新鲜度为 **≤ 15 分钟**。

---

## 7）更新站点品牌资源（favicon / header logo）

相关文件：

- `extra-ellipse/public/favicon.ico`
- `extra-ellipse/public/favicon.svg`
- `extra-ellipse/src/components/Shell.astro`（header logo）

### 当前品牌资源

- 左上角 header logo：
  - `extra-ellipse/public/Blog-LOGO-removebg-preview.png`
- 浏览器 tab 图标：
  - `extra-ellipse/public/Blog-tab-icon.png`
- 用于裁切 icon 的源图/备份：
  - `extra-ellipse/public/Blog.backup-before-crop.png`

favicon 与 logo 的引用配置在：

- `extra-ellipse/src/components/Shell.astro`

---

## 8）常见问题 / 排查

### A) 构建失败：`Missing required env var: NOTION_API_KEY`

原因：构建进程拿不到环境变量。

解决：构建时显式注入：

```bash
cd extra-ellipse
NOTION_API_KEY="$(launchctl getenv NOTION_API_KEY)" npm run build
```

（或在 shell profile 中设置并重启终端。）

### B) Notion API 返回 “unauthorized” / 空结果

常见原因：

- integration secret 错误
- integration 没有连接到包含数据库的 Notion 页面

解决：Notion 打开父页面 → **Connections** → 添加 integration。

### C) 文章页 404

检查 Notion：

- `Status` 必须是 `Published`
- `Slug` 必须存在、唯一、且 URL-safe

然后触发一次重新构建。

### D) 构建很慢或偶发失败

Notion API 在 build 时调用；如果遇到限流，等一会儿重试即可。

### E) `notion.databases.query is not a function`

原因：较新的 Notion SDK 版本将查询能力迁移到 `dataSources.query`。

当前代码已在以下文件兼容新旧两种查询接口：

- `extra-ellipse/src/lib/notion.ts`

---

## 9）关键配置位置

- `PLAN.md`：项目计划与 Notion schema 的权威来源
- `extra-ellipse/.env`：本地默认值/映射
- 部署平台（Vercel/Cloudflare Pages）环境变量：
  - `NOTION_API_KEY`
  - `NOTION_DATABASE_ID`

---

## 10）下一步（来自 PLAN）

完整里程碑见 `PLAN.md`，简版：

- Featured strip（使用 `Featured` 字段）
- Post 页面排版 + 上一篇/下一篇
- RSS + sitemap
- Deploy（Vercel / Cloudflare Pages）
-（可选）GitHub Actions 定时触发

## 11）近期更新（2026-02-23）

- 新增并接通了 `About` 页面：
  - 路由：`/about`
  - 页面文件：`extra-ellipse/src/pages/about.astro`
  - 导航链接更新：`extra-ellipse/src/components/Shell.astro`
- 首页 Hero 文案更新为：
  - 标题：`Becoming in Public`
  - 副文案：`Write to become. Build to be free.`
- 首页主题入口更新为：
  - `Becoming`
  - `Thinking Tools`
  - `Lived Experience`
  - `Quiet Essays`
- 品牌资源更新：
  - 左上角 logo：`extra-ellipse/public/Blog-LOGO-removebg-preview.png`
  - 浏览器 tab 图标：`extra-ellipse/public/Blog-tab-icon.png`
- Notion 渲染和取数能力增强：
  - 支持递归抓取子块（nested children）
  - 渲染器新增 `toggle`、`callout`、`table`、`to_do`、嵌套列表子项
  - 兼容 Notion 新旧查询接口：`databases.query` / `dataSources.query`
- Tag/Category 过滤器继续保持“从 Notion 已发布文章动态生成”，前端不硬编码。
