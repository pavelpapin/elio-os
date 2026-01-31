const NOTION_KEY = "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";
const DB_ID = "2f633fbfb00e8178bf12d3a1da03aff2";

async function query(cursor?: string) {
  const body: any = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function main() {
  let all: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await query(cursor);
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const contacts = all.map((p: any) => {
    const props = p.properties;
    const text = (prop: any) => prop?.rich_text?.[0]?.plain_text || prop?.title?.[0]?.plain_text || "";
    const num = (prop: any) => prop?.number ?? "";
    return {
      id: p.id,
      num: num(props["#"]),
      name: text(props["Name"]),
      company: text(props["Company"]),
      position: text(props["Position"]),
      telegram: text(props["Telegram"]),
      whatsapp: text(props["WhatsApp/Phone"]),
      source: text(props["Source"]),
      notes: text(props["Notes"]),
    };
  });

  contacts.sort((a, b) => (a.num || 999) - (b.num || 999));
  console.log(JSON.stringify(contacts, null, 2));
  console.log(`\nTotal: ${contacts.length}`);
}

main();
