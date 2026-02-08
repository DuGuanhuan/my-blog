import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

function esc(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function rtToHtml(richText: any[]): string {
  if (!Array.isArray(richText)) return '';
  return richText
    .map((t) => {
      const text = esc(t.plain_text || '');
      const a = t.annotations || {};
      let out = text;
      if (a.code) out = `<code>${out}</code>`;
      if (a.bold) out = `<strong>${out}</strong>`;
      if (a.italic) out = `<em>${out}</em>`;
      if (a.underline) out = `<u>${out}</u>`;
      if (a.strikethrough) out = `<s>${out}</s>`;

      const href = t.href || t.text?.link?.url;
      if (href) out = `<a href="${esc(String(href))}" rel="noopener noreferrer">${out}</a>`;
      return out;
    })
    .join('');
}

function blockToHtml(block: BlockObjectResponse | PartialBlockObjectResponse): string {
  if (!('type' in block)) return '';
  const t = (block as any).type;
  const v = (block as any)[t];

  switch (t) {
    case 'heading_1':
      return `<h1>${rtToHtml(v.rich_text)}</h1>`;
    case 'heading_2':
      return `<h2>${rtToHtml(v.rich_text)}</h2>`;
    case 'heading_3':
      return `<h3>${rtToHtml(v.rich_text)}</h3>`;
    case 'paragraph':
      // Notion often uses empty paragraphs for spacing
      if (!v.rich_text?.length) return '';
      return `<p>${rtToHtml(v.rich_text)}</p>`;
    case 'bulleted_list_item':
      return `<li>${rtToHtml(v.rich_text)}</li>`;
    case 'numbered_list_item':
      return `<li>${rtToHtml(v.rich_text)}</li>`;
    case 'quote':
      return `<blockquote><p>${rtToHtml(v.rich_text)}</p></blockquote>`;
    case 'code': {
      const lang = esc(v.language || '');
      const code = esc((v.rich_text || []).map((t: any) => t.plain_text || '').join(''));
      return `<pre><code data-language="${lang}">${code}</code></pre>`;
    }
    case 'image': {
      const url = v.type === 'external' ? v.external?.url : v.file?.url;
      const caption = (v.caption || []).map((t: any) => t.plain_text || '').join('');
      if (!url) return '';
      return `<figure><img src="${esc(String(url))}" alt="${esc(caption || '')}" loading="lazy" />${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
    }
    case 'divider':
      return `<hr />`;
    default:
      return '';
  }
}

export function renderBlocksToHtml(blocks: (BlockObjectResponse | PartialBlockObjectResponse)[]): string {
  // Group consecutive list items into <ul>/<ol>
  let html = '';
  let listMode: 'ul' | 'ol' | null = null;

  const flush = () => {
    if (listMode) {
      html += `</${listMode}>`;
      listMode = null;
    }
  };

  for (const b of blocks) {
    if (!('type' in b)) continue;

    const type = (b as any).type;
    if (type === 'bulleted_list_item') {
      if (listMode !== 'ul') {
        flush();
        html += '<ul>';
        listMode = 'ul';
      }
      html += blockToHtml(b);
      continue;
    }

    if (type === 'numbered_list_item') {
      if (listMode !== 'ol') {
        flush();
        html += '<ol>';
        listMode = 'ol';
      }
      html += blockToHtml(b);
      continue;
    }

    flush();
    const chunk = blockToHtml(b);
    if (chunk) html += chunk;
  }

  flush();
  return html;
}
