# 文章页精修 Task 文档

**Status:** Draft  
**Owner:** DuGuanhuan / Codex  
**Target Area:** `extra-ellipse/src/pages/blog/[slug].astro`  
**Created:** 2026-07-02  
**Priority:** P0

---

## 1. 背景

当前博客已经具备基础静态站点能力：Notion 内容源、博客列表、标签页、归档页、RSS、sitemap、文章页阅读时间、上一篇/下一篇与右侧 TOC。下一阶段最值得优先投入的是文章页体验，因为它直接决定读者是否愿意读完、继续阅读、订阅或分享。

本次任务不追求新增大量功能，而是把文章页打磨成一个稳定、耐读、可长期复用的阅读模板。

---

## 2. 目标

### 用户目标

读者打开任意文章后，可以快速判断文章主题、顺畅阅读正文、理解文章结构，并自然地继续阅读下一篇或返回博客列表。

### 产品目标

- 提升文章页的第一屏质感与可信度。
- 降低正文阅读阻力，尤其是移动端阅读阻力。
- 强化站内连续阅读路径。
- 为后续 SEO、订阅、专题化内容打基础。

### 非目标

- 不做评论系统。
- 不做复杂搜索。
- 不做后台管理。
- 不引入重型 UI 框架。
- 不改变 Notion 作为 CMS 的主流程。

---

## 3. 当前现状

### 已具备

- 文章路由：`extra-ellipse/src/pages/blog/[slug].astro`
- Notion block 渲染：`extra-ellipse/src/lib/renderNotion.ts`
- 全局样式：`extra-ellipse/src/styles/global.css`
- SEO shell：`extra-ellipse/src/components/Shell.astro`
- 阅读时间：已在文章页计算并展示
- 上一篇/下一篇：已通过 `getStaticPaths` props 注入
- 右侧 TOC：已通过客户端脚本根据 heading 生成
- JSON-LD：已输出基础 `BlogPosting`

### 主要问题

1. 文章页样式分散在页面内联 `<style>` 与全局 CSS 中，后续维护成本会上升。
2. 首屏信息层级还可以更清晰：标题、摘要、日期、分类、阅读时间、标签、封面图需要统一版式。
3. 正文 block 类型的视觉规范还不够完整：图片、caption、callout、quote、code、table、todo、toggle 需要统一节奏。
4. 移动端 TOC、底部导航、长表格和代码块需要更明确的体验兜底。
5. 文章末尾缺少“继续阅读 / 订阅 / 返回”三个动作的清晰优先级。

---

## 4. 成功指标

### 验收指标

- `npm run astro -- check` 通过，0 errors / 0 warnings / 0 hints。
- `npm run build` 在本地 Notion env 存在时通过。
- 至少 4 篇现有文章页面正常生成。
- 桌面端、窄屏移动端均无明显横向溢出。
- 文章页首屏在 5 秒内能让读者理解：标题、摘要、发布时间、分类、阅读时间。

### 体验指标

- 正文最大宽度稳定在舒适阅读区间，约 `68-76ch`。
- 段落、标题、列表、引用、图片、代码块之间有稳定垂直节奏。
- 底部导航能明确表达上一篇/下一篇的方向。
- 没有依赖不可控远程资源导致核心阅读失败。

---

## 5. Task 拆解

## Task 1: 建立文章页样式边界

**Objective:** 将文章页样式从页面内联逐步收敛成可维护的 class 体系。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro`
- Modify: `extra-ellipse/src/styles/global.css`

**Requirements:**
- 保留文章页独有结构在 `[slug].astro`。
- 将可复用样式移动到 `global.css`，例如 `.post`, `.post-header`, `.post-meta`, `.post-content`, `.post-footer`, `.post-nav`。
- 避免继续扩散大段 inline style。
- 保持现有视觉基调：安静、编辑部、Notion-like、轻边框、低饱和。

**Acceptance:**
- `[slug].astro` 中的大段 `<style is:global>` 明显减少。
- 全局文章样式集中在 `global.css` 中，命名清晰。
- 页面视觉与当前版本相比不出现明显回退。

---

## Task 2: 精修文章首屏 Header

**Objective:** 让文章第一屏更像正式出版物，而不是普通模板页。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro`
- Modify: `extra-ellipse/src/styles/global.css`

