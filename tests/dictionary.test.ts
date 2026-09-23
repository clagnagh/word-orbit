import { describe, expect, it } from 'vitest';
import { canBuildFrom, createDictionary, letterCounts } from '../src/core/dictionary';
import words from '../src/data/words.json';
import keywords from '../src/data/keywords.json';

describe('createDictionary', () => {
  const dict = createDictionary(['plant', 'ant', 'tan']);

  it('accepts listed words, in any case', () => {
    expect(dict.isValid('plant')).toBe(true);
    expect(dict.isValid('PLANT')).toBe(true);
    expect(dict.isValid('Ant')).toBe(true);
  });

  it('rejects unlisted words and empty input', () => {
    expect(dict.isValid('plan')).toBe(false);
    expect(dict.isValid('')).toBe(false);
  });

  it('reports its size without duplicates', () => {
    expect(createDictionary(['ant', 'ANT', 'tan']).size).toBe(2);
  });
});

describe('letterCounts', () => {
  it('counts repeated letters', () => {
    expect(letterCounts('eel')).toEqual(
      new Map([
        ['e', 2],
        ['l', 1],
      ]),
    );
  });
});

describe('canBuildFrom', () => {
  it('builds a word from its letters in any order', () => {
    expect(canBuildFrom('plant', ['t', 'n', 'a', 'l', 'p'])).toBe(true);
    expect(canBuildFrom('ant', ['t', 'n', 'a', 'l', 'p'])).toBe(true);
  });

  it('respects letter counts: one tile can only be used once', () => {
    expect(canBuildFrom('eel', ['e', 'l', 'x'])).toBe(false);
    expect(canBuildFrom('eel', ['e', 'e', 'l'])).toBe(true);
    expect(canBuildFrom('eel', ['e', 'e', 'e', 'l'])).toBe(true);
  });

  it('rejects words that need a missing letter', () => {
    expect(canBuildFrom('plane', ['p', 'l', 'a', 'n', 't'])).toBe(false);
  });

  it('is case-insensitive and accepts a string of letters', () => {
    expect(canBuildFrom('PLANT', 'tnalp')).toBe(true);
  });

  it('treats the empty word as buildable', () => {
    expect(canBuildFrom('', ['a'])).toBe(true);
  });
});

describe('generated word lists', () => {
  const dict = createDictionary(words);

  it('contains only lowercase a–z words of 3–7 letters, sorted and unique', () => {
    for (const w of words) expect(w).toMatch(/^[a-z]{3,7}$/);
    expect(new Set(words).size).toBe(words.length);
    expect([...words].sort()).toEqual(words);
  });

  it('is under 1 MB as JSON', () => {
    expect(JSON.stringify(words).length).toBeLessThan(1_000_000);
  });

  it('has key words of each length that are all valid words', () => {
    for (const len of [5, 6, 7] as const) {
      const list = keywords[len];
      expect(list.length).toBeGreaterThan(500);
      for (const w of list) {
        expect(w).toHaveLength(len);
        expect(dict.isValid(w)).toBe(true);
      }
    }
  });

  it('filters offensive and blocked words, but keeps innocent look-alikes', () => {
    for (const w of ['murder', 'murders', 'slave', 'naked']) expect(dict.isValid(w)).toBe(false);
    for (const w of ['spices', 'class', 'grape', 'planet', 'orbit']) {
      expect(dict.isValid(w)).toBe(true);
    }
  });
});
