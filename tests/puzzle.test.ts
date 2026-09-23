import { describe, expect, it } from 'vitest';
import { canBuildFrom, createDictionary } from '../src/core/dictionary';
import {
  bonusWordCount,
  dailyKeywordOrder,
  generateDailyPuzzle,
  generatePuzzle,
  isFullWord,
  type WordLists,
} from '../src/core/puzzle';
import { LEVELS, MIN_BONUS_WORDS } from '../src/core/rules';
import words from '../src/data/words.json';
import keywords from '../src/data/keywords.json';

const lists: WordLists = { words, keywords };
const dict = createDictionary(words);
const sorted = (letters: Iterable<string>) => [...letters].sort().join('');

// Generating a puzzle scans the whole dictionary, so generate the sample once.
const SAMPLE_DAYS = [1, 2, 3, 50, 365, 1000];
const samples = SAMPLE_DAYS.map((n) => ({ n, puzzle: generateDailyPuzzle(n, lists) }));

describe('generateDailyPuzzle', () => {
  it('gives the same puzzle for the same puzzle number', () => {
    expect(generateDailyPuzzle(1, lists)).toEqual(samples[0]?.puzzle);
  });

  it('gives different puzzles on different days', () => {
    const keys = samples.map(({ puzzle }) => puzzle.levels.map((l) => l.keyWord).join());
    expect(new Set(keys).size).toBe(samples.length);
  });

  it('is pinned, so a code change can never silently change a day’s puzzle', () => {
    const p = samples[0]!.puzzle;
    expect(p.levels.map((l) => [l.keyWord, l.letters.join('')])).toMatchInlineSnapshot(`
      [
        [
          "horse",
          "oehsr",
        ],
        [
          "adjust",
          "ajsutd",
        ],
        [
          "caution",
          "otncuai",
        ],
      ]
    `);
  });

  describe.each(samples)('puzzle #$n', ({ puzzle }) => {
    it('has 3 levels of 5, 6 and 7 letters', () => {
      expect(puzzle.levels.map((l) => l.letters.length)).toEqual(LEVELS.map((l) => l.letters));
    });

    it.each([0, 1, 2])('level %i meets every quality rule', (i) => {
      const level = puzzle.levels[i]!;
      expect(keywords[level.letters.length as 5 | 6 | 7]).toContain(level.keyWord);
      expect(sorted(level.letters)).toBe(sorted(level.keyWord));
      expect(bonusWordCount(level)).toBeGreaterThanOrEqual(MIN_BONUS_WORDS);
      expect(isFullWord(level, level.letters.join(''))).toBe(false);
      expect(level.validWords).toContain(level.keyWord);
      expect([...new Set(level.validWords)].sort()).toEqual(level.validWords);
      for (const w of level.validWords) {
        expect(w.length).toBeGreaterThanOrEqual(3);
        expect(dict.isValid(w)).toBe(true);
        expect(canBuildFrom(w, level.letters)).toBe(true);
      }
    });
  });

  it('finds every buildable word, not just some', () => {
    const level = samples[0]!.puzzle.levels[0]!;
    const expected = words.filter((w) => canBuildFrom(w, level.letters));
    expect(level.validWords).toEqual(expected);
  });
});

describe('dailyKeywordOrder', () => {
  it.each(LEVELS.map((l) => l.letters))(
    'uses every %i-letter key word once before repeating',
    (length) => {
      const order = dailyKeywordOrder(lists, length);
      expect(order).toHaveLength(keywords[length as 5 | 6 | 7].length);
      expect(new Set(order).size).toBe(order.length);
      expect(order).toEqual(dailyKeywordOrder(lists, length));
    },
  );

  it('has at least 600 days before any key word repeats', () => {
    for (const { letters } of LEVELS) {
      expect(dailyKeywordOrder(lists, letters).length).toBeGreaterThanOrEqual(600);
    }
  });
});

describe('re-rolling bad candidates', () => {
  // "zzzzz" builds nothing else, so it can never be a level; "parts" has plenty of bonus words.
  const tiny: WordLists = {
    words: [
      'art',
      'arts',
      'pat',
      'pats',
      'par',
      'pars',
      'rap',
      'raps',
      'rat',
      'rats',
      'tar',
      'tars',
      'tap',
      'taps',
      'spa',
      'spat',
      'star',
      'part',
      'parts',
      'strap',
      'traps',
      'prat',
      'zzzzz',
      'zzzzzz',
      'zzzzzzz',
      'aaaaaa',
      'aaaaaaa',
    ].sort(),
    keywords: { 5: ['zzzzz', 'parts'], 6: ['zzzzzz'], 7: ['zzzzzzz'] },
  };

  it('skips candidates with too few bonus words, deterministically', () => {
    const level = (seed: number) =>
      generatePuzzle(seed, { ...tiny, keywords: { ...tiny.keywords, 6: ['parts'], 7: ['parts'] } })
        .levels[0]!;
    // Across 20 seeds, "zzzzz" is picked first about half the time and must be re-rolled.
    for (let seed = 1; seed <= 20; seed++) {
      expect(level(seed).keyWord).toBe('parts');
      expect(level(seed)).toEqual(level(seed));
    }
  });

  it('counts anagrams of the key word as full words, not bonus words', () => {
    const level = generatePuzzle(3, {
      ...tiny,
      keywords: { 5: ['parts'], 6: ['parts'], 7: ['parts'] },
    }).levels[0]!;
    expect(isFullWord(level, 'strap')).toBe(true);
    expect(isFullWord(level, 'traps')).toBe(true);
    expect(isFullWord(level, 'part')).toBe(false);
    expect(bonusWordCount(level)).toBe(level.validWords.length - 3); // parts, strap, traps
  });

  it('throws instead of looping forever when no candidate is good enough', () => {
    expect(() => generatePuzzle(1, tiny)).toThrow(/bonus words/);
  });
});
