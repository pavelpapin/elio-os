const NOTION_KEY = process.env.NOTION_KEY;
if (!NOTION_KEY) throw new Error("NOTION_KEY environment variable is required");

// Check a few archived pages to see ALL their properties
const archivedIds = [
  "2f633fbf-b00e-8105-b26d-ffee9eec14fa", // Александр Калинкин
  "2f633fbf-b00e-811d-82e3-cbb955fbe16a", // Константин Ковалев
  "2f633fbf-b00e-818e-99b1-c17d1a53be18", // Тимур Мамайханов
  "2f633fbf-b00e-81aa-9828-d911aaf58d5d", // Тамара Гетигежева
  "2f633fbf-b00e-8143-a4cc-fe3b9baff8cf", // Евгения Тимофеенко
];

async function main() {
  for (const id of archivedIds) {
    const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        "Authorization": `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    });
    const page: any = await r.json();
    const props = page.properties;
    const name = props["Name"]?.title?.[0]?.plain_text || "?";
    console.log(`\n=== ${name} ===`);
    for (const [key, val] of Object.entries(props)) {
      const v = val as any;
      const text = v?.rich_text?.[0]?.plain_text || v?.title?.[0]?.plain_text || v?.phone_number || v?.number || "";
      if (text) console.log(`  ${key}: ${text}`);
    }
  }
}
main();
