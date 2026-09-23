// Prints a day's puzzle, with answers, for debugging without the browser.
// Usage: npm run puzzle -- 2026-10-01   (no date = today)

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { puzzleNumberFor } from '../src/core/daily.ts';
import { bonusWordCount, generateDailyPuzzle, isFullWord } from '../src/core/puzzle.ts';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const readJson = (file: string): unknown => JSON.parse(readFileSync(join(DATA, file), 'utf8'));

function parseDate(arg: string | undefined): Date {
  if (!arg) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(arg);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  if (!date || date.getDate() !== Number(match?.[3])) {
    console.error(`Expected a date like 2026-10-01, got "${arg}"`);
    process.exit(1);
  }
  return date;
}

const date = parseDate(process.argv[2]);
const puzzleNumber = puzzleNumberFor(date);
const puzzle = generateDailyPuzzle(puzzleNumber, {
  words: readJson('words.json') as string[],
  keywords: readJson('keywords.json') as Record<string, string[]>,
});

console.log(`Word Orbit #${puzzleNumber} — ${date.toDateString()}`);
puzzle.levels.forEach((level, i) => {
  const bonus = level.validWords.filter((w) => !isFullWord(level, w));
  const alsoKey = level.validWords.filter((w) => isFullWord(level, w) && w !== level.keyWord);
  console.log(`\nLevel ${i + 1}: ${level.letters.join(' ').toUpperCase()}`);
  console.log(
    `  Key word: ${level.keyWord.toUpperCase()}${alsoKey.length ? ` (also: ${alsoKey.join(', ')})` : ''}`,
  );
  console.log(`  Bonus words (${bonusWordCount(level)}): ${bonus.join(', ')}`);
});
