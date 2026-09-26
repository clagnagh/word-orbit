// Game rules: the numbers that decide who wins and how points add up.
// (Feel numbers like orbit speed and animation timing live in src/config/tuning.ts.)

export const LEVELS = [
  { letters: 5, timeLimitMs: 90_000 },
  { letters: 6, timeLimitMs: 90_000 },
  { letters: 7, timeLimitMs: 90_000 },
] as const;

export const MIN_WORD_LENGTH = 3;

/** Every level must have at least this many valid words besides the key word. */
export const MIN_BONUS_WORDS = 8;

export const SCORING = {
  /** A valid word scores this × length². */
  wordPerLetterSquared: 10,
  /** Key word bonus: this × level number… */
  keyWordPerLevel: 500,
  /** …plus this × whole seconds remaining (rounded up, like the on-screen timer). */
  keyWordPerSecondLeft: 5,
  /** A valid word within this long of the previous one grows the combo. */
  comboWindowMs: 5_000,
  /** Combo multiplier in tenths (10 = ×1.0), so repeated adding never drifts. */
  comboStartTenths: 10,
  comboStepTenths: 1,
  comboMaxTenths: 20,
} as const;

/** Fun extras. */
export const BONUSES = {
  /** Words that use the level's gold "lucky star" tile score this many times the points. */
  luckyMultiplier: 2,
  /** Reaching this combo (in tenths, 15 = ×1.5) starts a Supernova… */
  supernovaAtComboTenths: 15,
  /** …which multiplies every word's points by this for supernovaMs. */
  supernovaMultiplier: 2,
  supernovaMs: 8_000,
} as const;
