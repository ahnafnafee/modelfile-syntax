import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const src = resolve(root, 'syntaxes/modelfile.tmLanguage.yml');
const dst = resolve(root, 'syntaxes/modelfile.tmLanguage.json');

const text = await readFile(src, 'utf8');
const grammar = yaml.load(text);
await mkdir(dirname(dst), { recursive: true });
await writeFile(dst, JSON.stringify(grammar, null, 2) + '\n', 'utf8');
console.log(`[build-grammar] wrote ${dst}`);
