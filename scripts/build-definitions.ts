// Builds src/data/definitions.json: one short definition for every key word, from
// Open English WordNet (CC BY 4.0, see CREDITS.md). Reads src/data/keywords.json, so run it
// after build-wordlists.ts (`npm run wordlists` runs both). It never changes the word lists.

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { download, OUT, ROOT, toLines } from './lib.ts';

const WORDNET = {
  name: 'english-wordnet-2025.xml.gz',
  url: 'https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025.xml.gz',
};
const OFFENSIVE = {
  name: 'ldnoobw-en.txt',
  url: 'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en',
};
/** Longer definitions are cut at a clause break (or a word) so they fit the results card. */
const MAX_LENGTH = 110;
/** When a word is several parts of speech with as many meanings each, prefer them in this order. */
const PART_ORDER = ['n', 'v', 'a', 's', 'r'];
const PART_NAMES: Record<string, string> = {
  n: 'noun',
  v: 'verb',
  a: 'adjective',
  s: 'adjective',
  r: 'adverb',
};

const decode = (text: string) =>
  text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Shortens a definition: first to its first clause, then to whole words with an ellipsis. */
export function shorten(definition: string, max = MAX_LENGTH): string {
  // Drop subject labels like "(astronomy) " at the start.
  let text = definition.replace(/^\([^)]*\)\s*/, '').trim();
  if (text.length > max) text = text.split(';')[0]!.trim();
  if (text.length > max) text = `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
  return text;
}

interface Entry {
  part: string;
  synsets: string[];
}

async function main(): Promise<void> {
  const keywords: Record<string, string[]> = JSON.parse(
    readFileSync(join(OUT, 'keywords.json'), 'utf8'),
  );
  const wanted = new Set(Object.values(keywords).flat());
  const [wordnetRaw, offensiveRaw] = await Promise.all([
    download(WORDNET.name, WORDNET.url),
    download(OFFENSIVE.name, OFFENSIVE.url),
  ]);
  const banned = new Set(
    [
      ...toLines(offensiveRaw.toString('utf8')),
      ...toLines(readFileSync(join(ROOT, 'scripts', 'blocklist.txt'), 'utf8')),
    ].map((w) => w.toLowerCase()),
  );
  const isClean = (text: string) =>
    !text
      .toLowerCase()
      .split(/[^a-z]+/)
      .some((w) => banned.has(w));

  // One pass over the XML: entries (word → senses, most common first) and synset definitions.
  const entries = new Map<string, Entry[]>();
  const definitions = new Map<string, string>();
  let entry: Entry | null = null;
  let synset: string | null = null;
  for (const line of gunzipSync(wordnetRaw).toString('utf8').split('\n')) {
    let m;
    if ((m = /<Lemma writtenForm="([^"]*)" partOfSpeech="(\w)"/.exec(line))) {
      const word = decode(m[1]!);
      entry = null;
      if (!wanted.has(word)) continue;
      entry = { part: m[2]!, synsets: [] };
      entries.set(word, [...(entries.get(word) ?? []), entry]);
    } else if (entry && (m = /<Sense [^>]*synset="([^"]+)"/.exec(line))) {
      entry.synsets.push(m[1]!);
    } else if (line.includes('</LexicalEntry>')) {
      entry = null;
    } else if ((m = /<Synset id="([^"]+)"/.exec(line))) {
      synset = m[1]!;
    } else if (synset && (m = /<Definition>(.*)<\/Definition>/.exec(line))) {
      if (!definitions.has(synset)) definitions.set(synset, decode(m[1]!));
    }
  }

  const result: Record<string, [string, string]> = {};
  const missing: string[] = [];
  for (const word of [...wanted].sort()) {
    // The part of speech with the most meanings is usually the everyday one ("orbit" the noun).
    const choices = [...(entries.get(word) ?? [])].sort(
      (x, y) =>
        y.synsets.length - x.synsets.length ||
        PART_ORDER.indexOf(x.part) - PART_ORDER.indexOf(y.part),
    );
    // A definition that uses the word itself ("deliver (a speech)") explains nothing.
    const usesWord = new RegExp(`\\b${word}\\b`, 'i');
    const found = choices
      .flatMap((c) =>
        c.synsets.map((id) => ({ part: c.part, text: shorten(definitions.get(id) ?? '') })),
      )
      .find((d) => d.text && isClean(d.text) && !usesWord.test(d.text));
    if (!found) {
      missing.push(word);
      continue;
    }
    result[word] = [PART_NAMES[found.part] ?? '', found.text];
  }

  const file = join(OUT, 'definitions.json');
  writeFileSync(file, `${JSON.stringify(result, null, 1)}\n`);
  console.log(
    `definitions.json: ${Object.keys(result).length} of ${wanted.size} key words, ` +
      `${Math.round(statSync(file).size / 1024)} KB (no definition: ${missing.length})`,
  );
}

await main();
