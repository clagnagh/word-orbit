import { describe, expect, it } from 'vitest';
import {
  goalProgress,
  levelGoal,
  newGame,
  reduce,
  summarize,
  totalScore,
  trayWord,
  type Action,
  type GameEvent,
  type GameState,
} from '../src/core/game';
import type { Puzzle } from '../src/core/puzzle';

// A hand-made puzzle so every rule can be checked exactly.
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
      validWords: [
        'ant',
        'lane',
        'late',
        'pan',
        'pane',
        'panel',
        'plan',
        'plane',
        'planet',
        'plant',
      ],
    },
    {
      letters: ['o', 'r', 'b', 'i', 't', 'a', 'l'],
      keyWord: 'orbital',
      validWords: ['bait', 'boat', 'orbit', 'orbital', 'tab', 'tar'],
    },
  ],
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** Applies actions in order; returns the final state and every event, in order. */
function run(state: GameState, ...actions: Action[]) {
  const events: GameEvent[] = [];
  for (const action of actions) {
    const step = reduce(deepFreeze(state), action);
    state = step.state;
    events.push(...step.events);
  }
  return { state, events };
}

const type = (word: string): Action[] =>
  [...word].map((letter) => ({ type: 'typeLetter', letter }));
const submitWord = (word: string, now: number): Action[] => [
  ...type(word),
  { type: 'submit', now },
];

const started = () => run(newGame(puzzle), { type: 'start', now: 0 }).state;

describe('starting', () => {
  it('begins level 1 with the full timer', () => {
    const { state, events } = run(newGame(puzzle), { type: 'start', now: 1_000 });
    expect(state.phase).toBe('playing');
    expect(state.levelIndex).toBe(0);
    expect(state.remainingMs).toBe(90_000);
    expect(events).toEqual([{ type: 'levelStarted', level: 1 }]);
  });

  it('ignores play actions before the game starts, and a second start', () => {
    const fresh = newGame(puzzle);
    expect(reduce(fresh, { type: 'tapLetter', tileId: 0 }).state).toBe(fresh);
    expect(reduce(fresh, { type: 'submit', now: 5 }).state).toBe(fresh);
    const s = started();
    expect(reduce(s, { type: 'start', now: 10 }).state).toBe(s);
  });
});

describe('building a word', () => {
  it('adds tapped tiles to the tray', () => {
    const { state } = run(
      started(),
      { type: 'tapLetter', tileId: 3 },
      { type: 'tapLetter', tileId: 1 },
    );
    expect(state.tray).toEqual([3, 1]);
    expect(trayWord(state)).toBe('st');
  });

  it('does not let a tile be tapped twice in the same word', () => {
    const s = run(started(), { type: 'tapLetter', tileId: 0 }).state;
    expect(reduce(s, { type: 'tapLetter', tileId: 0 }).state).toBe(s);
  });

  it('ignores tile ids that do not exist', () => {
    const s = started();
    for (const tileId of [-1, 5, 1.5, NaN]) {
      expect(reduce(s, { type: 'tapLetter', tileId }).state).toBe(s);
    }
  });

  it('typing uses each repeated letter once: two E tiles allow two Es, not three', () => {
    const { state } = run(started(), ...type('EEE'));
    expect(state.tray).toEqual([0, 2]);
    expect(trayWord(state)).toBe('ee');
  });

  it('ignores typed letters that are not on any tile', () => {
    const s = started();
    expect(reduce(s, { type: 'typeLetter', letter: 'z' }).state).toBe(s);
  });

  it('removes the last letter, or clears the tray', () => {
    const s = run(started(), ...type('set')).state;
    expect(trayWord(reduce(s, { type: 'removeLast' }).state)).toBe('se');
    expect(reduce(s, { type: 'clear' }).state.tray).toEqual([]);
  });
});

describe('submitting', () => {
  it('accepts a valid word and scores 10 × length²', () => {
    const { state, events } = run(started(), ...submitWord('eel', 1_000));
    expect(events).toEqual([{ type: 'wordAccepted', word: 'eel', points: 90, comboTenths: 10 }]);
    expect(state.progress[0]?.foundWords).toEqual(['eel']);
    expect(totalScore(state)).toBe(90);
    expect(state.tray).toEqual([]);
  });

  it('does nothing when the tray is empty', () => {
    const s = run(started(), ...submitWord('eel', 1_000)).state;
    const step = reduce(s, { type: 'submit', now: 2_000 });
    expect(step.events).toEqual([]);
    expect(step.state.comboTenths).toBe(s.comboTenths);
  });

  it.each([
    ['ee', 'tooShort'],
    ['tle', 'notAWord'],
  ] as const)('rejects "%s" as %s', (word, reason) => {
    const { state, events } = run(started(), ...submitWord(word, 1_000));
    expect(events).toEqual([{ type: 'wordRejected', word, reason }]);
    expect(totalScore(state)).toBe(0);
    expect(state.tray).toEqual([]);
  });

  it('rejects a word already found as "alreadyFound", not "notAWord"', () => {
    const { events } = run(started(), ...submitWord('eel', 1_000), ...submitWord('eel', 2_000));
    expect(events.at(-1)).toEqual({ type: 'wordRejected', word: 'eel', reason: 'alreadyFound' });
  });
});