**Requirements:**
- 文章标题使用清晰的 serif 标题样式，桌面端足够有存在感，移动端不过大。
- 摘要 `post.excerpt` 若存在，应显示在标题下方，作为 lead paragraph。
- meta 区展示：发布日期、分类、阅读时间。
- tags 若存在，展示为轻量 chip。
- cover 若存在，显示为文章主图；若不存在，不占位。
- cover 需要有圆角、边框、合理宽高比，并避免 CLS 式跳动。

**Acceptance:**
- 有封面图和无封面图的文章都表现自然。
- 中文长标题不会挤压或溢出。
- 移动端首屏不会被 meta/tag 过度占满。

---

## Task 3: 统一正文排版系统

**Objective:** 提升长文阅读舒适度，并让 Notion block 渲染结果有一致视觉节奏。

**Files:**
- Modify: `extra-ellipse/src/styles/global.css`
- Optional Modify: `extra-ellipse/src/lib/renderNotion.ts`

**Requirements:**
- 统一 `.post-content` 下的 `h1/h2/h3/p/ul/ol/li/a/strong/em` 样式。
- heading 上下间距要明显大于普通段落，但不要割裂。
- 链接需要有可识别样式，但不要破坏阅读。
- 列表缩进、行高与段落一致。
- 中文正文行高建议在 `1.8-1.95`。
- 桌面正文宽度控制在约 `72ch`。

**Acceptance:**
- 任意文章连续阅读时没有明显“挤、散、跳”的感觉。
- h2/h3 能清楚表达结构。
- 列表和普通段落视觉节奏一致。

---

## Task 4: 精修特殊内容块

**Objective:** 让图片、代码、引用、callout、table、todo、toggle 这些高频 Notion block 看起来稳定且专业。

**Files:**
- Modify: `extra-ellipse/src/styles/global.css`
- Optional Modify: `extra-ellipse/src/lib/renderNotion.ts`

**Requirements:**
- 图片：全宽自适应、圆角、轻边框、caption 清晰。
- 代码块：横向滚动、字号适中、背景与页面风格协调。
- inline code：与代码块区分，不要过重。
- blockquote：像引用而非普通卡片，左边界/背景/间距协调。
- callout：icon、内容间距合理，多段内容不塌陷。
- table：移动端横向滚动，桌面端细线表格，不使用重背景。
- todo：checkbox 与文本对齐。
- toggle：summary 可点击感明确，展开内容有缩进或间距。

**Acceptance:**
- 长代码不撑破页面。
- 宽表格不导致页面整体横向滚动。
- 图片 caption 不与正文混淆。
- callout 和 quote 视觉语义可区分。

---

## Task 5: 优化 TOC 体验

