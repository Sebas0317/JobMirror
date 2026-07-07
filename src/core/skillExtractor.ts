import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Load a small JSON dictionary that maps a canonical skill name to an array of
 * possible textual variants (including synonyms, translations, abbreviations).
 * The file lives under the project root at `resources/skillSynonyms.json`.
 */
const synonymsPath = resolve(process.cwd(), 'resources', 'skillSynonyms.json');
export function loadSynonyms(): Record<string, string[]> {
  return JSON.parse(readFileSync(synonymsPath, { encoding: 'utf-8' })) as Record<string, string[]>;
}
const rawSynonyms = loadSynonyms();

/**
 * Given any free‑form text, return the list of canonical skill names that appear
 * in the text. Matching is case‑insensitive and looks for whole‑word matches.
 */
export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [canonical, variants] of Object.entries(rawSynonyms)) {
    for (const v of variants) {
      const pattern = new RegExp(`\\b${v.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(lower)) {
        found.add(canonical);
        break; // stop checking other variants for this canonical skill
      }
    }
  }
  return Array.from(found);
}
