// Plays a whole daily puzzle through the reducer, with no graphics — the Milestone 2 goal.
import { describe, expect, it } from 'vitest';
import { puzzleNumberFor } from '../src/core/daily';
import {
  newGame,
  reduce,
  summarize,
  type Action,
  type GameEvent,
  type GameState,
} from '../src/core/game';
import { generateDailyPuzzle, isFullWord, type WordLists } from '../src/core/puzzle';
import { shareText } from '../src/core/share';
import {
  displayStreak,
  loadStats,
  recordGame,
  saveStats,
  type KeyValueStorage,
} from '../src/core/stats';
import words from '../src/data/words.json';
import keywords from '../src/data/keywords.json';

const lists: WordLists = { words, keywords };

function play(state: GameState, actions: Action[]) {
  const events: GameEvent[] = [];
  for (const action of actions) {
    const step = reduce(state, action);
    state = step.state;
    events.push(...step.events);
  }
  return { state, events };
}

const typeAndSubmit = (word: string, now: number): Action[] => [
  ...[...word].map((letter): Action => ({ type: 'typeLetter', letter })),
  { type: 'submit', now },
];

describe('a full daily game', () => {
  const puzzleNumber = puzzleNumberFor(new Date(2026, 9, 1)); // launch day
  const puzzle = generateDailyPuzzle(puzzleNumber, lists);
  const [l1, l2] = puzzle.levels;
  const bonus = (i: 0 | 1 | 2) => {
    const level = puzzle.levels[i]!;
    return level.validWords.filter((w) => !isFullWord(level, w));
  };

  // Level 1: two quick bonus words, a wrong word, then the key word.
  // Level 2: one bonus word, then the key word 20 s in.
  // Level 3: three bonus words, then time runs out.
  const t1 = 0;
  const t2 = 100_000;
  const t3 = 200_000;
  const { state, events } = play(newGame(puzzle), [
    { type: 'start', now: t1 },
    ...typeAndSubmit(bonus(0)[0]!, t1 + 2_000),
    ...typeAndSubmit(bonus(0)[1]!, t1 + 4_000),
    { type: 'tapLetter', tileId: 0 },
    { type: 'tapLetter', tileId: 0 }, // ignored: same tile twice
    { type: 'submit', now: t1 + 5_000 }, // one letter: too short
    ...typeAndSubmit(l1!.keyWord, t1 + 10_000),
    { type: 'nextLevel', now: t2 },
    ...typeAndSubmit(bonus(1)[0]!, t2 + 3_000),
    ...typeAndSubmit(l2!.keyWord, t2 + 20_000),
    { type: 'nextLevel', now: t3 },
    ...typeAndSubmit(bonus(2)[0]!, t3 + 1_000),
    ...typeAndSubmit(bonus(2)[1]!, t3 + 2_000),
    ...typeAndSubmit(bonus(2)[2]!, t3 + 3_000),
    ...typeAndSubmit(bonus(2)[2]!, t3 + 4_000), // duplicate
    { type: 'tick', now: t3 + 45_000 },
    { type: 'tick', now: t3 + 90_000 },
  ]);

  it('produces the expected sequence of events', () => {
    expect(events.map((e) => e.type)).toEqual([
      'levelStarted',
      'wordAccepted',
      'wordAccepted',
      'wordRejected',
      'wordAccepted',
      'keyWordFound',
      'levelEnded',
      'levelStarted',
      'wordAccepted',
      'wordAccepted',
      'keyWordFound',
      'levelEnded',
      'levelStarted',
      'wordAccepted',
      'wordAccepted',
      'wordAccepted',
      'wordRejected',
      'levelEnded',
      'gameOver',
    ]);
    expect(events.filter((e) => e.type === 'wordRejected').map((e) => e.reason)).toEqual([
      'tooShort',
      'alreadyFound',
    ]);
  });

  it('adds up the score from the rules in PLAN.md', () => {
    // Words that use the level's lucky star tile score ×2; each accepted event says which did.
    const accepted = events.filter((e) => e.type === 'wordAccepted');
    const x = (i: number) => (accepted[i]?.lucky ? 2 : 1);
    const s = (w: string) => 10 * w.length ** 2;
    const b0 = bonus(0);
    const b1 = bonus(1);
    const b2 = bonus(2);
    const level1 =
      s(b0[0]!) * x(0) +
      Math.round(s(b0[1]!) * 1.1) * x(1) + // within 5 s → combo ×1.1
      s(l1!.keyWord) * 2 + // the rejected word reset the combo; key words always use the lucky tile
      (500 * 1 + 5 * 80); // key word bonus with 80 s left
    const level2 = s(b1[0]!) * x(3) + s(l2!.keyWord) * 2 + (500 * 2 + 5 * 70); // 17 s gap: no combo
    const level3 =
      s(b2[0]!) * x(5) + Math.round(s(b2[1]!) * 1.1) * x(6) + Math.round(s(b2[2]!) * 1.2) * x(7);
    const expected = level1 + level2 + level3;
    expect(accepted.every((e) => !e.supernova)).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'gameOver', score: expected });
    expect(summarize(state).score).toBe(expected);
  });

  it('ends in the "over" phase and summarises each level', () => {
    expect(state.phase).toBe('over');
    expect(summarize(state).levels).toEqual([
      { keyWordFound: true, wordCount: 3 },
      { keyWordFound: true, wordCount: 2 },
      { keyWordFound: false, wordCount: 3 },
    ]);
  });

  it('records stats and makes a share text without spoilers', () => {
    const data = new Map<string, string>();
    const storage: KeyValueStorage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
    };
    const summary = summarize(state);
    saveStats(storage, recordGame(loadStats(storage), puzzleNumber, summary.score));
    const stats = loadStats(storage);
    expect(stats.played).toBe(1);

    const text = shareText(puzzleNumber, summary, displayStreak(stats, puzzleNumber));
    expect(text).toBe(
      `Word Orbit #1 🪐\n🟩🟩🟨\n${summary.score.toLocaleString('en-US')} pts · 8 words · 🔥1\nwordorbit.example`,
    );
  });
});

describe('share text never reveals answers', () => {
  // The fixed parts of the template are allowed; everything else must be counts and emoji.
  const TEMPLATE =
    /^Word Orbit #\d+ 🪐\n(🟩|🟨|🟥){3}\n[\d,]+ pts · \d+ words? · 🔥\d+\nwordorbit\.example$/u;

  it.each([1, 2, 30, 365])('puzzle #%i, with every word found', (n) => {
    const puzzle = generateDailyPuzzle(n, lists);
    // Find every bonus word, then the key word, on each level.
    let state = reduce(newGame(puzzle), { type: 'start', now: 0 }).state;
    let now = 0;
    puzzle.levels.forEach((level, i) => {
      if (i > 0) state = reduce(state, { type: 'nextLevel', now }).state;
      const order = [...level.validWords.filter((w) => !isFullWord(level, w)), level.keyWord];
      for (const w of order) state = play(state, typeAndSubmit(w, (now += 10))).state;
    });
    expect(state.phase).toBe('over');

    const text = shareText(n, summarize(state), 5);
    expect(text).toMatch(TEMPLATE);
    const free = text.replace(/Word Orbit|wordorbit\.example|pts|words?/g, '').toLowerCase();
    for (const level of puzzle.levels) {
      for (const w of level.validWords) expect(free).not.toContain(w);
    }
  });
});
