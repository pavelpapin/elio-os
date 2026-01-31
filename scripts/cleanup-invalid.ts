const NOTION_KEY = "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";

const idsToDelete = [
  "2f633fbf-b00e-8105-b26d-ffee9eec14fa", // Александр Калинкин - no TG/WA
  "2f633fbf-b00e-8105-b7cc-cbabdc50d10e", // AX Capital CIS - company
  "2f633fbf-b00e-810a-b29d-e5210791ebb2", // Павел Ивлев - no TG/WA
  "2f633fbf-b00e-811d-82e3-cbb955fbe16a", // Константин Ковалев - no TG/WA
  "2f633fbf-b00e-8121-84ac-edafdc634430", // Михаил Буланов - no TG/WA
  "2f633fbf-b00e-8121-bc5c-d436a4622408", // Никита Кузнецов - no TG/WA
  "2f633fbf-b00e-812b-81e2-fdacead360ae", // Betterhomes - company
  "2f633fbf-b00e-8135-a816-f4ff746d9d92", // Hayat Estate - company
  "2f633fbf-b00e-8137-bd08-e079fd9f32b7", // homis - channel not person
  "2f633fbf-b00e-8143-a4cc-fe3b9baff8cf", // Евгения Тимофеенко - no TG/WA
  "2f633fbf-b00e-814c-8e1c-d0d30c2c556f", // @dubairealestatespace - channel
  "2f633fbf-b00e-814e-aea0-fc9d64899262", // Ангелика Щеглова - no TG/WA
  "2f633fbf-b00e-8152-b3a5-d53ba9c58da1", // Espace Real Estate - company
  "2f633fbf-b00e-8153-a887-e181bce7b912", // Евгения Винокурова - no direct TG
  "2f633fbf-b00e-815d-9518-f6f792bc3411", // Colife Office - company
  "2f633fbf-b00e-818d-a545-ef2eee8fd868", // NF Group - company
  "2f633fbf-b00e-818e-99b1-c17d1a53be18", // Тимур Мамайханов - no TG/WA
  "2f633fbf-b00e-818e-a7b2-eecfc1f298b8", // Екатерина Румянцева - no TG/WA
  "2f633fbf-b00e-81aa-9828-d911aaf58d5d", // Тамара Гетигежева - no TG/WA
  "2f633fbf-b00e-81ab-af6a-f9d1ff94d0bc", // Константин Писаренко - bot not personal
  "2f633fbf-b00e-81b3-b109-c7baec7112f4", // Driven Properties - company
  "2f633fbf-b00e-81b6-b579-e5c7c723c751", // fäm Properties - company
  "2f633fbf-b00e-81b9-9c36-f41f272e5829", // Марина Сухиашвили - no TG/WA
  "2f633fbf-b00e-81be-9931-fd706da7de4d", // Алессия Щеглова - no TG/WA
  "2f633fbf-b00e-81d7-b84a-f806d996145a", // Gaurav Khatri - not Russian
  "2f633fbf-b00e-81f5-bf7e-c0a07e7a9a34", // Георгий Качмазов - no TG/WA
];

async function main() {
  console.log(`=== Удаляю ${idsToDelete.length} невалидных записей ===\n`);
  let ok = 0;
  for (const id of idsToDelete) {
    const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: true }),
    });
    if (r.ok) { ok++; console.log(`✓ ${id}`); }
    else { console.log(`✗ ${id}: ${r.status}`); }
  }
  console.log(`\nУдалено: ${ok}/${idsToDelete.length}`);
  console.log(`Осталось: 13 валидных записей`);
  console.log(`Нужно добавить: 37 новых`);
}
main();
