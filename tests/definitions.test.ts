import { describe, expect, it } from 'vitest';
import definitions from '../src/data/definitions.json';
import keywords from '../src/data/keywords.json';
import { wordOfTheDay, type Definitions } from '../src/core/definitions';
import type { Puzzle } from '../src/core/puzzle';

const puzzle = (...keyWords: string[]) =>
  ({ levels: keyWords.map((keyWord) => ({ keyWord })) }) as unknown as Puzzle;
const defs: Definitions = {
  horse: ['noun', 'a large animal'],
  orbital: ['adjective', 'of or relating to an orbit'],
};

describe('wordOfTheDay', () => {
  it('picks the last level’s key word', () => {
    expect(wordOfTheDay(puzzle('horse', 'planet', 'orbital'), defs)).toEqual({
      word: 'orbital',
      partOfSpeech: 'adjective',
      definition: 'of or relating to an orbit',
    });
  });

  it('falls back to an earlier key word when the last has no definition', () => {
    expect(wordOfTheDay(puzzle('horse', 'planet', 'zzzzzzz'), defs)?.word).toBe('horse');
  });

  it('returns null when no key word has a definition', () => {
    expect(wordOfTheDay(puzzle('aaaaa'), defs)).toBeNull();
  });

  it('ignores names inherited by every object, like "constructor"', () => {
    expect(wordOfTheDay(puzzle('constructor'), {})).toBeNull();
  });
});

describe('definitions.json', () => {
  const all = definitions as unknown as Definitions;
  const keyWords = Object.values(keywords).flat();

  it('covers nearly every key word', () => {
    const covered = keyWords.filter((w) => Object.hasOwn(all, w)).length;
    expect(covered / keyWords.length).toBeGreaterThan(0.9);
  });

  it('only holds key words, with short definitions that never use the word itself', () => {
    const keySet = new Set(keyWords);
    for (const [word, [part, text]] of Object.entries(all)) {
      expect(keySet.has(word)).toBe(true);
      expect(['noun', 'verb', 'adjective', 'adverb']).toContain(part);
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(110);
      expect(text).not.toMatch(new RegExp(`\\b${word}\\b`, 'i'));
    }
  });
});
