import type { APIRoute, GetStaticPaths } from 'astro';
import { coverAssetKey, optimizeCover, type CoverKind } from '../../../lib/coverImage';
import { listAlbums, listBooks } from '../../../lib/notion';

type CoverSource = {
  key: string;
  kind: CoverKind;
  cover: string;
};

const optimizedCovers = new Map<string, Buffer>();

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

export const getStaticPaths: GetStaticPaths = async () => {
  const [albums, books] = await Promise.all([
    listAlbums(),
    listBooks({ limit: 200 }),
  ]);

  const sources: CoverSource[] = [
    ...albums.flatMap((album) => {
      const key = coverAssetKey('album', album);
      return key && album.cover ? [{ key, kind: 'album' as const, cover: album.cover }] : [];
    }),
    ...books.flatMap((book) => {
      const key = coverAssetKey('book', book);
      return key && book.cover ? [{ key, kind: 'book' as const, cover: book.cover }] : [];
    }),
  ];

  await mapWithConcurrency(sources, 4, async (source) => {
    try {
      optimizedCovers.set(source.key, await optimizeCover(source.cover, source.kind));
    } catch (error) {
      console.warn(`[cover] Failed to optimize ${source.key}:`, error);
    }
  });

  return sources.map((source) => ({
    params: { key: source.key },
    props: source,
  }));
};

export const GET: APIRoute = async ({ params, props }) => {
  const source = props as CoverSource;
  const key = params.key || source.key;
  let bytes = optimizedCovers.get(key);

  if (!bytes) {
    try {
      bytes = await optimizeCover(source.cover, source.kind);
    } catch {
      return new Response(null, { status: 404 });
    }
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
