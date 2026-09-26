import { describe, expect, it } from 'vitest';
import { parseDateOverride } from '../src/game/session';

const now = new Date(2026, 8, 25, 14, 30, 5); // 25 Sep 2026, 14:30:05

describe('parseDateOverride', () => {
  it('reads ?date=YYYY-MM-DD and keeps the real time of day', () => {
    const d = parseDateOverride('?date=2026-10-02', '', now)!;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 2]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([14, 30, 5]);
  });

  it('reads #YYYY-MM-DD too (the private test page)', () => {
    expect(parseDateOverride('', '#2026-10-03', now)?.getDate()).toBe(3);
  });

  it('ignores missing, malformed or impossible dates', () => {
    expect(parseDateOverride('', '', now)).toBeNull();
    expect(parseDateOverride('?date=tomorrow', '', now)).toBeNull();
    expect(parseDateOverride('', '#2026-02-30', now)).toBeNull();
    expect(parseDateOverride('', '#results', now)).toBeNull();
  });
});
