import { hashString } from './rng.ts';

/** Puzzle #1 is played on this local calendar date. Month is 1-based. */
export const LAUNCH_DATE = { year: 2026, month: 10, day: 1 } as const;

const MS_PER_DAY = 86_400_000;

// Counts calendar days, not 24-hour blocks: UTC has no daylight saving, so a
// local date mapped onto UTC midnight is always a whole number of days apart.
function dayIndex(year: number, monthIndex: number, day: number): number {
  return Date.UTC(year, monthIndex, day) / MS_PER_DAY;
}

const LAUNCH_INDEX = dayIndex(LAUNCH_DATE.year, LAUNCH_DATE.month - 1, LAUNCH_DATE.day);

/** Puzzle number for the player's local calendar date. Launch day is 1; earlier dates give 0 or less. */
export function puzzleNumberFor(date: Date): number {
  return dayIndex(date.getFullYear(), date.getMonth(), date.getDate()) - LAUNCH_INDEX + 1;
}

export function seedFor(puzzleNumber: number): number {
  return hashString(`word-orbit:${puzzleNumber}`);
}

/** Milliseconds until the next local midnight, when the next puzzle unlocks. */
export function msUntilNextPuzzle(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime();
}
