import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

type NotionBlockNode = (BlockObjectResponse | PartialBlockObjectResponse) & {
  __children?: NotionBlockNode[];
};

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

function renderChildren(block: NotionBlockNode): string {
  const children = Array.isArray(block.__children) ? block.__children : [];
  if (!children.length) return '';
  return renderBlocksToHtml(children);
}

function renderListItem(v: any, block: NotionBlockNode): string {
  const childHtml = renderChildren(block);
  return `<li>${rtToHtml(v.rich_text)}${childHtml ? `<div>${childHtml}</div>` : ''}</li>`;
}

function renderTable(block: NotionBlockNode, v: any): string {
  const rows = (Array.isArray(block.__children) ? block.__children : []).filter((child) => {
    if (!('type' in child)) return false;
    return (child as any).type === 'table_row';
  });
  if (!rows.length) return '';

  const hasColumnHeader = Boolean(v?.has_column_header);
  const hasRowHeader = Boolean(v?.has_row_header);

  const rowHtml = (row: any, rowIndex: number, inHeader: boolean) => {
    const cells = Array.isArray(row?.table_row?.cells) ? row.table_row.cells : [];
    const cols = cells
      .map((cell: any, colIndex: number) => {
        const useTh = inHeader || (hasRowHeader && colIndex === 0);
        const tag = useTh ? 'th' : 'td';
        const scope = inHeader ? ' scope="col"' : (hasRowHeader && colIndex === 0 ? ' scope="row"' : '');
        return `<${tag}${scope}>${rtToHtml(cell)}</${tag}>`;
      })
      .join('');
    return `<tr data-row="${rowIndex}">${cols}</tr>`;
  };

  let thead = '';
  let bodyRows = rows;
  if (hasColumnHeader) {
    thead = `<thead>${rowHtml(rows[0], 0, true)}</thead>`;
    bodyRows = rows.slice(1);
  }

  const tbody = `<tbody>${bodyRows.map((r, i) => rowHtml(r, i + (hasColumnHeader ? 1 : 0), false)).join('')}</tbody>`;
  return `<div class="notion-table-wrap"><table class="notion-table">${thead}${tbody}</table></div>`;
}

function blockToHtml(block: NotionBlockNode): string {
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
      return renderListItem(v, block);
    case 'numbered_list_item':
      return renderListItem(v, block);
    case 'to_do':
      return `<div class="notion-todo"><input type="checkbox" disabled ${v.checked ? 'checked' : ''} /><span>${rtToHtml(v.rich_text)}</span>${renderChildren(block)}</div>`;
    case 'toggle':
      return `<details class="notion-toggle"><summary>${rtToHtml(v.rich_text)}</summary>${renderChildren(block)}</details>`;
    case 'callout': {
      let icon = '';
      if (v.icon?.type === 'emoji') icon = esc(v.icon.emoji || '');
      return `<div class="notion-callout">${icon ? `<span class="notion-callout-icon" aria-hidden="true">${icon}</span>` : ''}<div class="notion-callout-content"><p>${rtToHtml(v.rich_text)}</p>${renderChildren(block)}</div></div>`;
    }
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
    case 'table':
      return renderTable(block, v);
    case 'divider':
      return `<hr />`;
    default:
      return '';
  }
}

export function renderBlocksToHtml(blocks: NotionBlockNode[]): string {
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
