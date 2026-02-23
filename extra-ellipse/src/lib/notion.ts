import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '301b5a28fc988125a53fc0781262e71c';
export const NOTION_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[notion] Missing required env var: ${name}`);
  return v;
}

export function notionClient() {
  const auth = requireEnv('NOTION_API_KEY');
  const timeoutMs = Number(process.env.NOTION_TIMEOUT_MS || 45000);
  return new Client({ auth, timeoutMs });
}

export type Post = {
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

export type NotionBlockNode = (BlockObjectResponse | PartialBlockObjectResponse) & {
  __children?: NotionBlockNode[];
};

let cachedDataSourceId: string | undefined;
const NOTION_RETRY_TIMES = Number(process.env.NOTION_RETRY_TIMES || 2);
const NOTION_CHILD_CONCURRENCY = Number(process.env.NOTION_CHILD_CONCURRENCY || 6);
const NOTION_MAX_BLOCK_DEPTH = Number(process.env.NOTION_MAX_BLOCK_DEPTH || 12);

function isFullPage(p: any): p is PageObjectResponse {
  return p && p.object === 'page' && 'properties' in p;
}

function plainText(richText: any): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

function getProp(page: PageObjectResponse, name: string): any {
  // Notion properties are keyed by property name.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (page.properties as any)?.[name];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(label: string, task: () => Promise<T>, retries = NOTION_RETRY_TIMES): Promise<T> {
  let attempt = 0;
  // retries=2 means total 3 attempts.
  const maxAttempts = Math.max(1, retries + 1);
  let lastError: unknown;
  while (attempt < maxAttempts) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= maxAttempts) break;
      await sleep(250 * attempt);
    }
  }
  throw new Error(`[notion] ${label} failed after ${maxAttempts} attempts: ${(lastError as Error)?.message || lastError}`);
}

async function mapLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const safeLimit = Math.max(1, limit);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(safeLimit, items.length) }, async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) return;
      await worker(items[current]);
    }
  });

  await Promise.all(runners);
}

async function resolveDataSourceId(notion: Client): Promise<string> {
  if (cachedDataSourceId) return cachedDataSourceId;
  if (NOTION_DATA_SOURCE_ID) {
    cachedDataSourceId = NOTION_DATA_SOURCE_ID;
    return cachedDataSourceId;
  }

  const db = await withRetry('databases.retrieve', () =>
    notion.databases.retrieve({ database_id: NOTION_DATABASE_ID }),
  );
  const sources = (db as any)?.data_sources;
  if (Array.isArray(sources) && sources.length > 0 && sources[0]?.id) {
    cachedDataSourceId = String(sources[0].id);
    return cachedDataSourceId;
  }

  throw new Error(
    '[notion] Unable to resolve data source id. Set NOTION_DATA_SOURCE_ID or ensure the database has at least one data source.',
  );
}

async function queryPosts(
  notion: Client,
  args: {
    page_size?: number;
    sorts?: any[];
    filter?: any;
  },
) {
  const legacyQuery = (notion as any)?.databases?.query;
  if (typeof legacyQuery === 'function') {
    return withRetry('databases.query', () =>
      legacyQuery.call((notion as any).databases, {
        database_id: NOTION_DATABASE_ID,
        ...args,
      }),
    );
  }

  const dataSourceQuery = (notion as any)?.dataSources?.query;
  if (typeof dataSourceQuery === 'function') {
    const dataSourceId = await resolveDataSourceId(notion);
    return withRetry('dataSources.query', () =>
      dataSourceQuery.call((notion as any).dataSources, {
        data_source_id: dataSourceId,
        ...args,
      }),
    );
  }

  throw new Error('[notion] Current Notion SDK client has neither databases.query nor dataSources.query');
}

export function pageToPost(page: PageObjectResponse): Post {
  const titleProp = getProp(page, 'Name') || getProp(page, 'title');
  const slugProp = getProp(page, 'Slug');
  const statusProp = getProp(page, 'Status');
  const publishedAtProp = getProp(page, 'PublishedAt');
  const excerptProp = getProp(page, 'Excerpt');
  const categoryProp = getProp(page, 'Category');
  const tagsProp = getProp(page, 'Tags');
  const featuredProp = getProp(page, 'Featured');
  const seoTitleProp = getProp(page, 'SEO Title');
  const seoDescProp = getProp(page, 'SEO Description');
  const coverProp = getProp(page, 'Cover'); // Try to read property named "Cover"

  const title = plainText(titleProp?.title) || page.id;
  const slug = plainText(slugProp?.rich_text) || page.id;
  const status = statusProp?.select?.name || 'Draft';
  const publishedAt = publishedAtProp?.date?.start || undefined;
  const excerpt = plainText(excerptProp?.rich_text) || undefined;
  const category = categoryProp?.select?.name || undefined;
  const tags = Array.isArray(tagsProp?.multi_select) ? tagsProp.multi_select.map((t: any) => t.name) : [];
  const featured = Boolean(featuredProp?.checkbox);
  const seoTitle = plainText(seoTitleProp?.rich_text) || undefined;
  const seoDescription = plainText(seoDescProp?.rich_text) || undefined;

  // Handle Cover Image
  // Priority: 1. Property "Cover" (Files & media)  2. Page Cover
  let cover: string | undefined;

  // 1. Try Property "Cover"
  if (coverProp?.files && coverProp.files.length > 0) {
    const f = coverProp.files[0];
    if (f.type === 'file') {
      cover = f.file.url;
    } else if (f.type === 'external') {
      cover = f.external.url;
    }
  }

  // 2. Fallback to Page Cover
  if (!cover && page.cover) {
    if (page.cover.type === 'external') {
      cover = page.cover.external.url;
    } else if (page.cover.type === 'file') {
      cover = page.cover.file.url;
    }
  }

  return {
    id: page.id,
    title,
    slug,
    status,
    publishedAt,
    excerpt,
    category,
    tags,
    featured,
    seoTitle,
    seoDescription,
    cover,
  };
}

export async function listPosts(params?: { includeDrafts?: boolean; limit?: number }) {
  const notion = notionClient();

  const query: {
    page_size: number;
    sorts: any[];
    filter?: any;
  } = {
    page_size: params?.limit ?? 100,
    sorts: [{ property: 'PublishedAt', direction: 'descending' }],
  };

  if (!params?.includeDrafts) {
    query.filter = {
      property: 'Status',
      select: { equals: 'Published' },
    };
  }

  const res = await queryPosts(notion, query);

  const pages = (res.results || []).filter(isFullPage) as PageObjectResponse[];
  return pages.map(pageToPost);
}

export async function getPostBySlug(slug: string) {
  const notion = notionClient();

  // Primary lookup: by Slug property
  const res = await queryPosts(notion, {
    page_size: 1,
    filter: {
      property: 'Slug',
      rich_text: { equals: slug },
    },
  });
  const page = (res.results || []).find(isFullPage) as PageObjectResponse | undefined;
  if (page) return pageToPost(page);

  // Fallback: if the route param looks like a Notion page id (UUID), allow direct fetch.
  // This supports posts that forgot to set Slug (we previously fell back to page.id in list).
  const uuidLike = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidLike.test(slug)) return null;

  try {
    const p = await notion.pages.retrieve({ page_id: slug });
    if (!isFullPage(p)) return null;
    const post = pageToPost(p);
    // Only serve published posts in the public route.
    if (post.status !== 'Published') return null;
    return post;
  } catch {
    return null;
  }
}

async function listBlockChildren(blockId: string, depth = 0): Promise<NotionBlockNode[]> {
  if (depth > NOTION_MAX_BLOCK_DEPTH) {
    return [];
  }

  const notion = notionClient();
  const out: NotionBlockNode[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    let res: Awaited<ReturnType<typeof notion.blocks.children.list>>;
    try {
      res = await withRetry(`blocks.children.list(${blockId})`, () =>
        notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 }),
      );
    } catch (err) {
      if (out.length > 0) break;
      throw err;
    }

    out.push(...(res.results as NotionBlockNode[]));
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }

  const withChildren = out.filter((block) => {
    const maybeBlock = block as { has_children?: boolean; id?: string };
    return Boolean(maybeBlock.has_children && maybeBlock.id);
  });

  await mapLimit(withChildren, NOTION_CHILD_CONCURRENCY, async (block) => {
    const maybeBlock = block as { id?: string };
    if (!maybeBlock.id) return;
    try {
      block.__children = await listBlockChildren(maybeBlock.id, depth + 1);
    } catch {
      block.__children = [];
    }
  });

  return out;
}

export async function listBlocks(blockId: string) {
  const out = await listBlockChildren(blockId);
  return out;
}