describe('combo', () => {
  it('adds ×0.1 per valid word within 5 s of the previous one', () => {
    const { events } = run(
      started(),
      ...submitWord('eel', 1_000),
      ...submitWord('let', 3_000),
      ...submitWord('lets', 8_000),
    );
    expect(
      events.map((e) => (e.type === 'wordAccepted' ? [e.points, e.comboTenths] : e.type)),
    ).toEqual([
      [90, 10],
      [99, 11], // 90 × 1.1
      [192, 12], // 160 × 1.2
    ]);
  });

  it('restarts after more than 5 s', () => {
    const { events } = run(started(), ...submitWord('eel', 1_000), ...submitWord('let', 6_001));
    expect(events.at(-1)).toMatchObject({ points: 90, comboTenths: 10 });
  });

  it('resets on any rejected word, even a duplicate', () => {
    const { events } = run(
      started(),
      ...submitWord('eel', 1_000),
      ...submitWord('eel', 2_000),
      ...submitWord('let', 3_000),
    );
    expect(events.at(-1)).toMatchObject({ word: 'let', comboTenths: 10 });
  });
});

describe('key word', () => {
  it('scores the word, adds 500 × level + 5 × seconds left, and ends the level', () => {
    const { state, events } = run(started(), ...submitWord('steel', 30_000));
    expect(events).toEqual([
      { type: 'wordAccepted', word: 'steel', points: 250, comboTenths: 10 },
      { type: 'keyWordFound', word: 'steel', bonus: 500 + 5 * 60 },
      { type: 'levelEnded', level: 1, reason: 'keyWord' },
    ]);
    expect(state.phase).toBe('levelEnded');
    expect(state.progress[0]?.keyWordFound).toBe(true);
    expect(totalScore(state)).toBe(250 + 800);
  });

  it('accepts an anagram that uses every letter as the key word', () => {
    const { events } = run(started(), ...submitWord('sleet', 1_000));
    expect(events.map((e) => e.type)).toEqual(['wordAccepted', 'keyWordFound', 'levelEnded']);
  });

  it('ignores play actions once the level has ended', () => {
    const s = run(started(), ...submitWord('steel', 1_000)).state;
    expect(reduce(s, { type: 'tapLetter', tileId: 0 }).state).toBe(s);
    expect(reduce(s, { type: 'tick', now: 200_000 }).state).toBe(s);
  });
});

describe('time', () => {
  it('ends the level when the timer reaches 0', () => {
    const almost = run(started(), { type: 'tick', now: 89_999 });
    expect(almost.state.remainingMs).toBe(1);
    expect(almost.events).toEqual([]);
    const { state, events } = run(almost.state, { type: 'tick', now: 90_000 });
    expect(state.remainingMs).toBe(0);
    expect(state.phase).toBe('levelEnded');
    expect(events).toEqual([{ type: 'levelEnded', level: 1, reason: 'timeUp' }]);
  });

  it('does not accept a word submitted after time ran out, even if ticks were late', () => {
    const { state, events } = run(started(), ...submitWord('eel', 95_000));
    expect(events).toEqual([{ type: 'levelEnded', level: 1, reason: 'timeUp' }]);
    expect(totalScore(state)).toBe(0);
  });

  it('never adds time when the clock jumps backwards', () => {
    const { state } = run(
      started(),
      { type: 'tick', now: 10_000 },
      { type: 'tick', now: 4_000 },
      { type: 'tick', now: 5_000 },
    );
    expect(state.remainingMs).toBe(90_000 - 10_000 - 1_000);
  });
});

