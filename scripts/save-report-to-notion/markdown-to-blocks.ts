/**
 * Markdown to Notion Blocks Converter
 */

export function markdownToBlocks(markdown: string): unknown[] {
  const blocks: unknown[] = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.slice(3) } }]
        }
      });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.slice(4) } }]
        }
      });
      i++;
      continue;
    }

    // Divider
    if (line.startsWith('---')) {
      blocks.push({ type: 'divider', divider: {} });
      i++;
      continue;
    }

    // Table (simplified - collect all table lines and create as code block)
    if (line.startsWith('|')) {
      let tableContent = '';
      while (i < lines.length && lines[i].startsWith('|')) {
        tableContent += lines[i] + '\n';
        i++;
      }
      blocks.push({
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: tableContent.trim() } }],
          language: 'plain text'
        }
      });
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: numberedMatch[2] } }]
        }
      });
      i++;
      continue;
    }

    // Quote
    if (line.startsWith('> ')) {
      blocks.push({
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3) || 'plain text';
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: codeContent.trim() } }],
          language: lang === 'typescript' ? 'typescript' : lang === 'json' ? 'json' : 'plain text'
        }
      });
      continue;
    }

    // Regular paragraph
    // Truncate to 2000 chars (Notion limit)
    const content = line.slice(0, 2000);
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content } }]
      }
    });
    i++;
  }

  // Notion API has a limit of 100 blocks per request
  return blocks.slice(0, 100);
}
