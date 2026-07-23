import type { APIRoute, GetStaticPaths } from 'astro';
import { listAlbums } from '../../../lib/notion';

const coverCache = new Map<string, { bytes: ArrayBuffer; contentType: string }>();

export const getStaticPaths: GetStaticPaths = async () => {
  const albums = await listAlbums();
  const withCovers = albums.filter((album) => album.cover);

  await Promise.all(withCovers.map(async (album) => {
    const response = await fetch(album.cover!);
    if (!response.ok) return;
    coverCache.set(album.id.replaceAll('-', ''), {
      bytes: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') || 'image/jpeg',
    });
  }));

  return withCovers.map((album) => ({
    params: { id: album.id.replaceAll('-', '') },
    props: { cover: album.cover },
  }));
};

export const GET: APIRoute = async ({ params, props }) => {
  const cached = params.id ? coverCache.get(params.id) : undefined;
  if (cached) {
    return new Response(cached.bytes, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const response = await fetch(props.cover);
  if (!response.ok) return new Response(null, { status: 404 });
  return new Response(await response.arrayBuffer(), {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
