const NOTION_KEY = process.env.NOTION_KEY;
if (!NOTION_KEY) throw new Error("NOTION_KEY environment variable is required");
const DB_ID = "2f633fbfb00e8178bf12d3a1da03aff2";

const newContacts = [
  { name: "Елена Баширова", company: "Well PRO Real Estate", position: "CEO", telegram: "@nonsquaremeters", phone: "+971542798743", source: "Telegram", notes: "10 лет опыта, 200+ клиентов, 2B руб сделок" },
  { name: "Владислав Блаженнов", company: "Fame Estate", position: "Founder & CEO", telegram: "", phone: "+971483580470", source: "fame-estate.com", notes: "Офисы в Дубае и Бангкоке" },
  { name: "Дарья Блаженнова", company: "Fame Estate", position: "Sales Director", telegram: "", phone: "+971483580470", source: "fame-estate.com", notes: "Сооснователь Fame Estate" },
  { name: "Виктор Слепец", company: "DDA Real Estate", position: "Head of UAE Department", telegram: "", phone: "+971565965009", source: "dda-realestate.com", notes: "Международное агентство с 2007" },
  { name: "Анастасия Яковлева", company: "DDA Real Estate", position: "Эксперт-консультант", telegram: "", phone: "+971509670043", source: "dda-realestate.com", notes: "WhatsApp-консультации" },
  { name: "Дарья Хвостунова", company: "Частный брокер", position: "Брокер", telegram: "", phone: "", source: "Instagram @hvastunova", notes: "500+ квартир, рост x2-3. Ищу TG" },
  { name: "Виктория Миколенко", company: "Частный брокер", position: "Риэлтор", telegram: "", phone: "", source: "Instagram @victoria_mykolenko", notes: "3.6K подписчиков. Дубай/Украина/Карибы" },
  { name: "Екатерина Румянцева", company: "Kalinka Ecosystem", position: "Founder", telegram: "", phone: "+971581962516", source: "kalinka-realty.com", notes: "12x IPA. Instagram @happykate111" },
  { name: "Александр Калинкин", company: "Kalinka Middle East", position: "CEO", telegram: "", phone: "+971581962516", source: "kalinka-realty.com", notes: "250+ экспертов в 15 городах" },
  { name: "Георгий Качмазов", company: "Tranio", position: "Основатель", telegram: "", phone: "+971585000100", source: "tranio.com", notes: "С 2010 года, 700+ партнёров" },
  { name: "Михаил Буланов", company: "Tranio", position: "CEO", telegram: "", phone: "+971585000100", source: "tranio.com", notes: "Офисы в 6 странах" },
  { name: "Павел Ивлев", company: "Prime", position: "CEO", telegram: "", phone: "+971585000100", source: "prime.su", notes: "Сооснователь Prime. IPA Awards" },
  { name: "Евгения Тимофеенко", company: "Mayak Real Estate", position: "Founder & CEO", telegram: "", phone: "+971586908803", source: "mayak.ae", notes: "18+ лет опыта" },
];

// Remove entries without any TG or phone
const valid = newContacts.filter(c => c.telegram || c.phone);

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
  console.log(`=== Добавляю ${valid.length} новых контактов ===\n`);
  let ok = 0;
  for (const c of valid) {
    const success = await addContact(c);
    console.log(success ? `✓ ${c.name} | ${c.telegram || c.phone}` : `✗ ${c.name}`);
    if (success) ok++;
  }
  console.log(`\nДобавлено: ${ok}/${valid.length}`);
}
main();
