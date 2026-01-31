/**
 * Add 20 more contacts to Real Estate Owners CRM
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

// 20 new contacts with Telegram or WhatsApp
const newContacts = [
  // С Telegram
  { name: "Anna Bezikova", company: "Emirates.Estate", position: "Контакт агрегатора", telegram: "@annabezikova", whatsapp: "", source: "TGStat", notes: "Агрегатор недвижимости ОАЭ @EmiratesEstate" },
  { name: "Hayat Estate", company: "Hayat Estate", position: "Агентство", telegram: "@hayatestate_online", whatsapp: "+905072501073", source: "hayatestate.com", notes: "10 стран. Viber/WhatsApp/Telegram" },
  { name: "AX Capital CIS", company: "AX Capital", position: "Канал компании", telegram: "@axcapital_cis", whatsapp: "+971526728886", source: "TGStat", notes: "2.93K подписчиков. Gaurav Khatri CEO" },
  { name: "7Spaces (Павел)", company: "7Spaces", position: "Основатель", telegram: "7spaces.estate/telegram", whatsapp: "", source: "7spaces.estate", notes: "С 2014 года. Первый TG канал про Дубай" },
  { name: "@dubairealestatespace", company: "Dubai Real Estate Space", position: "Владелец канала", telegram: "@dubairealestatespace", whatsapp: "", source: "telegram-store.com", notes: "Инвестиции в недвижимость Дубая" },

  // С WhatsApp
  { name: "fäm Properties", company: "fäm Properties", position: "Агентство", telegram: "", whatsapp: "+971555508111", source: "famproperties.com", notes: "Firas Al Msaddi - Founder. 30 языков" },
  { name: "Espace Real Estate", company: "Espace Real Estate", position: "Агентство", telegram: "", whatsapp: "+97143069999", source: "espace.ae", notes: "С 2009 года. 150 сотрудников" },
  { name: "Driven Properties", company: "Driven Properties", position: "Агентство", telegram: "", whatsapp: "+971563295500", source: "drivenproperties.com", notes: "Abdullah Alajaji - Founder" },
  { name: "Betterhomes", company: "Betterhomes", position: "Агентство", telegram: "", whatsapp: "+97144090995", source: "bhomes.com", notes: "200+ агентов. 4 офиса" },
  { name: "NF Group Middle East", company: "NF Group", position: "Partner (Сергей Гипш)", telegram: "", whatsapp: "+971503551928", source: "nfgroup.ae", notes: "Бывший Knight Frank Russia" },
  { name: "Евгения Винокурова", company: "Tuimaada Real Estate", position: "Founder", telegram: "", whatsapp: "+971437531780", source: "tuimaada-rs.com", notes: "@evgenya.vinokurova 1M Instagram. Forbes" },
  { name: "Colife Office", company: "Colife", position: "Офис", telegram: "", whatsapp: "+79631013000", source: "colife-invest.com", notes: "Управление недвижимостью. 500+ квартир" },
  { name: "Allsopp & Allsopp", company: "Allsopp & Allsopp", position: "Агентство", telegram: "", whatsapp: "site:allsoppandallsopp.com", source: "allsoppandallsopp.com", notes: "Carl Allsopp CEO. С 2008 года. 481 сотрудник" },
  { name: "Людмила Югай", company: "Lupos Real Estate", position: "CEO", telegram: "", whatsapp: "site:lupos.ae", source: "lupos.ae", notes: "12 лет в продажах. Business Bay" },
  { name: "Оксана Синельникова", company: "Vialina Estate", position: "Founder", telegram: "", whatsapp: "site:vialinaestate.com", source: "vialinaestate.com", notes: "Дубай/Майами/Бали/Москва" },
  { name: "Анастасия Денисова", company: "Realiste AI", position: "CEO / Co-Founder", telegram: "", whatsapp: "site:realiste.ai", source: "Gulf News", notes: "Forbes 30 Under 30. AI $1M/мес" },
  { name: "София Мамедова", company: "Best Skyscrapers", position: "Founder / CEO", telegram: "", whatsapp: "LinkedIn", source: "LinkedIn", notes: "17+ лет опыта. Эксперт Известия" },
  { name: "Арсений Лаптев", company: "Arsenal East", position: "Owner", telegram: "", whatsapp: "site:arsenaleast.com", source: "arsenaleast.com", notes: "@arsenaleast.uae Instagram. Проект Zephyra" },
  { name: "Евгений Богдашкин", company: "Belfort", position: "Co-Founder", telegram: "", whatsapp: "site:belfortinvest.ae", source: "belfortinvest.ae", notes: "Москва/Дубай/Крым. Элитная недвижимость" },
  { name: "Kunal", company: "La Capitale Real Estate", position: "Founder & CEO", telegram: "", whatsapp: "site:lacapitaledubai.com", source: "lacapitaledubai.com", notes: "Работает с RU клиентами" },
];

async function addContact(contact: typeof newContacts[0]) {
  const properties: Record<string, unknown> = {
    'Name': { title: [{ text: { content: contact.name } }] },
    'Company': { rich_text: [{ text: { content: contact.company } }] },
    'Position': { rich_text: [{ text: { content: contact.position } }] },
    'Telegram': { rich_text: [{ text: { content: contact.telegram } }] },
    'Source': { rich_text: [{ text: { content: contact.source } }] },
    'Notes': { rich_text: [{ text: { content: contact.notes } }] },
    'Status': { select: { name: 'To Contact' } },
    'Tier': { select: { name: '2' } }
  };

  // Add Phone for WhatsApp (only real numbers, not "site:" prefixes)
  if (contact.whatsapp && !contact.whatsapp.startsWith('site:') && contact.whatsapp !== 'LinkedIn') {
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
  console.log('Adding 20 more contacts...\n');

  let added = 0;
  for (const contact of newContacts) {
    await addContact(contact);
    const contactInfo = contact.telegram || contact.whatsapp || 'site';
    console.log(`✓ Added: ${contact.name} (${contactInfo})`);
    added++;
  }

  console.log(`\n=== Done! ===`);
  console.log(`Added ${added} new contacts`);
  console.log(`Total in database: 50 contacts`);
  console.log(`Database URL: https://www.notion.so/${DATABASE_ID.replace(/-/g, '')}`);
}

main().catch(console.error);
