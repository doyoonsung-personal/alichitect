// Adds the console track's strings to src/i18n/strings.json (read-modify-write, adds missing keys only).
// Usage: node .qwen/console/add-strings.mjs .qwen/console/strings-final.json
import { readFileSync, writeFileSync } from 'node:fs';
const target = new URL('../../src/i18n/strings.json', import.meta.url);
const add = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const j = JSON.parse(readFileSync(target, 'utf8'));
let n = 0;
for (const [k, v] of Object.entries(add)) {
  for (const lang of ['en', 'ko', 'zh']) {
    if (typeof v[lang] !== 'string') throw new Error(`${k}: missing ${lang}`);
    if (!Object.hasOwn(j[lang], k)) {
      j[lang][k] = v[lang];
      n++;
    }
  }
}
writeFileSync(target, JSON.stringify(j, null, 2) + '\n');
console.log(`added ${n} entries`);
