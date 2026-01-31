const NOTION_KEY = "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";
const DB_ID = "2f633fbfb00e8178bf12d3a1da03aff2";

const newContacts = [
  { name: "Антон Москалёв", company: "Visasam / Palladium Group", position: "Founder", telegram: "@Anton_Moskalev", phone: "", source: "Telemetr", notes: "Канал @homeindubai. 8+ лет в Дубае" },
  { name: "Ислам Шангареев", company: "Top Address", position: "Founder", telegram: "", phone: "+971521239411", source: "Business Gazeta", notes: "Из Казани. Эксперт Tatar-inform" },
  { name: "София Мамедова", company: "Adviser Real Estate", position: "CEO", telegram: "@sofiaadviser", phone: "", source: "TGStat", notes: "Канал Недвижимость & Инвестиции Дубай" },
  { name: "Олег Торбосов", company: "Whitewill", position: "Founder", telegram: "", phone: "+97145635256", source: "whitewill.com", notes: "Крупнейшее элитное агентство РФ, офис в Дубае" },
  { name: "Сурен Николян", company: "Only Brokers", position: "Founder", telegram: "@Surmanlive", phone: "+971585080767", source: "Instagram", notes: "Рекордсмен по продажам недвижимости" },
  { name: "Станислав Мальцев", company: "maltsev.ae", position: "Брокер", telegram: "@Maltsev_uae", phone: "", source: "maltsev.ae", notes: "12+ лет опыта" },
  { name: "Анастасия Денисова", company: "Reelly AI", position: "CEO", telegram: "", phone: "+971585930745", source: "Gulf News", notes: "23 года. AI портал $1M/мес" },
];

async function addContact(c: typeof newContacts[0]) {
  const r = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: DB_ID },
      properties: {
        "Name": { title: [{ text: { content: c.name } }] },
        "Company": { rich_text: [{ text: { content: c.company } }] },
        "Position": { rich_text: [{ text: { content: c.position } }] },
        "Telegram": { rich_text: [{ text: { content: c.telegram } }] },
        ...(c.phone ? { "Phone": { phone_number: c.phone } } : {}),
        "Source": { rich_text: [{ text: { content: c.source } }] },
        "Notes": { rich_text: [{ text: { content: c.notes } }] },
      },
    }),
  });
  return r.ok;
}

async function main() {
  console.log(`=== Добавляю ${newContacts.length} новых контактов ===\n`);
  let ok = 0;
  for (const c of newContacts) {
    const success = await addContact(c);
    console.log(success ? `✓ ${c.name} | ${c.telegram || c.phone}` : `✗ ${c.name}`);
    if (success) ok++;
  }
  console.log(`\nДобавлено: ${ok}/${newContacts.length}`);
}
main();
