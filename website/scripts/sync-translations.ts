/**
 * Translation sync checker.
 * Compares all locale JSON files against the default (en.json)
 * and reports missing or extra keys.
 *
 * Usage: npx tsx scripts/sync-translations.ts
 */

import { readFileSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(__dirname, "../src/messages");
const DEFAULT_LOCALE = "en";
const LOCALES = ["en", "ru", "ar"];

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadJson(locale: string): Record<string, unknown> {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

let hasErrors = false;

const defaultMessages = loadJson(DEFAULT_LOCALE);
const defaultKeys = new Set(flattenKeys(defaultMessages));

for (const locale of LOCALES) {
  if (locale === DEFAULT_LOCALE) continue;

  const messages = loadJson(locale);
  const localeKeys = new Set(flattenKeys(messages));

  const missing = Array.from(defaultKeys).filter((k) => !localeKeys.has(k));
  const extra = Array.from(localeKeys).filter((k) => !defaultKeys.has(k));

  if (missing.length > 0) {
    hasErrors = true;
    console.error(`\n[${locale}] Missing ${missing.length} keys:`);
    missing.forEach((k) => console.error(`  - ${k}`));
  }

  if (extra.length > 0) {
    hasErrors = true;
    console.error(`\n[${locale}] Extra ${extra.length} keys (not in ${DEFAULT_LOCALE}):`);
    extra.forEach((k) => console.error(`  + ${k}`));
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[${locale}] OK — all ${defaultKeys.size} keys present`);
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log(`\nAll ${LOCALES.length} locales in sync.`);
}
