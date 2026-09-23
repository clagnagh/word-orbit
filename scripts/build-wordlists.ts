// Builds src/data/words.json and src/data/keywords.json from open word lists.
// Run with `npm run wordlists` (needs Node 22.18+ for built-in TypeScript support).
// Sources and licences are listed in CREDITS.md.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'scripts', '.cache');
const OUT = join(ROOT, 'src', 'data');

const SOURCES = {
  enable: 'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt',
  scowl:
    'https://sourceforge.net/projects/wordlist/files/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz/download',
  offensive:
    'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en',
};

const MIN_WORD = 3;
const MAX_WORD = 7;
const KEYWORD_LENGTHS = [5, 6, 7] as const;
// SCOWL sizes 10 and 20 hold the most common English words.
const SCOWL_COMMON_FILES = ['english-words.10', 'english-words.20'];
const MAX_WORDS_JSON_BYTES = 1_000_000;

async function download(name: string, url: string): Promise<Buffer> {
  const file = join(CACHE, name);
  if (existsSync(file)) return readFileSync(file);
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const data = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, data);
  return data;
}

/** Minimal reader for a .tar archive: returns the files whose name ends with one of `wanted`. */
function extractFromTar(tar: Buffer, wanted: string[]): Map<string, Buffer> {
  const found = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.toString('latin1', 0, 100).replace(/\0.*$/s, '');
    if (!name) break;
    const size = parseInt(header.toString('latin1', 124, 136).replace(/\0.*$/s, '').trim(), 8);
    const body = offset + 512;
    const match = wanted.find((w) => name.endsWith(`/${w}`));
    if (match) found.set(match, tar.subarray(body, body + size));
    offset = body + Math.ceil(size / 512) * 512;
  }
  return found;
}

function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

/** Possible base forms of an inflected word: "horses" → "horse", "hoping" → "hope", "tried" → "try". */
function baseForms(word: string): string[] {
  const forms: string[] = [];
  const cut = (n: number) => word.slice(0, -n);
  if (word.endsWith('s')) forms.push(cut(1));
  if (word.endsWith('es')) forms.push(cut(2));
  if (word.endsWith('ies')) forms.push(`${cut(3)}y`);
  if (word.endsWith('ed')) {
    forms.push(cut(1), cut(2));
    if (word.endsWith('ied')) forms.push(`${cut(3)}y`);
    if (word.at(-3) === word.at(-4)) forms.push(cut(3)); // stopped → stop
  }
  if (word.endsWith('ing')) {
    forms.push(cut(3), `${cut(3)}e`);
    if (word.at(-4) === word.at(-5)) forms.push(cut(4)); // running → run
  }
  return forms.filter((f) => f.length >= MIN_WORD);
}

async function main(): Promise<void> {
  const [enableRaw, scowlRaw, offensiveRaw] = await Promise.all([
    download('enable1.txt', SOURCES.enable),
    download('scowl-2020.12.07.tar.gz', SOURCES.scowl),
    download('ldnoobw-en.txt', SOURCES.offensive),
  ]);

  const banned = new Set(
    [
      ...toLines(offensiveRaw.toString('utf8')),
      ...toLines(readFileSync(join(ROOT, 'scripts', 'blocklist.txt'), 'utf8')),
    ]
      .map((w) => w.toLowerCase())
      .filter((w) => /^[a-z]+$/.test(w)),
  );
  const inLength = new RegExp(`^[a-z]{${MIN_WORD},${MAX_WORD}}$`);
  const allWords = new Set(toLines(enableRaw.toString('utf8')).filter((w) => inLength.test(w)));

  // "murders" is banned via "murder", but "spices" is not banned via "spic",
  // because it's also the plural of the clean word "spice".
  const isBanned = (w: string) => {
    if (banned.has(w)) return true;
    const bases = baseForms(w).filter((b) => allWords.has(b) || banned.has(b));
    return bases.some((b) => banned.has(b)) && !bases.some((b) => !banned.has(b));
  };

  const words = [...allWords].filter((w) => !isBanned(w)).sort();
  const wordSet = new Set(words);

  const scowlFiles = extractFromTar(gunzipSync(scowlRaw), SCOWL_COMMON_FILES);
  if (scowlFiles.size !== SCOWL_COMMON_FILES.length) {
    throw new Error(`SCOWL archive is missing some of: ${SCOWL_COMMON_FILES.join(', ')}`);
  }
  const common = new Set([...scowlFiles.values()].flatMap((f) => toLines(f.toString('latin1'))));

  const keywords: Record<string, string[]> = {};
  for (const len of KEYWORD_LENGTHS) {
    keywords[len] = words.filter(
      (w) => w.length === len && common.has(w) && !baseForms(w).some((base) => wordSet.has(base)),
    );
  }

  mkdirSync(OUT, { recursive: true });
  const wordsJson = JSON.stringify(words);
  if (wordsJson.length > MAX_WORDS_JSON_BYTES) {
    throw new Error(
      `words.json is ${wordsJson.length} bytes, over the ${MAX_WORDS_JSON_BYTES} limit`,
    );
  }
  writeFileSync(join(OUT, 'words.json'), `${wordsJson}\n`);
  writeFileSync(join(OUT, 'keywords.json'), `${JSON.stringify(keywords, null, 1)}\n`);

  const kb = (file: string) => `${Math.round(statSync(join(OUT, file)).size / 1024)} KB`;
  console.log(`words.json:    ${words.length} words, ${kb('words.json')}`);
  console.log(
    `keywords.json: ${KEYWORD_LENGTHS.map((l) => `${keywords[l]?.length} × ${l}-letter`).join(', ')}, ${kb('keywords.json')}`,
  );
}

await main();
