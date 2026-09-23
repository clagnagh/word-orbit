import { describe, expect, it } from 'vitest';
import { msUntilNextPuzzle, puzzleNumberFor, seedFor } from '../src/core/daily';

// Local-time dates (month is 0-based in the Date constructor).
const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0) =>
  new Date(y, m - 1, d, h, min, s);

const HOUR = 3_600_000;

describe('test environment', () => {
  it('runs in a timezone with daylight saving (see vite.config.ts)', () => {
    expect(local(2026, 1, 15).getTimezoneOffset()).not.toBe(local(2026, 7, 15).getTimezoneOffset());
  });
});

describe('puzzleNumberFor', () => {
  it('is 1 on launch day and counts up by one per day', () => {
    expect(puzzleNumberFor(local(2026, 10, 1))).toBe(1);
    expect(puzzleNumberFor(local(2026, 10, 2))).toBe(2);
    expect(puzzleNumberFor(local(2026, 10, 31))).toBe(31);
    expect(puzzleNumberFor(local(2027, 10, 1))).toBe(366);
  });

  it('is 0 the day before launch', () => {
    expect(puzzleNumberFor(local(2026, 9, 30))).toBe(0);
  });

  it('changes exactly at local midnight', () => {
    expect(puzzleNumberFor(local(2026, 10, 1, 23, 59, 59))).toBe(1);
    expect(puzzleNumberFor(local(2026, 10, 2, 0, 0, 0))).toBe(2);
  });

  it('is the same at any time of the same day', () => {
    expect(puzzleNumberFor(local(2026, 12, 25, 0, 0, 1))).toBe(
      puzzleNumberFor(local(2026, 12, 25, 23, 59, 59)),
    );
  });

  it('handles leap day 2028-02-29', () => {
    const feb28 = puzzleNumberFor(local(2028, 2, 28));
    expect(puzzleNumberFor(local(2028, 2, 29))).toBe(feb28 + 1);
    expect(puzzleNumberFor(local(2028, 3, 1))).toBe(feb28 + 2);
  });

  it('never skips or repeats across daylight saving changes', () => {
    // US: clocks go back 2026-11-01, forward 2027-03-14.
    for (const [y, m, d] of [
      [2026, 11, 1],
      [2027, 3, 14],
    ] as const) {
      const before = puzzleNumberFor(local(y, m, d - 1, 12));
      expect(puzzleNumberFor(local(y, m, d, 0, 30))).toBe(before + 1);
      expect(puzzleNumberFor(local(y, m, d, 23, 30))).toBe(before + 1);
      expect(puzzleNumberFor(local(y, m, d + 1, 0, 30))).toBe(before + 2);
    }
  });

  it('counts every day for years without gaps', () => {
    let expected = 1;
    for (let d = local(2026, 10, 1, 12); d.getFullYear() < 2030; expected++) {
      expect(puzzleNumberFor(d)).toBe(expected);
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);
    }
  });
});

describe('seedFor', () => {
  it('is deterministic', () => {
    expect(seedFor(42)).toBe(seedFor(42));
  });

  it('gives each of the first 10 years of puzzles a different seed', () => {
    const seeds = new Set(Array.from({ length: 3650 }, (_, i) => seedFor(i + 1)));
    expect(seeds.size).toBe(3650);
  });

  it('is pinned, so a code change can never silently change past puzzles', () => {
    expect([seedFor(1), seedFor(2), seedFor(100)]).toMatchInlineSnapshot(`
      [
        4182995445,
        4132662588,
        956015869,
      ]
    `);
  });
});

describe('msUntilNextPuzzle', () => {
  it('counts down to local midnight', () => {
    expect(msUntilNextPuzzle(local(2026, 10, 1, 0, 0, 0))).toBe(24 * HOUR);
    expect(msUntilNextPuzzle(local(2026, 10, 1, 23, 0, 0))).toBe(HOUR);
    expect(msUntilNextPuzzle(local(2026, 10, 1, 23, 59, 59))).toBe(1000);
  });

  it('handles 25-hour and 23-hour daylight saving days', () => {
    expect(msUntilNextPuzzle(local(2026, 11, 1, 0, 0, 0))).toBe(25 * HOUR);
    expect(msUntilNextPuzzle(local(2027, 3, 14, 0, 0, 0))).toBe(23 * HOUR);
  });

  it('crosses month and year ends', () => {
    expect(msUntilNextPuzzle(local(2026, 12, 31, 23, 0, 0))).toBe(HOUR);
    expect(msUntilNextPuzzle(local(2028, 2, 28, 23, 0, 0))).toBe(HOUR);
  });
});
