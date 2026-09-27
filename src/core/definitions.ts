// Picking the word of the day: the definitions themselves are loaded by the game and passed in.

import type { Puzzle } from './puzzle.ts';

/** Word → [part of speech, short definition], as built by scripts/build-definitions.ts. */
export type Definitions = Readonly<Record<string, readonly [string, string]>>;

export interface WordOfTheDay {
  readonly word: string;
  readonly partOfSpeech: string;
  readonly definition: string;
}

/**
 * The longest key word that has a definition: the last level's, or an earlier one's when
 * that word has none. Null if no key word has a definition.
 */
export function wordOfTheDay(puzzle: Puzzle, definitions: Definitions): WordOfTheDay | null {
  for (const level of [...puzzle.levels].reverse()) {
    const entry = Object.hasOwn(definitions, level.keyWord) ? definitions[level.keyWord] : null;
    if (entry) return { word: level.keyWord, partOfSpeech: entry[0], definition: entry[1] };
  }
  return null;
}
