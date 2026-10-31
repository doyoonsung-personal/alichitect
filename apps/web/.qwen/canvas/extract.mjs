// Pulls the fenced code blocks of a Qwen answer into files: node extract.mjs answer.md outDir
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [, , file, outDir] = process.argv;
const text = readFileSync(file, 'utf8');
const re = /\/\/ ([\w.-]+\.ts)\s*\n```(?:ts|typescript)?\n([\s\S]*?)```/g;
let m;
while ((m = re.exec(text))) {
  writeFileSync(path.join(outDir, m[1]), m[2]);
  console.log('wrote', m[1]);
}
