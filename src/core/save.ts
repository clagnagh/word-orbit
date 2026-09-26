// Turning a game in progress into small saved data, and back.
// Only progress is saved; the puzzle itself is regenerated from its number.

import { newGame, type GameState, type LevelProgress, type Phase } from './game.ts';
import type { Puzzle } from './puzzle.ts';
import { LEVELS, SCORING } from './rules.ts';

export const SAVE_VERSION = 1;

export interface SavedGame {
  readonly version: typeof SAVE_VERSION;
  readonly puzzleNumber: number;
  readonly phase: Phase;
  readonly levelIndex: number;
  readonly remainingMs: number;
  readonly progress: readonly LevelProgress[];
}

export function toSaved(state: GameState, puzzleNumber: number): SavedGame {
  return {
    version: SAVE_VERSION,
    puzzleNumber,
    phase: state.phase,
    levelIndex: state.levelIndex,
    remainingMs: state.remainingMs,
    progress: state.progress,
  };
}

const PHASES: readonly Phase[] = ['ready', 'playing', 'levelEnded', 'over'];

/**
 * Rebuilds a game from saved data, or returns null if the data is for another puzzle, from an
 * older version, or damaged. The tray starts empty, the combo starts fresh, and the clock is
 * stopped until a `resume` action.
 */
export function fromSaved(data: unknown, puzzle: Puzzle, puzzleNumber: number): GameState | null {
  if (!isObject(data)) return null;
  const { version, phase, levelIndex, remainingMs, progress } = data;
  if (version !== SAVE_VERSION || data.puzzleNumber !== puzzleNumber) return null;
  if (!PHASES.includes(phase as Phase)) return null;
  if (!Number.isInteger(levelIndex) || (levelIndex as number) < 0) return null;
  const index = levelIndex as number;
  if (index >= puzzle.levels.length) return null;
  const limit = LEVELS[index]?.timeLimitMs ?? 0;
  if (typeof remainingMs !== 'number' || remainingMs < 0 || remainingMs > limit) return null;
  if (!Array.isArray(progress) || progress.length !== puzzle.levels.length) return null;
  if (!progress.every((p, i) => isProgress(p, puzzle.levels[i]?.validWords ?? []))) return null;

  return {
    ...newGame(puzzle),
    phase: phase as Phase,
    levelIndex: index,
    remainingMs,
    progress: progress as LevelProgress[],
    tray: [],
    lastTickAt: null,
    comboTenths: SCORING.comboStartTenths,
    lastAcceptedAt: null,
  };
}

function isProgress(p: unknown, validWords: readonly string[]): p is LevelProgress {
  if (!isObject(p)) return false;
  return (
    Array.isArray(p.foundWords) &&
    p.foundWords.every((w) => typeof w === 'string' && validWords.includes(w)) &&
    typeof p.keyWordFound === 'boolean' &&
    typeof p.goalDone === 'boolean' &&
    typeof p.hintUsed === 'boolean' &&
    Number.isInteger(p.score)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
