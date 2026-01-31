/**
 * Add remaining contacts to Real Estate Owners CRM
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

// Remaining contacts not added in first batch
const remainingContacts = [
  { name: "Михаил Буланов", company: "Tranio", position: "CEO", telegram: "", instagram: "", linkedin: "linkedin.com/in/mikhail-bulanov", email: "", phone: "", website: "tranio.com", source: "Tranio website", tier: "1", notes: "Офисы в Дубае/Турции/Таиланде" },
  { name: "Александр Беляев", company: "Beyond Dubai", position: "Генеральный директор", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "beyond-dubai.ae", source: "Kommersant", tier: "1", notes: "Бывший Engel & Volkers" },
  { name: "Павел Ивлев", company: "Prime", position: "CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "prime.su", source: "Prime website", tier: "1", notes: "Сооснователь Prime" },
  { name: "Ангелика Щеглова", company: "Dacha Real Estate", position: "Founder", telegram: "", instagram: "", linkedin: "linkedin.com/in/angelika-cheglova", email: "", phone: "", website: "dacha.ae", source: "dacha.ae", tier: "1", notes: "Основала в 2004 году" },
  { name: "Марина Сухиашвили", company: "The Capital Dubai", position: "CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "thecapitaldubai.com", source: "Emirates.Estate", tier: "1", notes: "CEO The Capital" },
  { name: "Екатерина Румянцева", company: "Kalinka Ecosystem", position: "Founder", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "kalinka-realty.com", source: "kalinka-realty.com", tier: "1", notes: "12x International Property Awards" },
  { name: "Александр Калинкин", company: "Kalinka Middle East", position: "CEO", telegram: "", instagram: "", linkedin: "linkedin.com/in/alexander-kalinkin", email: "", phone: "", website: "kalinka-realty.com", source: "kalinka-realty.com", tier: "1", notes: "250+ экспертов" },
  { name: "Анастасия Денисова", company: "Realiste MENA", position: "CEO / Co-Founder", telegram: "", instagram: "", linkedin: "linkedin.com/in/anastasia-denisova", email: "", phone: "", website: "realiste.com", source: "Gulf News", tier: "1", notes: "Forbes 30 Under 30. AI портал $1M/мес" },
  { name: "Константин Ковалев", company: "Webster", position: "CEO", telegram: "", instagram: "", linkedin: "linkedin.com/in/konstantin-kovalev", email: "", phone: "", website: "websterdubai.ae", source: "Forbes.ru / RBC", tier: "1", notes: "AREA президент" },
  { name: "Оксана Синельникова", company: "Vialina Estate", position: "Founder", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "vialina.estate", source: "Company site", tier: "1", notes: "Дубай/Майами/Бали/Пхукет/Москва" },
  { name: "Арсений Лаптев", company: "Arsenal East", position: "Owner", telegram: "", instagram: "@arsenaleast.uae", linkedin: "", email: "", phone: "", website: "arsenaleast.com", source: "arsenaleast.com", tier: "1", notes: "Проект Zephyra. 28 лет опыта" },
  { name: "Лилия", company: "Alira Real Estate", position: "CEO", telegram: "@lilia_produbai", instagram: "", linkedin: "", email: "", phone: "", website: "alirarealestate.com", source: "Instagram", tier: "2", notes: "Также юрист" },
  { name: "Людмила Югай", company: "Lupos Real Estate", position: "CEO", telegram: "", instagram: "", linkedin: "linkedin.com/in/lyudmila-yugay", email: "", phone: "", website: "lupos.ae", source: "Company site", tier: "2", notes: "12 лет в продажах" },
  { name: "София Мамедова", company: "Best Skyscrapers", position: "Founder / CEO", telegram: "", instagram: "", linkedin: "linkedin.com/in/sofiia-mamedova", email: "", phone: "", website: "bestskyscrapers.com", source: "LinkedIn", tier: "2", notes: "17+ лет опыта" },
  { name: "Евгений Богдашкин", company: "Belfort", position: "Co-Founder", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "belfort-investment.com", source: "Belfort site", tier: "2", notes: "Москва/Дубай/Крым" },
  { name: "Сергей Гипш", company: "NF Group Middle East", position: "Partner", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "nf.group", source: "nf.group", tier: "2", notes: "Knight Frank ребрендинг" },
  { name: "Mike Fleet", company: "Metropolitan Group", position: "Deputy CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "metropolitan.realestate", source: "metropolitan.realestate", tier: "2", notes: "Abu Dhabi + Vienna" },
  { name: "Евгений Рацкевич", company: "Metropolitan Abu Dhabi", position: "CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "metropolitan.realestate", source: "metropolitan.realestate", tier: "2", notes: "Abu Dhabi офис" },
  { name: "Кирилл Дегтярев", company: "Emerald City Properties", position: "CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "emeraldcityproperties.com", source: "RBC Pro", tier: "2", notes: "" },
  { name: "homis", company: "homis про ОАЭ", position: "Владелец канала", telegram: "@homisdubai", instagram: "", linkedin: "", email: "", phone: "", website: "", source: "vc.ru", tier: "2", notes: "Telegram канал" },
  { name: "Виктория", company: "Estate Invest Dubai", position: "Founder", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "myestateinvest.com", source: "myestateinvest.com", tier: "3", notes: "100+ экспертов" },
  { name: "Валерия", company: "Estate Invest Dubai", position: "Co-Founder", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "myestateinvest.com", source: "myestateinvest.com", tier: "3", notes: "Сооснователь Дубай офиса" },
  { name: "Ярослав", company: "Estate Invest Dubai", position: "Head of Dubai", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "myestateinvest.com", source: "myestateinvest.com", tier: "3", notes: "Руководитель офиса" },
  { name: "Лилия (Golden Bee)", company: "Golden Bee RE", position: "Team", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "goldenbee.estate", source: "goldenbee.estate", tier: "3", notes: "Business Bay офис" },
  { name: "Kunal", company: "La Capitale RE", position: "Founder & CEO", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "lacapitaledubai.com", source: "lacapitaledubai.com", tier: "3", notes: "Работает с RU клиентами" },
  { name: "Firas Al Msaddi", company: "fäm Properties", position: "Founder & Owner", telegram: "", instagram: "@firas_al_msaddi", linkedin: "", email: "", phone: "", website: "famproperties.com", source: "WebSearch", tier: "2", notes: "Крупнейшее агентство" },
  { name: "Abdullah Alajaji", company: "Driven Properties", position: "Founder", telegram: "", instagram: "", linkedin: "", email: "", phone: "", website: "drivenproperties.com", source: "WebSearch", tier: "2", notes: "Крупное агентство" },
];

async function addPage(contact: typeof remainingContacts[0]) {
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
  console.log('Adding remaining contacts...');

  for (const contact of remainingContacts) {
    await addPage(contact);
    console.log(`Added: ${contact.name}`);
  }

  console.log(`\n✅ Done! Added ${remainingContacts.length} more contacts.`);
  console.log(`Total in database: ${21 + remainingContacts.length} contacts`);
}

main().catch(console.error);
