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

/** Each level's mini-goal: find `wordCount` words of (letters − lettersBelowLevel) letters. */
export const GOAL = {
  wordCount: 2,
  lettersBelowLevel: 1,
  /** Bonus is this × level number, awarded once. */
  bonusPerLevel: 300,
} as const;

/** One hint per level: reveals the key word's first letter, for a cost. */
export const HINT = {
  cost: 100,
} as const;
