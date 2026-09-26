import { describe, expect, it } from 'vitest';
import { newGame, reduce, totalScore, type Action, type GameState } from '../src/core/game';
import type { Puzzle } from '../src/core/puzzle';
import { fromSaved, SAVE_VERSION, toSaved } from '../src/core/save';

const puzzle: Puzzle = {
  levels: [
    {
      letters: ['e', 't', 'e', 's', 'l'],
      keyWord: 'steel',
      validWords: ['eel', 'eels', 'let', 'lets', 'set', 'sleet', 'steel', 'tee', 'tees'],
    },
    {
      letters: ['t', 'e', 'n', 'a', 'l', 'p'],
      keyWord: 'planet',
      validWords: ['ant', 'lane', 'pan', 'panel', 'plan', 'plane', 'planet', 'plant'],
    },
    {
      letters: ['o', 'r', 'b', 'i', 't', 'a', 'l'],
      keyWord: 'orbital',
      validWords: ['bait', 'boat', 'orbit', 'orbital', 'tab'],
    },
  ],
};

function run(state: GameState, ...actions: Action[]): GameState {
  for (const action of actions) state = reduce(state, action).state;
  return state;
}
const word = (w: string, now: number): Action[] => [
  ...[...w].map((letter): Action => ({ type: 'typeLetter', letter })),
  { type: 'submit', now },
];

/** Save → JSON (as localStorage would store it) → restore. */
const roundTrip = (state: GameState, n = 7) =>
  fromSaved(JSON.parse(JSON.stringify(toSaved(state, n))), puzzle, 7);

const midGame = () =>
  run(
    newGame(puzzle),
    { type: 'start', now: 0 },
    ...word('eel', 1_000),
    ...word('lets', 2_000),
    { type: 'tick', now: 30_000 },
    ...[...'se'].map((letter): Action => ({ type: 'typeLetter', letter })),
  );

describe('save and restore', () => {
  it('keeps level, found words, score and time left', () => {
    const saved = midGame();
    const restored = roundTrip(saved)!;
    expect(restored.phase).toBe('playing');
    expect(restored.levelIndex).toBe(0);
    expect(restored.progress).toEqual(saved.progress);
    expect(totalScore(restored)).toBe(totalScore(saved));
    expect(restored.remainingMs).toBe(60_000);
  });

  it('drops the half-typed word and the combo, and stops the clock until resumed', () => {
    const restored = roundTrip(midGame())!;
    expect(restored.tray).toEqual([]);
    expect(restored.comboTenths).toBe(10);
    expect(restored.lastAcceptedAt).toBeNull();
    // A tick before resuming (e.g. hours later) takes no time off.
    expect(reduce(restored, { type: 'tick', now: 9_999_999 }).state.remainingMs).toBe(60_000);
  });

  it('counts time again from the moment it is resumed', () => {
    const resumed = run(
      roundTrip(midGame())!,
      { type: 'resume', now: 500_000 },
      { type: 'tick', now: 510_000 },
    );
    expect(resumed.remainingMs).toBe(50_000);
  });

  it('restores a finished game as finished', () => {
    const finished = run(
      newGame(puzzle),
      { type: 'start', now: 0 },
      { type: 'tick', now: 90_000 },
      { type: 'nextLevel', now: 91_000 },
      { type: 'tick', now: 181_000 },
      { type: 'nextLevel', now: 182_000 },
      ...word('orbital', 183_000),
    );
    expect(finished.phase).toBe('over');
    expect(roundTrip(finished)!.phase).toBe('over');
  });

  it('only resumes a game that is being played', () => {
    const fresh = newGame(puzzle);
    expect(reduce(fresh, { type: 'resume', now: 5 }).state).toBe(fresh);
  });
});

describe('ignoring saved data that does not fit', () => {
  const good = () => JSON.parse(JSON.stringify(toSaved(midGame(), 7)));

  it.each([
    ['another day’s puzzle', () => ({ ...good(), puzzleNumber: 6 })],
    ['an older save format', () => ({ ...good(), version: SAVE_VERSION + 1 })],
    ['an unknown phase', () => ({ ...good(), phase: 'paused' })],
    ['a level that does not exist', () => ({ ...good(), levelIndex: 3 })],
    ['more time than the level allows', () => ({ ...good(), remainingMs: 999_999 })],
    [
      'a word that is not in the level',
      () => {
        const g = good();
        g.progress[0].foundWords.push('zzz');
        return g;
      },
    ],
    ['missing fields', () => ({ version: SAVE_VERSION, puzzleNumber: 7 })],
    ['not an object', () => 'hello'],
    ['null', () => null],
  ])('returns null for %s', (_, make) => {
    expect(fromSaved(make(), puzzle, 7)).toBeNull();
  });
});
