// The puzzle archive: each day's best result, and the calendar that shows them.
// Dates are built from explicit year/month/day numbers, never from the current time.

import { LAUNCH_DATE, puzzleNumberFor } from './daily.ts';
import type { GameSummary } from './game.ts';
import type { KeyValueStorage } from './stats.ts';

/** 0 = no words, 1 = some words, 2 = the key word. Same idea as the share squares. */
export type LevelOutcome = 0 | 1 | 2;

export interface DayResult {
  readonly score: number;
  readonly levels: readonly LevelOutcome[];
}

/** Best result per puzzle number. */
export type Results = Readonly<Record<string, DayResult>>;

/** How a calendar day is coloured. */
export type DayColor = 'perfect' | 'played' | 'empty' | 'unplayed';

export const RESULTS_KEY = 'word-orbit:results';

export function toDayResult(summary: GameSummary): DayResult {
  return {
    score: summary.score,
    levels: summary.levels.map((l) => (l.keyWordFound ? 2 : l.wordCount > 0 ? 1 : 0)),
  };
}

/** Records a finished game, keeping the better score if the day was played before. */
export function recordResult(
  results: Results,
  puzzleNumber: number,
  summary: GameSummary,
): Results {
  const previous = results[puzzleNumber];
  const result = toDayResult(summary);
  if (previous && previous.score >= result.score) return results;
  return { ...results, [puzzleNumber]: result };
}

/** 🟩 every key word · 🟨 some words · ⬛ played, no words · nothing when not played. */
export function dayColor(result: DayResult | undefined): DayColor {
  if (!result) return 'unplayed';
  if (result.levels.every((l) => l === 2)) return 'perfect';
  return result.levels.some((l) => l > 0) ? 'played' : 'empty';
}

export interface CalendarDay {
  readonly day: number;
  /** 0 = Monday … 6 = Sunday. */
  readonly weekday: number;
  readonly puzzleNumber: number;
}

/** Every day of a month (month is 1-based). */
export function monthDays(year: number, month: number): CalendarDay[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(year, month - 1, i + 1);
    return { day: i + 1, weekday: (date.getDay() + 6) % 7, puzzleNumber: puzzleNumberFor(date) };
  });
}

export interface Month {
  readonly year: number;
  /** 1-based. */
  readonly month: number;
}

/** From the launch month up to (and including) `today`'s month; empty before launch. */
export function archiveMonths(today: Date): Month[] {
  const months: Month[] = [];
  let year: number = LAUNCH_DATE.year;
  let month: number = LAUNCH_DATE.month;
  const end = today.getFullYear() * 12 + today.getMonth();
  while (year * 12 + (month - 1) <= end) {
    months.push({ year, month });
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
  return months;
}

/** A past day's puzzle can be played from the archive; today's is the daily, not the archive. */
export function isArchiveDay(puzzleNumber: number, todayPuzzle: number): boolean {
  return puzzleNumber >= 1 && puzzleNumber < todayPuzzle;
}

function isDayResult(v: unknown): v is DayResult {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    Number.isInteger(r.score) &&
    (r.score as number) >= 0 &&
    Array.isArray(r.levels) &&
    r.levels.every((l) => l === 0 || l === 1 || l === 2)
  );
}

/** Never throws; damaged entries are dropped, the rest kept. */
export function loadResults(storage: KeyValueStorage | null): Results {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(RESULTS_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => /^\d+$/.test(key) && isDayResult(value)),
    );
  } catch {
    return {};
  }
}

export function saveResults(storage: KeyValueStorage | null, results: Results): boolean {
  if (!storage) return false;
  try {
    storage.setItem(RESULTS_KEY, JSON.stringify(results));
    return true;
  } catch {
    return false;
  }
}
