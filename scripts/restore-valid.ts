const NOTION_KEY = "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";

const idsToRestore = [
  "2f633fbf-b00e-811d-82e3-cbb955fbe16a", // Константин Ковалев
  "2f633fbf-b00e-8121-bc5c-d436a4622408", // Никита Кузнецов
  "2f633fbf-b00e-8143-a4cc-fe3b9baff8cf", // Евгения Тимофеенко
  "2f633fbf-b00e-814e-aea0-fc9d64899262", // Ангелика Щеглова
  "2f633fbf-b00e-8153-a887-e181bce7b912", // Евгения Винокурова
  "2f633fbf-b00e-818e-99b1-c17d1a53be18", // Тимур Мамайханов
  "2f633fbf-b00e-81aa-9828-d911aaf58d5d", // Тамара Гетигежева
  "2f633fbf-b00e-81ab-af6a-f9d1ff94d0bc", // Константин Писаренко
  "2f633fbf-b00e-81b9-9c36-f41f272e5829", // Марина Сухиашвили
  "2f633fbf-b00e-81be-9931-fd706da7de4d", // Алессия Щеглова
];

async function main() {
  console.log(`=== Восстанавливаю ${idsToRestore.length} записей с +971 номерами ===\n`);
  for (const id of idsToRestore) {
    const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: false }),
    });
    const page: any = await r.json();
    const name = page.properties?.["Name"]?.title?.[0]?.plain_text || "?";
    const phone = page.properties?.["Phone"]?.phone_number || "";
    console.log(r.ok ? `✓ ${name} | ${phone}` : `✗ ${id}: ${r.status}`);
  }
  console.log(`\nВосстановлено. Теперь в базе: 13 + 10 = 23 записи`);
  console.log(`Нужно ещё: 27 человек`);
}
main();
