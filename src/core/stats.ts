// Player stats as pure data. Storage is passed in, so tests (and private-mode browsers
// where localStorage throws) can use anything that looks like it.

export interface Stats {
  readonly played: number;
  /** Consecutive days played, as of `lastPuzzle`. Use displayStreak() to show it. */
  readonly streak: number;
  readonly maxStreak: number;
  readonly bestScore: number;
  readonly lastPuzzle: number | null;
  /** Most recent games, oldest first, capped at HISTORY_LIMIT. */
  readonly history: readonly { readonly puzzle: number; readonly score: number }[];
}

/** The parts of localStorage we use. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STATS_KEY = 'word-orbit:stats';
export const HISTORY_LIMIT = 30;

export function emptyStats(): Stats {
  return { played: 0, streak: 0, maxStreak: 0, bestScore: 0, lastPuzzle: null, history: [] };
}

export function hasPlayed(stats: Stats, puzzleNumber: number): boolean {
  return stats.lastPuzzle === puzzleNumber;
}

/** Records a finished daily game. Recording the same puzzle twice changes nothing. */
export function recordGame(stats: Stats, puzzleNumber: number, score: number): Stats {
  if (stats.lastPuzzle !== null && puzzleNumber <= stats.lastPuzzle) return stats;
  const streak = stats.lastPuzzle === puzzleNumber - 1 ? stats.streak + 1 : 1;
  return {
    played: stats.played + 1,
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    bestScore: Math.max(stats.bestScore, score),
    lastPuzzle: puzzleNumber,
    history: [...stats.history, { puzzle: puzzleNumber, score }].slice(-HISTORY_LIMIT),
  };
}

/** The streak to show today: it survives until the end of the day after the last game. */
export function displayStreak(stats: Stats, todayPuzzle: number): number {
  if (stats.lastPuzzle === null) return 0;
  return todayPuzzle - stats.lastPuzzle <= 1 ? stats.streak : 0;
}

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

function isStats(v: unknown): v is Stats {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    isCount(s.played) &&
    isCount(s.streak) &&
    isCount(s.maxStreak) &&
    isCount(s.bestScore) &&
    (s.lastPuzzle === null || Number.isInteger(s.lastPuzzle)) &&
    Array.isArray(s.history) &&
    s.history.every(
      (h: unknown) =>
        !!h &&
        typeof h === 'object' &&
        Number.isInteger((h as Record<string, unknown>).puzzle) &&
        isCount((h as Record<string, unknown>).score),
    )
  );
}

/** Never throws: missing, broken or unreadable storage gives fresh stats. */
export function loadStats(storage: KeyValueStorage | null): Stats {
  try {
    const raw = storage?.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed: unknown = JSON.parse(raw);
    return isStats(parsed) ? parsed : emptyStats();
  } catch {
    return emptyStats();
  }
}

/** Never throws. Returns false if the stats could not be saved (e.g. storage full or blocked). */
export function saveStats(storage: KeyValueStorage | null, stats: Stats): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STATS_KEY, JSON.stringify(stats));
    return true;
  } catch {
    return false;
  }
}
