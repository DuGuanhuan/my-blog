import { createHash } from 'node:crypto';
import sharp from 'sharp';

type CoverRecord = {
  id: string;
  cover?: string;
  updatedAt?: string;
};

export type CoverKind = 'album' | 'book';

const coverSizes: Record<CoverKind, { width: number; height: number }> = {
  album: { width: 640, height: 640 },
  book: { width: 480, height: 720 },
};

function stableCoverSource(cover: string): string {
  try {
    const url = new URL(cover);
    return `${url.origin}${url.pathname}`;
  } catch {
    return cover.split('?')[0];
  }
}

export function coverAssetKey(kind: CoverKind, item: CoverRecord): string | undefined {
  if (!item.cover) return undefined;
  const id = item.id.replaceAll('-', '');
  const version = createHash('sha256')
    .update(`${kind}:${id}:${item.updatedAt || ''}:${stableCoverSource(item.cover)}`)
    .digest('hex')
    .slice(0, 12);
  return `${kind}-${id}-${version}`;
}

export function coverAssetPath(kind: CoverKind, item: CoverRecord): string | undefined {
  const key = coverAssetKey(kind, item);
  return key ? `/media/covers/${key}.webp` : undefined;
}

export async function optimizeCover(source: string, kind: CoverKind): Promise<Buffer> {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Cover download failed (${response.status}): ${source}`);

  const size = coverSizes[kind];
  return sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize({
      width: size.width,
      height: size.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}
