/**
 * Create Real Estate Owners CRM in Notion
 * Run: cd /root/.claude/mcp-server && npx tsx ../scripts/create-notion-crm.ts
 */

import { readFileSync } from 'fs';
import { parse } from 'path';

// Load Notion credentials
const credentials = JSON.parse(
  readFileSync('/root/.claude/secrets/notion.json', 'utf-8')
);

const NOTION_API = 'https://api.notion.com/v1';
const headers = {
  'Authorization': `Bearer ${credentials.api_key}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

// CSV data - parsed from merged file
const contacts = [
  { name: "Тамара Гетигежева", company: "Mira International", position: "Co-Founder", telegram: "", instagram: "@tamaramiraa", linkedin: "linkedin.com/in/tamara-getigezheva", email: "", phone: "", website: "", source: "Forbes / CBN ME", tier: "1", notes: "Брокер №1 по Emaar" },
  { name: "Тимур Мамайханов", company: "Mira Developments", position: "Co-Founder & CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "", source: "Forbes", tier: "1", notes: "Сооснователь с Тамарой" },
  { name: "Олег Лаврик", company: "IMEX Real Estate", position: "Director / Founder", telegram: "@lavrikoleg", instagram: "@lavrikoleg", linkedin: "", email: "oleg@imexre.com", phone: "+971 50 2528188", website: "imexre.com", source: "imexre.com", tier: "1", notes: "С 1995 года" },
  { name: "Никита Кузнецов", company: "Metropolitan Premium", position: "CEO", telegram: "", instagram: "", linkedin: "linkedin.com/in/nikita-kuznetsov-92a845234", email: "", phone: "", website: "metropolitan.realestate", source: "metropolitan.realestate", tier: "1", notes: "Top 50 Real Estate Agents Dubai" },
  { name: "Данил Шуховцев", company: "DDA Real Estate", position: "Co-Founder / CEO", telegram: "", instagram: "@dda.realestate", linkedin: "", email: "", phone: "", website: "dda-realestate.com", source: "Forbes.ru", tier: "1", notes: "3 млрд руб продаж" },
  { name: "Дмитрий Шуховцев", company: "DDA Real Estate", position: "Co-Founder", telegram: "", instagram: "@dda.realestate", linkedin: "", email: "", phone: "", website: "dda-realestate.com", source: "Forbes.ru", tier: "1", notes: "Брат Данила" },
  { name: "Федор Соломатин", company: "Prime", position: "Founder / CEO", telegram: "@fedor.solomatin", instagram: "@fedor.solomatin", linkedin: "linkedin.com/in/fedor-solomatin", email: "", phone: "", website: "prime.su", source: "prime.su", tier: "1", notes: "25 наград IPA" },
  { name: "Евгения Тимофеенко", company: "Mayak Real Estate", position: "Founder / CEO", telegram: "", instagram: "@evgeniatimofeenko", linkedin: "linkedin.com/in/evgenia-timofeenko", email: "", phone: "+971 586908803", website: "mayak.ae", source: "evgeniatimofeenko.com", tier: "1", notes: "18+ лет опыта" },
  { name: "Алессия Щеглова", company: "Dacha Real Estate", position: "CEO", telegram: "", instagram: "@alessia_sheglova", linkedin: "linkedin.com/in/alessia-sheglova", email: "", phone: "", website: "dacha.ae", source: "dacha.ae", tier: "1", notes: "263K подписчиков" },
  { name: "Константин Писаренко", company: "The Capital Dubai", position: "Founder", telegram: "@the_capital_dubai_lead_bot", instagram: "@pysarenko_k", linkedin: "", email: "", phone: "", website: "thecapitaldubai.com", source: "thecapitaldubai.com", tier: "1", notes: "500+ сотрудников" },
  { name: "Юрий Титов", company: "ProBroker.ae", position: "Основатель", telegram: "@probrokerae", instagram: "@titov_yury", linkedin: "", email: "", phone: "", website: "youtube.com/@titov_yury", source: "YouTube", tier: "1", notes: "Обучение брокеров" },
  { name: "Антон Буржуй", company: "Inside Real Estate", position: "Партнёр", telegram: "@anton_burjuy", instagram: "", linkedin: "", email: "", phone: "", website: "burjuyinvest", source: "TGStat", tier: "1", notes: "@burjuyinvest канал" },
  { name: "Андрей Негинский", company: "Neginski.com", position: "CEO", telegram: "@NeginskiUAE", instagram: "@andreyneginskiy", linkedin: "", email: "", phone: "", website: "neginski.com", source: "vc.ru", tier: "1", notes: "@andreyneginskiy личный" },
  { name: "Евгения Винокурова", company: "Tuimaada Real Estate", position: "Основатель", telegram: "", instagram: "@evgenya.vinokurova", linkedin: "", email: "", phone: "", website: "tuimaada.ae", source: "Forbes.ru", tier: "1", notes: "1M+ подписчиков" },
  { name: "Татьяна Агеева", company: "Ageeva Real Estate", position: "Основатель/CEO", telegram: "@ageevarealestate", instagram: "", linkedin: "", email: "", phone: "", website: "ageevarealestate.com", source: "RBC Pro", tier: "1", notes: "23 года опыта" },
  { name: "Георгий Качмазов", company: "Tranio", position: "Основатель", telegram: "", instagram: "", linkedin: "linkedin.com/in/georgy-kacmazov", email: "", phone: "", website: "tranio.com", source: "Forbes.ru", tier: "1", notes: "С 2010 года" },
  { name: "Александр Шарапов", company: "Becar / You&Co", position: "President", telegram: "@sharapov2901", instagram: "", linkedin: "", email: "office@becar.spb.ru", phone: "(812) 324-31-31", website: "becar.pro", source: "Fontanka.ru", tier: "1", notes: "3.67K в TG" },
  { name: "Сергей Галлер", company: "Галлерная", position: "Основатель", telegram: "@sergey_galler", instagram: "", linkedin: "", email: "", phone: "", website: "sergeygaller.ru", source: "vc.ru", tier: "2", notes: "18 лет опыта" },
  { name: "Анна Кирилишина", company: "Частный брокер", position: "Риэлтор", telegram: "@dubai_invest1", instagram: "@anna_kirilishina", linkedin: "", email: "", phone: "", website: "", source: "TGStat", tier: "2", notes: "@kirilishina_real_estate" },
  { name: "Анастасия Тарасова", company: "Nastya Docs RE", position: "Основатель", telegram: "@nastya_docs", instagram: "", linkedin: "", email: "", phone: "", website: "nastyadocs.ae", source: "Telegram", tier: "2", notes: "@dubai_nastya_docs" },
  { name: "Ольга Полетцкая", company: "Colife Invest", position: "Генеральный директор", telegram: "@investcolife", instagram: "", linkedin: "", email: "", phone: "", website: "colife.ae", source: "Telegram", tier: "2", notes: "" },
];

async function createDatabase(parentPageId: string) {
  const response = await fetch(`${NOTION_API}/databases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Real Estate Owners' } }],
      properties: {
        'Name': { title: {} },
        'Company': { rich_text: {} },
        'Position': { rich_text: {} },
        'Telegram': { rich_text: {} },
        'Instagram': { rich_text: {} },
        'LinkedIn': { url: {} },
        'Email': { email: {} },
        'Phone': { phone_number: {} },
        'Website': { url: {} },
        'Source': { rich_text: {} },
        'Tier': { select: { options: [
          { name: '1', color: 'green' },
          { name: '2', color: 'yellow' },
          { name: '3', color: 'gray' }
        ]}},
        'Notes': { rich_text: {} },
        'Status': { select: { options: [
          { name: 'To Contact', color: 'gray' },
          { name: 'Contacted', color: 'blue' },
          { name: 'In Progress', color: 'yellow' },
          { name: 'Won', color: 'green' },
          { name: 'Lost', color: 'red' }
        ]}}
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create database: ${error}`);
  }

  return response.json();
}

async function addPage(databaseId: string, contact: typeof contacts[0]) {
  const properties: Record<string, unknown> = {
    'Name': { title: [{ text: { content: contact.name } }] },
    'Company': { rich_text: [{ text: { content: contact.company } }] },
    'Position': { rich_text: [{ text: { content: contact.position } }] },
    'Telegram': { rich_text: [{ text: { content: contact.telegram } }] },
    'Instagram': { rich_text: [{ text: { content: contact.instagram } }] },
    'Source': { rich_text: [{ text: { content: contact.source } }] },
    'Tier': { select: { name: contact.tier } },
    'Notes': { rich_text: [{ text: { content: contact.notes } }] },
    'Status': { select: { name: 'To Contact' } }
  };

  if (contact.linkedin) properties['LinkedIn'] = { url: contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}` };
  if (contact.email) properties['Email'] = { email: contact.email };
  if (contact.phone) properties['Phone'] = { phone_number: contact.phone };
  if (contact.website) properties['Website'] = { url: contact.website.startsWith('http') ? contact.website : `https://${contact.website}` };

  const response = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to add ${contact.name}: ${error}`);
    return null;
  }

  return response.json();
}

async function main() {
  // First, we need a parent page. Let's search for an existing workspace page
  console.log('Searching for parent page...');

  const searchResponse = await fetch(`${NOTION_API}/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: 'CRM',
      filter: { property: 'object', value: 'page' },
      page_size: 5
    })
  });

  const searchResult = await searchResponse.json() as { results: Array<{ id: string; properties?: Record<string, unknown> }> };
  console.log('Search results:', JSON.stringify(searchResult, null, 2));

  // If no CRM page exists, search for any page we can use
  if (!searchResult.results?.length) {
    console.log('No CRM page found. Creating database in first available page...');

    const allPagesResponse = await fetch(`${NOTION_API}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        page_size: 1
      })
    });

    const allPages = await allPagesResponse.json() as { results: Array<{ id: string }> };
    if (!allPages.results?.length) {
      console.error('No pages found in workspace. Please create a page first.');
      process.exit(1);
    }

    const parentPageId = allPages.results[0].id;
    console.log(`Using parent page: ${parentPageId}`);

    // Create database
    console.log('Creating database...');
    const db = await createDatabase(parentPageId);
    console.log('Database created:', db.url);

    // Add contacts
    console.log('Adding contacts...');
    for (const contact of contacts) {
      await addPage(db.id, contact);
      console.log(`Added: ${contact.name}`);
    }

    console.log(`\n✅ Done! Database URL: ${db.url}`);
  } else {
    const parentPageId = searchResult.results[0].id;
    console.log(`Found CRM page: ${parentPageId}`);

    // Create database
    console.log('Creating database...');
    const db = await createDatabase(parentPageId);
    console.log('Database created:', db.url);

    // Add contacts
    console.log('Adding contacts...');
    for (const contact of contacts) {
      await addPage(db.id, contact);
      console.log(`Added: ${contact.name}`);
    }

    console.log(`\n✅ Done! Database URL: ${db.url}`);
  }
}

main().catch(console.error);
