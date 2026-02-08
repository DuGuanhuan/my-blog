import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '301b5a28fc988125a53fc0781262e71c';

let _dataSourceId: string | null = null;
async function dataSourceId() {
  if (_dataSourceId) return _dataSourceId;
  const notion = notionClient();
  const db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
  const ds = (db as any).data_sources?.[0]?.id;
  if (!ds) throw new Error('[notion] Could not resolve data source id from database');
  _dataSourceId = ds;
  return ds;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[notion] Missing required env var: ${name}`);
  return v;
}

export function notionClient() {
  const auth = requireEnv('NOTION_API_KEY');
  return new Client({ auth });
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
};

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
  };
}

export async function listPosts(params?: { includeDrafts?: boolean; limit?: number }) {
  const notion = notionClient();

  const query: QueryDatabaseParameters = {
    database_id: NOTION_DATABASE_ID,
    page_size: params?.limit ?? 100,
    sorts: [{ property: 'PublishedAt', direction: 'descending' }],
  };

  if (!params?.includeDrafts) {
    query.filter = {
      property: 'Status',
      select: { equals: 'Published' },
    };
  }

  // Notion API v2022-06-28: database content is accessed via data sources.
  const res = await notion.dataSources.query({
    data_source_id: await dataSourceId(),
    page_size: query.page_size,
    filter: query.filter as any,
    sorts: query.sorts as any,
  } as any);

  const pages = (res.results || []).filter(isFullPage) as PageObjectResponse[];
  return pages.map(pageToPost);
}

export async function getPostBySlug(slug: string) {
  const notion = notionClient();
  const res = await notion.dataSources.query({
    data_source_id: await dataSourceId(),
    page_size: 1,
    filter: {
      property: 'Slug',
      rich_text: { equals: slug },
    },
  } as any);
  const page = (res.results || []).find(isFullPage) as PageObjectResponse | undefined;
  return page ? pageToPost(page) : null;
}

export async function listBlocks(blockId: string) {
  const notion = notionClient();
  const out: (BlockObjectResponse | PartialBlockObjectResponse)[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    out.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }

  return out;
}
