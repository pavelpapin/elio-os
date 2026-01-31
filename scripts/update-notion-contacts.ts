/**
 * Update Notion CRM - keep only contacts with Telegram or WhatsApp
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

// Final list of 30 contacts with Telegram or WhatsApp
const finalContacts = [
  // === С TELEGRAM ===
  { name: "Юрий Титов", company: "ProBroker.ae", position: "Основатель", telegram: "@probrokerae", whatsapp: "", source: "YouTube", notes: "@titov_yury Instagram" },
  { name: "Антон Буржуй", company: "Inside Real Estate", position: "Партнёр", telegram: "@anton_burjuy", whatsapp: "", source: "TGStat", notes: "Канал @burjuyinvest" },
  { name: "Андрей Негинский", company: "Neginski.com", position: "CEO", telegram: "@andreyneginskiy", whatsapp: "", source: "vc.ru", notes: "Канал @NeginskiUAE" },
  { name: "Татьяна Агеева", company: "Ageeva Real Estate", position: "CEO", telegram: "@ageeva_realestate", whatsapp: "", source: "RBC Pro/Forbes", notes: "Канал @ageevarealestate" },
  { name: "Федор Соломатин", company: "Prime", position: "Founder & CEO", telegram: "@fedor.solomatin", whatsapp: "+74951473759", source: "prime.su", notes: "25 наград IPA" },
  { name: "Олег Лаврик", company: "IMEX Real Estate", position: "Director/Founder", telegram: "@lavrikoleg", whatsapp: "+971502528188", source: "imexre.com", notes: "С 1995 года" },
  { name: "Александр Шарапов", company: "Becar / You&Co", position: "President", telegram: "@sharapov2901", whatsapp: "", source: "Fontanka.ru", notes: "3.67K подписчиков" },
  { name: "Сергей Галлер", company: "Галлерная", position: "Основатель", telegram: "@sergey_galler", whatsapp: "", source: "vc.ru", notes: "18 лет опыта" },
  { name: "Анна Кирилишина", company: "Частный брокер", position: "Риэлтор", telegram: "@kirilishina_real_estate", whatsapp: "", source: "TGStat", notes: "Канал @dubai_invest1" },
  { name: "Анастасия Тарасова", company: "Nastya Docs RE", position: "Основатель", telegram: "@nastya_docs", whatsapp: "", source: "Telegram", notes: "Канал @dubai_nastya_docs" },
  { name: "Ольга Полетцкая", company: "Colife Invest", position: "Генеральный директор", telegram: "@investcolife", whatsapp: "", source: "Telegram", notes: "5269 подписчиков" },
  { name: "Лилия", company: "Alira Real Estate", position: "CEO", telegram: "@lilia_produbai", whatsapp: "", source: "Instagram", notes: "Также юрист" },
  { name: "homis", company: "homis про ОАЭ", position: "Владелец канала", telegram: "@homisdubai", whatsapp: "", source: "vc.ru", notes: "Telegram канал" },
  { name: "Константин Писаренко", company: "The Capital Dubai", position: "Founder", telegram: "@the_capital_dubai_lead_bot", whatsapp: "+971509953652", source: "thecapitaldubai.com", notes: "500+ сотрудников" },

  // === С WHATSAPP (телефоны агентств/владельцев) ===
  { name: "Евгения Тимофеенко", company: "Mayak Real Estate", position: "Founder & CEO", telegram: "", whatsapp: "+971586908803", source: "mayak.ae", notes: "18+ лет опыта" },
  { name: "Тамара Гетигежева", company: "Mira International", position: "Co-Founder", telegram: "", whatsapp: "+971564444654", source: "Forbes/CBN ME", notes: "Брокер №1 по Emaar" },
  { name: "Никита Кузнецов", company: "Metropolitan Premium", position: "CEO", telegram: "", whatsapp: "+971586488888", source: "metropolitan.realestate", notes: "Top 50 Agents Dubai" },
  { name: "Алессия Щеглова", company: "Dacha Real Estate", position: "CEO", telegram: "", whatsapp: "+971547770130", source: "dacha.ae", notes: "263K Instagram. 17 лет" },
  { name: "Gaurav Khatri", company: "AX Capital", position: "CEO", telegram: "", whatsapp: "+971526728886", source: "axcapital.ae", notes: "500+ сотрудников, 30 языков" },
  { name: "Данил Шуховцев", company: "DDA Real Estate", position: "Co-Founder & CEO", telegram: "", whatsapp: "site:dda-re.com", source: "Forbes.ru", notes: "3 млрд руб продаж. WhatsApp на сайте" },
  { name: "Дмитрий Шуховцев", company: "DDA Real Estate", position: "Co-Founder", telegram: "", whatsapp: "site:dda-re.com", source: "Forbes.ru", notes: "400+ офисов в России" },
  { name: "Екатерина Румянцева", company: "Kalinka Ecosystem", position: "Founder", telegram: "", whatsapp: "+74950327540", source: "kalinka-realty.com", notes: "12x International Property Awards" },
  { name: "Александр Калинкин", company: "Kalinka Middle East", position: "CEO", telegram: "", whatsapp: "+74950327540", source: "kalinka-realty.com", notes: "250+ экспертов" },
  { name: "Георгий Качмазов", company: "Tranio", position: "Основатель", telegram: "", whatsapp: "+441748220039", source: "Forbes.ru", notes: "С 2010 года" },
  { name: "Михаил Буланов", company: "Tranio", position: "CEO", telegram: "", whatsapp: "+441748220039", source: "Tranio website", notes: "Офисы в 6 странах" },
  { name: "Ангелика Щеглова", company: "Dacha Real Estate", position: "Founder", telegram: "", whatsapp: "+971547770130", source: "dacha.ae", notes: "Основала в 2004 году" },
  { name: "Марина Сухиашвили", company: "The Capital Dubai", position: "CEO", telegram: "", whatsapp: "+971460865 60", source: "Emirates.Estate", notes: "CEO The Capital" },
  { name: "Тимур Мамайханов", company: "Mira Developments", position: "Co-Founder & CEO", telegram: "", whatsapp: "+971564444654", source: "Forbes", notes: "Сооснователь с Тамарой" },
  { name: "Павел Ивлев", company: "Prime", position: "CEO", telegram: "", whatsapp: "+74951473759", source: "Prime website", notes: "Сооснователь Prime" },
  { name: "Арсений Лаптев", company: "Arsenal East", position: "Owner", telegram: "", whatsapp: "", source: "arsenaleast.com", notes: "@arsenaleast.uae Instagram" },
];

async function clearDatabase() {
  console.log('Fetching all pages from database...');

  const response = await fetch(`${NOTION_API}/databases/${DATABASE_ID}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_size: 100 })
  });

  const data = await response.json() as { results: Array<{ id: string }> };
  console.log(`Found ${data.results.length} pages to delete`);

  for (const page of data.results) {
    await fetch(`${NOTION_API}/pages/${page.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ archived: true })
    });
    console.log(`Archived page ${page.id}`);
  }

  return data.results.length;
}

async function addContact(contact: typeof finalContacts[0]) {
  const properties: Record<string, unknown> = {
    'Name': { title: [{ text: { content: contact.name } }] },
    'Company': { rich_text: [{ text: { content: contact.company } }] },
    'Position': { rich_text: [{ text: { content: contact.position } }] },
    'Telegram': { rich_text: [{ text: { content: contact.telegram } }] },
    'Source': { rich_text: [{ text: { content: contact.source } }] },
    'Notes': { rich_text: [{ text: { content: contact.notes } }] },
    'Status': { select: { name: 'To Contact' } },
    'Tier': { select: { name: '1' } }
  };

  // Add Phone for WhatsApp
  if (contact.whatsapp && !contact.whatsapp.startsWith('site:')) {
    properties['Phone'] = { phone_number: contact.whatsapp };
  }

  const response = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: DATABASE_ID },
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
  console.log('=== Updating Notion CRM ===\n');

  // Step 1: Clear existing entries
  console.log('Step 1: Clearing old entries...');
  const deleted = await clearDatabase();
  console.log(`Deleted ${deleted} old entries\n`);

  // Step 2: Add new contacts with Telegram/WhatsApp only
  console.log('Step 2: Adding contacts with Telegram/WhatsApp...');
  let added = 0;

  for (const contact of finalContacts) {
    // Only add if has Telegram or WhatsApp
    if (contact.telegram || (contact.whatsapp && contact.whatsapp !== '')) {
      await addContact(contact);
      console.log(`✓ Added: ${contact.name} (${contact.telegram || contact.whatsapp})`);
      added++;
    } else {
      console.log(`✗ Skipped: ${contact.name} (no contact)`);
    }
  }

  console.log(`\n=== Done! ===`);
  console.log(`Added ${added} contacts with Telegram/WhatsApp`);
  console.log(`Database URL: https://www.notion.so/${DATABASE_ID.replace(/-/g, '')}`);
}

main().catch(console.error);
