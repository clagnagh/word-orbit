import { seedFor } from './daily.ts';
import { canBuildFrom } from './dictionary.ts';
import { createRng, hashString, type Rng } from './rng.ts';
import { LEVELS, MIN_BONUS_WORDS, MIN_WORD_LENGTH } from './rules.ts';

export interface WordLists {
  /** Every valid word, 3–7 lowercase letters. */
  readonly words: readonly string[];
  /** Candidate key words, grouped by length ("5", "6", "7"). */
  readonly keywords: Readonly<Record<string, readonly string[]>>;
}

export interface Level {
  /** The tiles, shuffled. Letters may repeat. */
  readonly letters: readonly string[];
  readonly keyWord: string;
  /** Every valid word buildable from the tiles, sorted. Includes the key word. */
  readonly validWords: readonly string[];
}

export interface Puzzle {
  readonly levels: readonly Level[];
}

/** Gives up after this many bad candidates, which only happens with broken word lists. */
const MAX_ATTEMPTS = 100;
const MAX_SHUFFLES = 20;

/** Words using all of a level's letters. The key word always counts; so do its anagrams. */
export function isFullWord(level: Level, word: string): boolean {
  return word.length === level.letters.length && level.validWords.includes(word);
}

export function bonusWordCount(level: Level): number {
  return level.validWords.filter((w) => w.length < level.letters.length).length;
}

function buildLevel(keyWord: string, rng: Rng, words: readonly string[]): Level {
  const validWords = words
    .filter((w) => w.length >= MIN_WORD_LENGTH && w.length <= keyWord.length)
    .filter((w) => canBuildFrom(w, keyWord));
  const fullWords = new Set(validWords.filter((w) => w.length === keyWord.length));

  // Re-shuffle until the tiles don't spell the key word (or an anagram of it) in order.
  let letters = rng.shuffle([...keyWord]);
  for (let i = 0; i < MAX_SHUFFLES && fullWords.has(letters.join('')); i++) {
    letters = rng.shuffle([...keyWord]);
  }
  return { letters, keyWord, validWords };
}

function keywordsOfLength(lists: WordLists, length: number): readonly string[] {
  const list = lists.keywords[length];
  if (!list || list.length === 0) throw new Error(`No ${length}-letter key words`);
  return list;
}

/**
 * Tries candidates in order until one makes a level with enough bonus words.
 * Deterministic: the same candidates and rng always give the same level.
 */
function firstGoodLevel(
  candidate: (attempt: number) => string,
  rng: Rng,
  words: readonly string[],
): Level {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const level = buildLevel(candidate(attempt), rng, words);
    if (bonusWordCount(level) >= MIN_BONUS_WORDS) return level;
  }
  throw new Error(`No key word with ${MIN_BONUS_WORDS}+ bonus words after ${MAX_ATTEMPTS} tries`);
}

/** Random puzzle for a seed (Endless mode). Key words can repeat between seeds. */
export function generatePuzzle(seed: number, lists: WordLists): Puzzle {
  const rng = createRng(seed);
  return {
    levels: LEVELS.map(({ letters }) => {
      const candidates = keywordsOfLength(lists, letters);
      return firstGoodLevel(() => rng.pick(candidates), rng, lists.words);
    }),
  };
}

/**
 * The key-word order for daily puzzles: every candidate of a length, shuffled once with a fixed
 * seed. Day n uses entry n, so no key word repeats until the whole list has been used.
 */
export function dailyKeywordOrder(lists: WordLists, length: number): string[] {
  const order = createRng(hashString(`word-orbit:keywords:${length}`));
  return order.shuffle(keywordsOfLength(lists, length));
}

/** The daily puzzle: the same for everyone on the same puzzle number. */
export function generateDailyPuzzle(puzzleNumber: number, lists: WordLists): Puzzle {
  const rng = createRng(seedFor(puzzleNumber));
  return {
    levels: LEVELS.map(({ letters }) => {
      const order = dailyKeywordOrder(lists, letters);
      const start = puzzleNumber - 1;
      const at = (attempt: number) => {
        const i = (((start + attempt) % order.length) + order.length) % order.length;
        return order[i] as string;
      };
      return firstGoodLevel(at, rng, lists.words);
    }),
  };
}
