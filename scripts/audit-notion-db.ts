/**
 * Audit Notion database - find entries without real Telegram/WhatsApp
 */

import { readFileSync } from 'fs';

const credentials = JSON.parse(
  readFileSync('/root/.claude/secrets/notion.json', 'utf-8')
);

const NOTION_API = 'https://api.notion.com/v1';
const headers = {
  'Authorization': `Bearer ${credentials.api_key}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

const DATABASE_ID = '2f633fbfb00e8178bf12d3a1da03aff2';

interface NotionPage {
  id: string;
  properties: {
    Name?: { title: Array<{ plain_text: string }> };
    Company?: { rich_text: Array<{ plain_text: string }> };
    Telegram?: { rich_text: Array<{ plain_text: string }> };
    Phone?: { phone_number: string | null };
    Notes?: { rich_text: Array<{ plain_text: string }> };
  };
}

function extractText(prop: { rich_text?: Array<{ plain_text: string }> } | undefined): string {
  return prop?.rich_text?.map(t => t.plain_text).join('') || '';
}

function extractTitle(prop: { title?: Array<{ plain_text: string }> } | undefined): string {
  return prop?.title?.map(t => t.plain_text).join('') || '';
}

async function main() {
  console.log('=== Аудит базы Notion ===\n');

  const response = await fetch(`${NOTION_API}/databases/${DATABASE_ID}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_size: 100 })
  });

  const data = await response.json() as { results: NotionPage[] };

  console.log(`Всего записей: ${data.results.length}\n`);

  const withRealContact: Array<{ id: string; name: string; company: string; telegram: string; phone: string }> = [];
  const withoutRealContact: Array<{ id: string; name: string; company: string; telegram: string; phone: string; notes: string }> = [];

  for (const page of data.results) {
    const name = extractTitle(page.properties.Name);
    const company = extractText(page.properties.Company);
    const telegram = extractText(page.properties.Telegram);
    const phone = page.properties.Phone?.phone_number || '';
    const notes = extractText(page.properties.Notes);

    // Check if has REAL contact
    const hasRealTelegram = telegram && telegram.startsWith('@') && !telegram.includes('bot');
    const hasRealPhone = phone && (phone.startsWith('+') || phone.match(/^\d/));

    // Exclude fake contacts
    const isFake =
      telegram.includes('site:') ||
      telegram.includes('.estate') ||
      phone.includes('site:') ||
      phone === 'LinkedIn' ||
      (!hasRealTelegram && !hasRealPhone);

    if (!isFake && (hasRealTelegram || hasRealPhone)) {
      withRealContact.push({ id: page.id, name, company, telegram, phone });
    } else {
      withoutRealContact.push({ id: page.id, name, company, telegram, phone, notes });
    }
  }

  console.log('=== С РЕАЛЬНЫМИ контактами ===');
  console.log(`Количество: ${withRealContact.length}\n`);

  withRealContact.forEach((c, i) => {
    const contact = c.telegram || c.phone;
    console.log(`${i + 1}. ${c.name} (${c.company}) - ${contact}`);
  });

  console.log('\n=== БЕЗ реальных контактов (УДАЛИТЬ) ===');
  console.log(`Количество: ${withoutRealContact.length}\n`);

  withoutRealContact.forEach((c, i) => {
    const contact = c.telegram || c.phone || 'нет';
    console.log(`${i + 1}. ${c.name} (${c.company}) - telegram: "${c.telegram}", phone: "${c.phone}"`);
  });

  console.log('\n=== IDs для удаления ===');
  console.log(JSON.stringify(withoutRealContact.map(c => c.id)));

  console.log(`\n=== ИТОГО ===`);
  console.log(`С реальными контактами: ${withRealContact.length}`);
  console.log(`Без реальных контактов: ${withoutRealContact.length}`);
  console.log(`Нужно добавить: ${50 - withRealContact.length}`);
}

main().catch(console.error);
