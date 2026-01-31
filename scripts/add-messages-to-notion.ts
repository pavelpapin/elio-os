const NOTION_KEY = "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";
const DB_ID = "2f633fbfb00e8178bf12d3a1da03aff2";

import { readFileSync } from "fs";

// Parse messages from markdown file
const raw = readFileSync("/root/outreach_messages.md", "utf-8");
const blocks = raw.split(/\n---\n/).filter(b => b.trim());

interface Msg { num: number; name: string; text: string }
const messages: Msg[] = [];

for (const block of blocks) {
  const headerMatch = block.match(/##\s+(\d+)\.\s+(.+?)\s*\|/);
  if (!headerMatch) continue;
  const num = parseInt(headerMatch[1]);
  const name = headerMatch[2].trim();
  // Extract message body (everything after the header line)
  const lines = block.trim().split("\n");
  const headerIdx = lines.findIndex(l => l.startsWith("##"));
  const text = lines.slice(headerIdx + 1).join("\n").trim();
  messages.push({ num, name, text });
}

console.log(`Parsed ${messages.length} messages from file\n`);

// Fetch all contacts from Notion
async function getAllPages(): Promise<any[]> {
  let pages: any[] = [];
  let cursor: string | undefined;
  do {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data: any = await r.json();
    pages = pages.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function getTitle(page: any): string {
  return page.properties?.["Name"]?.title?.[0]?.plain_text || "";
}

async function updateMessage(pageId: string, message: string) {
  // Notion rich_text max 2000 chars per block
  const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        "Message": { rich_text: [{ text: { content: message.slice(0, 2000) } }] },
      },
    }),
  });
  return r.ok;
}

async function main() {
  const pages = await getAllPages();
  console.log(`Found ${pages.length} contacts in Notion\n`);

  let matched = 0;
  let updated = 0;

  for (const msg of messages) {
    const name = msg.name;
    // Try exact match first, then partial
    let page = pages.find(p => getTitle(p) === name);
    if (!page) {
      // Try matching by first word (first name)
      const firstName = name.split(" ")[0];
      page = pages.find(p => getTitle(p).startsWith(firstName));
    }
    if (!page) {
      console.log(`✗ #${msg.num} "${name}" — не найден в Notion`);
      continue;
    }
    matched++;
    const ok = await updateMessage(page.id, msg.text);
    if (ok) {
      updated++;
      console.log(`✓ #${msg.num} ${name}`);
    } else {
      console.log(`✗ #${msg.num} ${name} — ошибка обновления`);
    }
  }

  console.log(`\nИтого: ${matched} найдено, ${updated} обновлено из ${messages.length}`);
}

main();