describe('levels', () => {
  it('starts the next level with a full timer, an empty tray and a fresh combo', () => {
    const ended = run(started(), ...submitWord('eel', 1_000), ...submitWord('steel', 2_000)).state;
    expect(ended.comboTenths).toBe(11);
    const { state, events } = run(ended, { type: 'nextLevel', now: 3_000 });
    expect(events).toEqual([{ type: 'levelStarted', level: 2 }]);
    expect(state).toMatchObject({
      phase: 'playing',
      levelIndex: 1,
      remainingMs: 90_000,
      tray: [],
      comboTenths: 10,
      lastAcceptedAt: null,
    });
  });

  it('ignores nextLevel while a level is still being played', () => {
    const s = started();
    expect(reduce(s, { type: 'nextLevel', now: 1 }).state).toBe(s);
  });

  it('ends the game after level 3', () => {
    const { state, events } = run(
      started(),
      { type: 'tick', now: 90_000 },
      { type: 'nextLevel', now: 100_000 },
      { type: 'tick', now: 190_000 },
      { type: 'nextLevel', now: 200_000 },
      ...submitWord('orbital', 210_000),
    );
    expect(state.phase).toBe('over');
    expect(events.slice(-2)).toEqual([
      { type: 'levelEnded', level: 3, reason: 'keyWord' },
      { type: 'gameOver', score: 490 + 1500 + 5 * 80 },
    ]);
    expect(summarize(state)).toEqual({
      score: 2390,
      wordCount: 1,
      levels: [
        { keyWordFound: false, wordCount: 0 },
        { keyWordFound: false, wordCount: 0 },
        { keyWordFound: true, wordCount: 1 },
      ],
    });
  });
});

describe('mini-goal', () => {
  it('asks for 2 words of one letter fewer than the level', () => {
    expect(levelGoal(puzzle.levels[0]!)).toEqual({ count: 2, length: 4 }); // eels, lets, tees
    expect(levelGoal(puzzle.levels[1]!)).toEqual({ count: 2, length: 5 }); // panel, plane, plant
  });

  it('falls back to a shorter length when the level has fewer than 2 such words', () => {
    // Level 3 has no 6-letter words and only one 5-letter word (orbit), but two 4-letter ones.
    expect(levelGoal(puzzle.levels[2]!)).toEqual({ count: 2, length: 4 });
  });

  it('awards 300 × level once, when the second goal word is found', () => {
    const { state, events } = run(
      started(),
      ...submitWord('eels', 1_000),
      ...submitWord('lets', 20_000),
      ...submitWord('tees', 40_000),
    );
    expect(events.filter((e) => e.type === 'goalCompleted')).toEqual([
      { type: 'goalCompleted', bonus: 300 },
    ]);
    expect(events.map((e) => e.type)).toEqual([
      'wordAccepted',
      'wordAccepted',
      'goalCompleted',
      'wordAccepted',
    ]);
    expect(goalProgress(state)).toBe(2);
    expect(totalScore(state)).toBe(160 * 3 + 300);
  });

  it('does not count words of other lengths', () => {
    const { state, events } = run(
      started(),
      ...submitWord('eel', 1_000),
      ...submitWord('let', 20_000),
    );
    expect(events.some((e) => e.type === 'goalCompleted')).toBe(false);
    expect(goalProgress(state)).toBe(0);
  });

  it('uses level 2 numbers on level 2', () => {
    const level2 = run(started(), ...submitWord('steel', 1_000), { type: 'nextLevel', now: 2_000 });
    const { events } = run(
      level2.state,
      ...submitWord('panel', 3_000),
      ...submitWord('plane', 20_000),
    );
    expect(events.at(-1)).toEqual({ type: 'goalCompleted', bonus: 600 });
  });
});

describe('hint', () => {
  const withScore = () => run(started(), ...submitWord('lets', 1_000)).state; // 160 points

  it('shows the first tile holding the key word’s first letter, and costs 100', () => {
    const { state, events } = run(withScore(), { type: 'hint' });
    // Key word STEEL starts with S, which is tile 3.
    expect(events).toEqual([{ type: 'hintShown', tileId: 3, cost: 100 }]);
    expect(totalScore(state)).toBe(60);
  });

  it('never takes the score below 0', () => {
    const { state, events } = run(started(), { type: 'hint' });
    expect(events).toEqual([{ type: 'hintShown', tileId: 3, cost: 0 }]);
    expect(totalScore(state)).toBe(0);
    const partial = run(started(), ...submitWord('let', 1_000), { type: 'hint' });
    expect(totalScore(partial.state)).toBe(0);
    expect(partial.events.at(-1)).toMatchObject({ cost: 90 });
  });

  it('works once per level; asking again changes nothing', () => {
    const used = run(withScore(), { type: 'hint' }).state;
    const again = reduce(used, { type: 'hint' });
    expect(again.events).toEqual([{ type: 'hintUnavailable' }]);
    expect(again.state).toBe(used);
  });

  it('is available again on the next level', () => {
    const used = run(withScore(), { type: 'hint' }, ...submitWord('steel', 2_000), {
      type: 'nextLevel',
      now: 3_000,
    }).state;
    expect(reduce(used, { type: 'hint' }).events).toEqual([
      { type: 'hintShown', tileId: 5, cost: 100 }, // PLANET starts with P, tile 5
    ]);
  });

  it('only works while playing with an empty tray', () => {
    const typing = run(withScore(), ...type('se')).state;
    expect(reduce(typing, { type: 'hint' }).state).toBe(typing);
    const fresh = newGame(puzzle);
    expect(reduce(fresh, { type: 'hint' }).state).toBe(fresh);
  });
});
