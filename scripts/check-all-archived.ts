const NOTION_KEY = "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";

const allDeleted = [
  "2f633fbf-b00e-8105-b26d-ffee9eec14fa", // Калинкин
  "2f633fbf-b00e-8105-b7cc-cbabdc50d10e", // AX Capital CIS
  "2f633fbf-b00e-810a-b29d-e5210791ebb2", // Павел Ивлев
  "2f633fbf-b00e-811d-82e3-cbb955fbe16a", // Ковалев
  "2f633fbf-b00e-8121-84ac-edafdc634430", // Буланов
  "2f633fbf-b00e-8121-bc5c-d436a4622408", // Кузнецов
  "2f633fbf-b00e-812b-81e2-fdacead360ae", // Betterhomes
  "2f633fbf-b00e-8135-a816-f4ff746d9d92", // Hayat Estate
  "2f633fbf-b00e-8137-bd08-e079fd9f32b7", // homis
  "2f633fbf-b00e-8143-a4cc-fe3b9baff8cf", // Тимофеенко
  "2f633fbf-b00e-814c-8e1c-d0d30c2c556f", // dubairealestatespace
  "2f633fbf-b00e-814e-aea0-fc9d64899262", // Ангелика Щеглова
  "2f633fbf-b00e-8152-b3a5-d53ba9c58da1", // Espace
  "2f633fbf-b00e-8153-a887-e181bce7b912", // Винокурова
  "2f633fbf-b00e-815d-9518-f6f792bc3411", // Colife
  "2f633fbf-b00e-818d-a545-ef2eee8fd868", // NF Group
  "2f633fbf-b00e-818e-99b1-c17d1a53be18", // Мамайханов
  "2f633fbf-b00e-818e-a7b2-eecfc1f298b8", // Румянцева
  "2f633fbf-b00e-81aa-9828-d911aaf58d5d", // Гетигежева
  "2f633fbf-b00e-81ab-af6a-f9d1ff94d0bc", // Писаренко
  "2f633fbf-b00e-81b3-b109-c7baec7112f4", // Driven
  "2f633fbf-b00e-81b6-b579-e5c7c723c751", // fam
  "2f633fbf-b00e-81b9-9c36-f41f272e5829", // Сухиашвили
  "2f633fbf-b00e-81be-9931-fd706da7de4d", // Алессия
  "2f633fbf-b00e-81d7-b84a-f806d996145a", // Gaurav
  "2f633fbf-b00e-81f5-bf7e-c0a07e7a9a34", // Качмазов
];

async function main() {
  const toRestore: string[] = [];
  for (const id of allDeleted) {
    const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: { "Authorization": `Bearer ${NOTION_KEY}`, "Notion-Version": "2022-06-28" },
    });
    const page: any = await r.json();
    const props = page.properties;
    const name = props["Name"]?.title?.[0]?.plain_text || "?";
    const phone = props["Phone"]?.phone_number || "";
    const tg = props["Telegram"]?.rich_text?.[0]?.plain_text || "";
    const isCompany = !name.includes(" ") && !["Лилия"].includes(name);
    const isRussian = !/^[A-Z]/.test(name) || name === "Anna Bezikova";

    if (phone && phone.startsWith("+971")) {
      console.log(`✅ RESTORE: ${name} | Phone: ${phone} | TG: ${tg}`);
      toRestore.push(id);
    } else if (phone) {
      console.log(`⚠️  HAS PHONE but not +971: ${name} | Phone: ${phone}`);
    } else {
      console.log(`❌ NO PHONE: ${name}`);
    }
  }
  console.log(`\nTo restore: ${toRestore.length}`);
  console.log(JSON.stringify(toRestore));
}
main();
