import { describe, expect, it } from 'vitest';
import {
  displayStreak,
  emptyStats,
  hasPlayed,
  HISTORY_LIMIT,
  isNewBest,
  loadStats,
  recordGame,
  saveStats,
  STATS_KEY,
  streakAtRisk,
  type KeyValueStorage,
} from '../src/core/stats';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('SecurityError: storage disabled');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('recordGame', () => {
  it('records the first game', () => {
    const s = recordGame(emptyStats(), 10, 500);
    expect(s).toEqual({
      played: 1,
      streak: 1,
      maxStreak: 1,
      bestScore: 500,
      bestPuzzle: null,
      lastPuzzle: 10,
      history: [{ puzzle: 10, score: 500 }],
    });
    expect(hasPlayed(s, 10)).toBe(true);
    expect(hasPlayed(s, 11)).toBe(false);
  });

  it('grows the streak when you played yesterday', () => {
    const s = recordGame(recordGame(recordGame(emptyStats(), 10, 1), 11, 2), 12, 3);
    expect(s.streak).toBe(3);
    expect(s.maxStreak).toBe(3);
  });

  it('resets the streak after a missed day, but keeps the best streak', () => {
    const s = recordGame(recordGame(recordGame(emptyStats(), 10, 1), 11, 2), 13, 3);
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(2);
  });

  it('only counts one play per day', () => {
    const once = recordGame(emptyStats(), 10, 500);
    expect(recordGame(once, 10, 9999)).toBe(once);
  });

  it('keeps the best score and the last 30 games', () => {
    let s = emptyStats();
    for (let day = 1; day <= 40; day++) s = recordGame(s, day, day === 5 ? 9000 : day);
    expect(s.bestScore).toBe(9000);
    expect(s.history).toHaveLength(HISTORY_LIMIT);
    expect(s.history[0]).toEqual({ puzzle: 11, score: 11 });
    expect(s.played).toBe(40);
  });
});

describe('new best', () => {
  it('is never claimed by the very first game', () => {
    expect(isNewBest(recordGame(emptyStats(), 10, 500), 10)).toBe(false);
  });

  it('is claimed only by a score above every earlier game', () => {
    const first = recordGame(emptyStats(), 10, 500);
    expect(isNewBest(recordGame(first, 11, 600), 11)).toBe(true);
    expect(isNewBest(recordGame(first, 11, 500), 11)).toBe(false); // a tie isn't a new best
    const later = recordGame(recordGame(first, 11, 600), 12, 100);
    expect(isNewBest(later, 11)).toBe(true); // still true when looking back at puzzle 11
    expect(isNewBest(later, 12)).toBe(false);
  });
});

describe('streakAtRisk', () => {
  const s = recordGame(recordGame(emptyStats(), 10, 1), 11, 1);
  it('is true the day after playing, until today is played', () => {
    expect(streakAtRisk(s, 12)).toBe(true);
    expect(streakAtRisk(recordGame(s, 12, 1), 12)).toBe(false);
  });
  it('is false with no streak to lose', () => {
    expect(streakAtRisk(emptyStats(), 12)).toBe(false);
    expect(streakAtRisk(s, 13)).toBe(false); // already broken
  });
});

describe('displayStreak', () => {
  const s = recordGame(recordGame(emptyStats(), 10, 1), 11, 2);

  it('shows the streak on the day played and the day after', () => {
    expect(displayStreak(s, 11)).toBe(2);
    expect(displayStreak(s, 12)).toBe(2);
  });

  it('shows 0 once a day has been missed', () => {
    expect(displayStreak(s, 13)).toBe(0);
    expect(displayStreak(emptyStats(), 1)).toBe(0);
  });
});

describe('loading and saving', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const s = recordGame(emptyStats(), 3, 700);
    expect(saveStats(storage, s)).toBe(true);
    expect(loadStats(storage)).toEqual(s);
  });

  it('loads stats saved before bestPuzzle existed', () => {
    const old: Record<string, unknown> = { ...recordGame(emptyStats(), 3, 700) };
    delete old.bestPuzzle;
    const loaded = loadStats(memoryStorage({ [STATS_KEY]: JSON.stringify(old) }));
    expect(loaded.bestScore).toBe(700);
    expect(isNewBest(recordGame(loaded, 4, 800), 4)).toBe(true);
  });

  it('gives fresh stats when nothing is saved or storage is missing', () => {
    expect(loadStats(memoryStorage())).toEqual(emptyStats());
    expect(loadStats(null)).toEqual(emptyStats());
  });

  it.each([
    ['corrupt JSON', '{"played": 3,'],
    ['the wrong shape', '{"played": "lots"}'],
    ['a bad history entry', JSON.stringify({ ...emptyStats(), history: [{ puzzle: 1 }] })],
    ['null', 'null'],
  ])('gives fresh stats for %s', (_, raw) => {
    expect(loadStats(memoryStorage({ [STATS_KEY]: raw }))).toEqual(emptyStats());
  });

  it('never throws when storage itself fails (e.g. private mode)', () => {
    expect(loadStats(brokenStorage)).toEqual(emptyStats());
    expect(saveStats(brokenStorage, emptyStats())).toBe(false);
    expect(saveStats(null, emptyStats())).toBe(false);
  });
});
