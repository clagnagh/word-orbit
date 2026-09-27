import { describe, expect, it } from 'vitest';
import {
  archiveMonths,
  dayColor,
  isArchiveDay,
  loadResults,
  monthDays,
  recordResult,
  RESULTS_KEY,
  saveResults,
} from '../src/core/archive';
import type { GameSummary } from '../src/core/game';
import type { KeyValueStorage } from '../src/core/stats';

const summary = (score: number, levels: [boolean, number][]): GameSummary => ({
  score,
  wordCount: levels.reduce((n, [, w]) => n + w, 0),
  levels: levels.map(([keyWordFound, wordCount]) => ({ keyWordFound, wordCount })),
});

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('results', () => {
  const perfect = summary(900, [
    [true, 3],
    [true, 2],
    [true, 1],
  ]);
  const some = summary(200, [
    [true, 1],
    [false, 2],
    [false, 0],
  ]);

  it('colours days like the share squares', () => {
    const results = recordResult(recordResult({}, 1, perfect), 2, some);
    expect(dayColor(results[1])).toBe('perfect');
    expect(dayColor(results[2])).toBe('played');
    expect(dayColor(recordResult({}, 3, summary(0, [[false, 0]]))[3])).toBe('empty');
    expect(dayColor(results[4])).toBe('unplayed');
  });

  it('keeps the better result when a day is replayed', () => {
    const results = recordResult({}, 1, perfect);
    expect(recordResult(results, 1, some)).toBe(results);
    expect(recordResult(recordResult({}, 1, some), 1, perfect)[1]?.score).toBe(900);
  });

  it('round-trips and drops damaged entries', () => {
    const storage = memoryStorage();
    const results = recordResult({}, 1, perfect);
    saveResults(storage, results);
    expect(loadResults(storage)).toEqual(results);
    const damaged = JSON.stringify({ 1: { score: 5, levels: [2] }, 2: { score: 'x' }, abc: {} });
    expect(Object.keys(loadResults(memoryStorage({ [RESULTS_KEY]: damaged })))).toEqual(['1']);
    expect(loadResults(memoryStorage({ [RESULTS_KEY]: '[1,2]' }))).toEqual({});
    expect(loadResults(null)).toEqual({});
  });
});

describe('calendar', () => {
  it('lays out October 2026 from puzzle #1 on Thursday the 1st', () => {
    const days = monthDays(2026, 10);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ day: 1, weekday: 3, puzzleNumber: 1 });
    expect(days[30]?.puzzleNumber).toBe(31);
  });

  it('numbers across month ends and daylight-saving changes without gaps', () => {
    expect(monthDays(2026, 11)[0]?.puzzleNumber).toBe(32);
    expect(monthDays(2027, 3).at(-1)!.puzzleNumber - monthDays(2027, 3)[0]!.puzzleNumber).toBe(30);
  });

  it('lists months from launch to today', () => {
    expect(archiveMonths(new Date(2026, 8, 27))).toEqual([]);
    expect(archiveMonths(new Date(2026, 9, 5))).toEqual([{ year: 2026, month: 10 }]);
    expect(archiveMonths(new Date(2027, 0, 2))).toEqual([
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });

  it('only past days are archive days', () => {
    expect(isArchiveDay(1, 5)).toBe(true);
    expect(isArchiveDay(5, 5)).toBe(false); // today is the daily puzzle
    expect(isArchiveDay(6, 5)).toBe(false);
    expect(isArchiveDay(0, 5)).toBe(false); // before launch
  });
});
