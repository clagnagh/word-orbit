import { describe, expect, it } from 'vitest';
import {
  displayStreak,
  emptyStats,
  hasPlayed,
  HISTORY_LIMIT,
  loadStats,
  recordGame,
  saveStats,
  STATS_KEY,
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
