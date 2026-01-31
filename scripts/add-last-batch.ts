const NOTION_KEY = "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";
const DB_ID = "2f633fbfb00e8178bf12d3a1da03aff2";

const newContacts = [
  { name: "Ильнара Музафьярова", company: "Colife", position: "CEO", telegram: "", phone: "+971585876870", source: "She Owns It podcast", notes: "500+ квартир в управлении. Дубай/Стамбул" },
  { name: "Дарья Хвостунова", company: "Частный брокер", position: "Брокер", telegram: "", phone: "+971545408737", source: "Instagram @hvastunova", notes: "500+ квартир продано. Рост x2-3" },
  { name: "Сергей Гипш", company: "NF Group Middle East", position: "Partner", telegram: "", phone: "+971503551928", source: "nfgroup.ae", notes: "Бывший Knight Frank Russia. 28+ лет опыта" },
  { name: "Искандер Халилов", company: "Rustar Real Estate", position: "President", telegram: "", phone: "+971432801040", source: "rustar.ae", notes: "С 2003 года. 3000+ объектов продано" },
  { name: "Дмитрий Зыков", company: "DDA Real Estate", position: "Head of UAE", telegram: "", phone: "+971565965009", source: "dda-realestate.com", notes: "Международное агентство с 2007" },
  { name: "Александр Григорьев", company: "Fame Estate", position: "Project Director", telegram: "", phone: "+971483580470", source: "fame-estate.com", notes: "Офисы в Дубае и Бангкоке" },
  { name: "AKORD (Основатель)", company: "AKORD Real Estate", position: "Founder", telegram: "", phone: "+971585557975", source: "akord.ae", notes: "8 лет на рынке. Элитная недвижимость" },
  { name: "AEMETRIA (Основатель)", company: "AEMETRIA", position: "Founder", telegram: "@aemetriaru", phone: "+971521133555", source: "aemetria.com", notes: "Media City. WhatsApp доступен" },
  { name: "THEBROKS (Основатель)", company: "THEBROKS", position: "Founder", telegram: "", phone: "+971509527873", source: "thebroks.ru", notes: "Инвестиции в недвижимость ОАЭ" },
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
  console.log(`=== Добавляю ${newContacts.length} контактов ===\n`);
  let ok = 0;
  for (const c of newContacts) {
    const success = await addContact(c);
    console.log(success ? `✓ ${c.name} | ${c.telegram || c.phone}` : `✗ ${c.name}`);
    if (success) ok++;
  }
  console.log(`\nДобавлено: ${ok}/${newContacts.length}`);
}
main();
