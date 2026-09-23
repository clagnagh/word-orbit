import { SCORING } from './rules.ts';

/** Seconds shown on the timer: rounded up, so 0.4 s left still shows "1". */
export function secondsLeft(remainingMs: number): number {
  return Math.ceil(Math.max(0, remainingMs) / 1000);
}

/** Base points for a valid word, before the combo multiplier. */
export function wordScore(length: number): number {
  return SCORING.wordPerLetterSquared * length ** 2;
}

/** Extra points for finding the key word. `level` is 1-based. */
export function keyWordBonus(level: number, remainingMs: number): number {
  return SCORING.keyWordPerLevel * level + SCORING.keyWordPerSecondLeft * secondsLeft(remainingMs);
}

/**
 * Combo multiplier (in tenths) for a newly accepted word.
 * Grows by one step if the previous valid word was within the combo window, otherwise restarts.
 */
export function nextComboTenths(
  currentTenths: number,
  lastAcceptedAt: number | null,
  now: number,
): number {
  if (lastAcceptedAt === null || now - lastAcceptedAt > SCORING.comboWindowMs) {
    return SCORING.comboStartTenths;
  }
  return Math.min(currentTenths + SCORING.comboStepTenths, SCORING.comboMaxTenths);
}

/** A word's points with the combo applied. Base scores are multiples of 10, so this stays whole. */
export function applyCombo(points: number, comboTenths: number): number {
  return Math.round((points * comboTenths) / 10);
}
