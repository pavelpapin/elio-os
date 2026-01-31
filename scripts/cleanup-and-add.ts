/**
 * Delete entries without real contacts
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

const idsToDelete = [
  "2f633fbf-b00e-811e-8df5-dc53ca97915b",
  "2f633fbf-b00e-812c-9706-f1dfd0b077ce",
  "2f633fbf-b00e-8132-96d8-e955917ee3b2",
  "2f633fbf-b00e-819d-b54c-f625ef2c94b1",
  "2f633fbf-b00e-81bb-a3f8-f99f896a2493",
  "2f633fbf-b00e-81c2-a26d-c856eba37fbc",
  "2f633fbf-b00e-81d3-a215-f8cee8b7fd4d",
  "2f633fbf-b00e-81da-b1dc-f2ca9fcfc9c0",
  "2f633fbf-b00e-81e3-8e8a-e0512b575e04",
  "2f633fbf-b00e-81ef-aa01-f29847699b74",
  "2f633fbf-b00e-81f3-9cb1-cd6b2d614faa"
];

async function main() {
  console.log('=== Удаляю 11 записей без реальных контактов ===\n');

  for (const id of idsToDelete) {
    const response = await fetch(`${NOTION_API}/pages/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ archived: true })
    });

    if (response.ok) {
      console.log(`✓ Удалено: ${id}`);
    } else {
      console.log(`✗ Ошибка: ${id}`);
    }
  }

  console.log(`\n=== Удалено ${idsToDelete.length} записей ===`);
  console.log(`Осталось: 39 записей`);
  console.log(`Нужно добавить: 11 записей`);
}

main().catch(console.error);
