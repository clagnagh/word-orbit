// The daily loop's memory: which puzzle is today's, saving and restoring today's game,
// recording finished games in stats, and whether the player has seen "How to play".
// Everything goes through src/storage.ts, so blocked storage means "forget", never "crash".

import {
  addEarned,
  earnedByGame,
  earnedByStats,
  loadEarned,
  saveEarned,
  type AchievementId,
} from '../core/achievements.ts';
import { loadResults, recordResult, saveResults, type Results } from '../core/archive.ts';
import { playablePuzzleNumber } from '../core/daily.ts';
import { summarize, type GameState } from '../core/game.ts';
import type { Puzzle } from '../core/puzzle.ts';
import { fromSaved, toSaved } from '../core/save.ts';
import { loadStats, recordGame, saveStats, type Stats } from '../core/stats.ts';
import { chosenTheme, THEME_KEY, type ThemeId } from '../core/themes.ts';
import { storage } from '../storage.ts';

const GAME_KEY = 'word-orbit:daily-game';
/** The archive keeps one game in progress: the past day most recently started. */
const ARCHIVE_GAME_KEY = 'word-orbit:archive-game';
const HELP_KEY = 'word-orbit:seen-help';

/**
 * Reads a test date like 2026-10-02 from `?date=…` or `#…`, keeping the real time of day
 * (so the countdown still ticks). Returns null when there's no valid override.
 */
export function parseDateOverride(search: string, hash: string, now: Date): Date | null {
  const raw = new URLSearchParams(search).get('date') ?? hash.replace(/^#/, '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  return date.getDate() === d && date.getMonth() === m - 1 ? date : null;
}

const overrideAllowed = import.meta.env.DEV || import.meta.env.VITE_DATE_OVERRIDE === '1';

/** The player's "today". Dev builds and the private test page can fake it (see parseDateOverride). */
export function today(): Date {
  const now = new Date();
  if (!overrideAllowed) return now;
  return parseDateOverride(window.location.search, window.location.hash, now) ?? now;
}

export function todaysPuzzle(): { puzzleNumber: number; isPreview: boolean } {
  return playablePuzzleNumber(today());
}

/** A saved game for this puzzle (in progress or finished), or null. */
function loadFrom(key: string, puzzle: Puzzle, puzzleNumber: number): GameState | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return fromSaved(JSON.parse(raw), puzzle, puzzleNumber);
  } catch {
    return null;
  }
}

/** Today's saved game (in progress or finished), or null. */
export function loadGame(puzzle: Puzzle, puzzleNumber: number): GameState | null {
  return loadFrom(GAME_KEY, puzzle, puzzleNumber);
}

export function saveGame(state: GameState, puzzleNumber: number): void {
  storage.setItem(GAME_KEY, JSON.stringify(toSaved(state, puzzleNumber)));
}

/** A past day's game in progress, if it's the one the archive last started. */
export function loadArchiveGame(puzzle: Puzzle, puzzleNumber: number): GameState | null {
  return loadFrom(ARCHIVE_GAME_KEY, puzzle, puzzleNumber);
}

export function saveArchiveGame(state: GameState, puzzleNumber: number): void {
  storage.setItem(ARCHIVE_GAME_KEY, JSON.stringify(toSaved(state, puzzleNumber)));
}

export function loadPlayerStats(): Stats {
  return loadStats(storage);
}

/** Records a finished daily game (once per day) and returns the updated stats. */
export function recordFinishedGame(puzzleNumber: number, score: number): Stats {
  const stats = recordGame(loadStats(storage), puzzleNumber, score);
  saveStats(storage, stats);
  return stats;
}

export function hasSeenHelp(): boolean {
  return storage.getItem(HELP_KEY) === '1';
}

export function markHelpSeen(): void {
  storage.setItem(HELP_KEY, '1');
}

/** Each day's best result, for the archive calendar. */
export function loadDayResults(): Results {
  return loadResults(storage);
}

/**
 * Records a finished (non-preview) game: its day result for the calendar, and any achievements
 * it earned. Returns the achievements earned for the first time.
 */
export function recordFinishedDay(
  state: GameState,
  puzzleNumber: number,
  stats: Stats,
  archive: boolean,
): AchievementId[] {
  saveResults(storage, recordResult(loadResults(storage), puzzleNumber, summarize(state)));
  const { earned, newly } = addEarned(loadEarned(storage), [
    ...earnedByGame(state, { archive }),
    ...earnedByStats(stats),
  ]);
  if (newly.length > 0) saveEarned(storage, earned);
  return newly;
}

export function loadAchievements(): AchievementId[] {
  return loadEarned(storage);
}

/** The theme to use: the saved choice if it's still unlocked, otherwise Classic. */
export function loadTheme(): ThemeId {
  return chosenTheme(storage.getItem(THEME_KEY), loadStats(storage), loadEarned(storage));
}

export function saveTheme(id: ThemeId): void {
  storage.setItem(THEME_KEY, id);
}
