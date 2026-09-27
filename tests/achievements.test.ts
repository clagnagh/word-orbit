import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_KEY,
  addEarned,
  earnedByGame,
  earnedByStats,
  loadEarned,
  saveEarned,
} from '../src/core/achievements';
import { newGame, reduce, type Action, type GameState } from '../src/core/game';
import { generateDailyPuzzle, isFullWord, type WordLists } from '../src/core/puzzle';
import { emptyStats, recordGame, type KeyValueStorage } from '../src/core/stats';
import keywords from '../src/data/keywords.json';
import words from '../src/data/words.json';

const lists: WordLists = { words, keywords };
const puzzle = generateDailyPuzzle(1, lists);

const typeAndSubmit = (word: string, now: number): Action[] => [
  ...[...word].map((letter): Action => ({ type: 'typeLetter', letter })),
  { type: 'submit', now },
];

/**
 * Plays puzzle #1. `wordsPerLevel(i)` picks the words to submit (in order) on level i;
 * `gapMs` is the time between words, and the level's clock starts at 0.
 */
function playGame(
  wordsPerLevel: (i: number) => string[],
  { gapMs = 1_000, hint = false } = {},
): GameState {
  let state = reduce(newGame(puzzle), { type: 'start', now: 0 }).state;
  let now = 0;
  for (let i = 0; i < puzzle.levels.length; i++) {
    if (i > 0) state = reduce(state, { type: 'nextLevel', now }).state;
    if (hint) state = reduce(state, { type: 'hint' }).state;
    for (const w of wordsPerLevel(i)) {
      for (const a of typeAndSubmit(w, (now += gapMs))) state = reduce(state, a).state;
    }
    // Run out the clock on levels whose key word wasn't found.
    if (state.phase === 'playing')
      state = reduce(state, { type: 'tick', now: (now += 100_000) }).state;
  }
  return state;
}

const level = (i: number) => puzzle.levels[i]!;
const keyOnly = (i: number) => [level(i).keyWord];
const shorter = (i: number) => level(i).validWords.filter((w) => !isFullWord(level(i), w));

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('earnedByGame', () => {
  it('earns nothing before the game is over', () => {
    expect(earnedByGame(newGame(puzzle))).toEqual([]);
  });

  it('a quick run of key words: First Orbit, Key Master, Quick Draw, Purist', () => {
    const earned = earnedByGame(playGame(keyOnly));
    expect(earned).toEqual(
      expect.arrayContaining(['first-orbit', 'key-master', 'quick-draw', 'purist']),
    );
    expect(earned).not.toContain('wordsmith');
    expect(earned).not.toContain('time-traveller');
  });

  it('no Quick Draw when every key word takes longer than 10 seconds', () => {
    expect(earnedByGame(playGame(keyOnly, { gapMs: 11_000 }))).not.toContain('quick-draw');
  });

  it('a hint rules out Purist but not Key Master', () => {
    const earned = earnedByGame(playGame(keyOnly, { hint: true }));
    expect(earned).toContain('key-master');
    expect(earned).not.toContain('purist');
  });

  it('missing a key word rules out Key Master', () => {
    const earned = earnedByGame(playGame((i) => (i === 0 ? [] : keyOnly(i))));
    expect(earned).toContain('first-orbit');
    expect(earned).not.toContain('key-master');
  });

  it('finding everything: Wordsmith, Clean Sweep, Goal Getter and On Fire', () => {
    const earned = earnedByGame(playGame((i) => [...shorter(i), level(i).keyWord]));
    expect(earned).toEqual(
      expect.arrayContaining(['wordsmith', 'clean-sweep', 'goal-getter', 'on-fire']),
    );
  });

  it('slow words never build the combo, so no On Fire', () => {
    const slow = playGame((i) => [...shorter(i), level(i).keyWord], { gapMs: 6_000 });
    expect(earnedByGame(slow)).not.toContain('on-fire');
  });

  it('archive games earn Time Traveller', () => {
    expect(earnedByGame(playGame(keyOnly), { archive: true })).toContain('time-traveller');
  });
});

describe('earnedByStats', () => {
  it('earns the streak badges at 7 and 30 days', () => {
    let stats = emptyStats();
    for (let n = 1; n <= 6; n++) stats = recordGame(stats, n, 1);
    expect(earnedByStats(stats)).toEqual([]);
    stats = recordGame(stats, 7, 1);
    expect(earnedByStats(stats)).toEqual(['week-streak']);
    for (let n = 8; n <= 30; n++) stats = recordGame(stats, n, 1);
    expect(earnedByStats(stats)).toEqual(['week-streak', 'month-streak']);
  });
});

describe('saving earned achievements', () => {
  it('reports only first-time achievements as new', () => {
    const first = addEarned([], ['first-orbit', 'purist', 'purist']);
    expect(first).toEqual({ earned: ['first-orbit', 'purist'], newly: ['first-orbit', 'purist'] });
    expect(addEarned(first.earned, ['purist', 'on-fire']).newly).toEqual(['on-fire']);
  });

  it('round-trips, dropping unknown ids and surviving damage', () => {
    const storage = memoryStorage();
    expect(saveEarned(storage, ['first-orbit', 'purist'])).toBe(true);
    expect(loadEarned(storage)).toEqual(['first-orbit', 'purist']);
    expect(loadEarned(memoryStorage({ [ACHIEVEMENTS_KEY]: '["purist","made-up"]' }))).toEqual([
      'purist',
    ]);
    expect(loadEarned(memoryStorage({ [ACHIEVEMENTS_KEY]: '{oops' }))).toEqual([]);
    expect(loadEarned(null)).toEqual([]);
  });

  it('every achievement has a unique id', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
