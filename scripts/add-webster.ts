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

async function main() {
  const response = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: DATABASE_ID },
      properties: {
        'Name': { title: [{ text: { content: 'Константин Ковалев' } }] },
        'Company': { rich_text: [{ text: { content: 'Webster' } }] },
        'Position': { rich_text: [{ text: { content: 'CEO / Managing Partner' } }] },
        'Telegram': { rich_text: [{ text: { content: '' } }] },
        'Phone': { phone_number: '+971523528638' },
        'Source': { rich_text: [{ text: { content: 'websterdubai.ae' } }] },
        'Notes': { rich_text: [{ text: { content: 'AREA президент. Forbes.ru/RBC эксперт' } }] },
        'Status': { select: { name: 'To Contact' } },
        'Tier': { select: { name: '1' } }
      }
    })
  });

  if (response.ok) {
    console.log('✓ Added: Константин Ковалев (Webster) - +971523528638');
    console.log('\n=== База обновлена: 30 контактов ===');
  } else {
    const error = await response.text();
    console.error('Failed:', error);
  }
}

main();