**Objective:** 保留右侧 TOC 的轻量感，同时降低它对阅读的干扰。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro`
- Modify: `extra-ellipse/src/styles/global.css`

**Requirements:**
- 桌面端保持右侧 slim rail + hover panel。
- TOC 只在 heading 数量 >= 2 时显示。
- 对超长 heading 做截断或合理换行。
- 移动端不展示右侧 TOC；可先不做移动端 TOC。
- 当前 active heading 高亮准确，滚动时不卡顿。
- 页面脚本命名尽量清晰，避免魔法数字散落。

**Acceptance:**
- 文章短时不显示空 TOC。
- 宽度不足时 TOC 自动隐藏。
- hover panel 不遮挡正文主体。

---

## Task 6: 重构文章底部动作区

**Objective:** 让读者读完后有清晰下一步，而不是只看到一个返回按钮。

**Files:**
- Modify: `extra-ellipse/src/pages/blog/[slug].astro`
- Modify: `extra-ellipse/src/styles/global.css`

**Requirements:**
- 底部区域分为三层优先级：
  1. 上一篇 / 下一篇
  2. 返回 Blog / 查看 Archive
  3. 订阅 RSS 或 Subscribe
- 上一篇/下一篇文案要明确方向：`上一篇` 表示更旧，`下一篇` 表示更新。
- 文章不足时布局不能塌陷。
- 移动端卡片纵向排列。

**Acceptance:**
- 单篇文章、第一篇文章、最后一篇文章均显示合理。
- 底部动作区不显得拥挤。
- 读者能自然继续站内阅读。

---

## Task 7: 降低远程依赖风险

**Objective:** 核心阅读体验不应依赖外部 CDN 是否可用。

**Files:**
- Modify: `extra-ellipse/src/components/Shell.astro`
- Optional Modify: `extra-ellipse/package.json`
- Optional Modify: `extra-ellipse/src/styles/global.css`

**Requirements:**
- 当前 Prism CDN 仅用于代码高亮，不应影响正文阅读。
- 优先方案：使用 Astro/Shiki 构建时高亮或本地 CSS；若范围过大，至少给出 fallback 样式。
- 不引入大型运行时依赖。

**Acceptance:**
- 移除或弱化 `cdn.jsdelivr.net` 对文章页核心样式的影响。
- 断网/国内网络不稳定时，代码块仍可读。

---

## Task 8: 验证与回归

**Objective:** 确保文章页精修没有破坏构建、SEO 与已有页面。

**Commands:**

```bash
cd /Users/guanhuan/Personal/my-blog/extra-ellipse
npm run astro -- check
npm run build
npm run preview
```

**Manual QA:**

检查以下页面：

- `/blog/one-year-more-stuff/`
- `/blog/right-choices-still-unhappy/`
- `/blog/from-animal-science-to-pm/`
- `/blog/reliability-is-a-love-language/`
- `/blog/`
- `/rss.xml`
- `/sitemap.xml`

**Viewport QA:**

- Desktop: `1440px`
- Laptop: `1280px`
- Tablet narrow: `768px`
- Mobile: `390px`

**Acceptance:**
- 所有页面可访问。
- 文章页无横向滚动。
- TOC 只在合适宽度展示。
- RSS / sitemap 仍正常输出。

---

## 6. 推荐执行顺序

1. Task 1：先建立样式边界，降低后续改动风险。
2. Task 2：精修文章首屏，提高第一印象。
3. Task 3：统一正文排版，提升阅读完成率。
4. Task 4：处理特殊内容块，避免 Notion 内容一多就破版。
5. Task 6：优化读完后的继续阅读路径。
6. Task 5：最后调 TOC，因为它依赖正文 heading 与布局稳定。
7. Task 7：视代码高亮复杂度单独做。
8. Task 8：全量验证。

---

## 7. 实施建议

### 推荐本轮范围

本轮建议先完成：Task 1、Task 2、Task 3、Task 4、Task 6、Task 8。

原因：这些任务直接提升阅读体验，风险可控；TOC 和代码高亮可以在文章主版式稳定后再单独精修。

### 建议暂缓

- 移动端 TOC：不是首要需求，容易引入交互复杂度。
- 评论系统：当前流量和内容规模下收益不高。
- 暗黑模式：会放大所有 block 样式调试成本。
- 复杂站内搜索：内容量还不够大。

---

## 8. 交付物

- 更新后的文章页模板。
- 集中的文章页样式规范。
- 通过构建的静态站点。
- 简短变更说明，包含：改了什么、为什么、如何验证。

---

## 9. 风险与注意事项

- `.env` 中包含 Notion token，不要提交。
- 修改全局 CSS 时要确认不会影响首页、博客列表、标签页和归档页。
- Notion 图片可能是临时 signed URL，渲染时应保持原始 URL，不做无必要代理。
- 不要在本轮大改 Notion schema，避免内容迁移成本。
- 若需要视觉对比，优先用现有 4 篇文章做样本。
