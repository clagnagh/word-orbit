// Achievements are worked out from data the game already has (the finished game and the
// player's stats), so no scene has to remember to "unlock" anything along the way.

import { ACHIEVEMENT_TARGETS as T, SCORING } from './rules.ts';
import type { GameState } from './game.ts';
import type { KeyValueStorage, Stats } from './stats.ts';

export const ACHIEVEMENTS = [
  { id: 'first-orbit', icon: '🪐', title: 'First Orbit', description: 'Finish a game' },
  {
    id: 'key-master',
    icon: '🔑',
    title: 'Key Master',
    description: 'Find all 3 key words in one game',
  },
  {
    id: 'quick-draw',
    icon: '⚡',
    title: 'Quick Draw',
    description: `Find a key word in the first ${T.quickDrawMs / 1000} seconds of a level`,
  },
  {
    id: 'wordsmith',
    icon: '📚',
    title: 'Wordsmith',
    description: `Find ${T.wordsmithWords} words in one game`,
  },
  {
    id: 'clean-sweep',
    icon: '🧹',
    title: 'Clean Sweep',
    description: 'Find every word in a level',
  },
  {
    id: 'goal-getter',
    icon: '🎯',
    title: 'Goal Getter',
    description: 'Complete all 3 level goals in one game',
  },
  {
    id: 'purist',
    icon: '💎',
    title: 'Purist',
    description: 'Find all 3 key words without a hint',
  },
  {
    id: 'on-fire',
    icon: '🔥',
    title: 'On Fire',
    description: `Reach a ×${(T.onFireComboTenths / 10).toFixed(1)} combo`,
  },
  {
    id: 'time-traveller',
    icon: '📅',
    title: 'Time Traveller',
    description: 'Finish a puzzle from the archive',
  },
  {
    id: 'week-streak',
    icon: '📆',
    title: 'Week Streak',
    description: `Play ${T.weekStreak} days in a row`,
  },
  {
    id: 'month-streak',
    icon: '🏅',
    title: 'Month Streak',
    description: `Play ${T.monthStreak} days in a row`,
  },
] as const;

export type Achievement = (typeof ACHIEVEMENTS)[number];
export type AchievementId = Achievement['id'];

const IDS: readonly string[] = ACHIEVEMENTS.map((a) => a.id);
export const ACHIEVEMENTS_KEY = 'word-orbit:achievements';

/** Achievements earned by one finished game. Archive games also earn Time Traveller. */
export function earnedByGame(state: GameState, { archive = false } = {}): AchievementId[] {
  if (state.phase !== 'over') return [];
  const levels = state.puzzle.levels;
  const progress = state.progress;
  const allKeys = progress.every((p) => p.keyWordFound);
  const words = progress.reduce((n, p) => n + p.foundWords.length, 0);
  const earned: AchievementId[] = ['first-orbit'];
  if (allKeys) earned.push('key-master');
  if (progress.some((p) => p.keyWordAtMs !== undefined && p.keyWordAtMs <= T.quickDrawMs)) {
    earned.push('quick-draw');
  }
  if (words >= T.wordsmithWords) earned.push('wordsmith');
  // Every shorter word, then the key word (which ends the level, so its anagrams can't count).
  const swept = progress.some((p, i) => {
    const level = levels[i];
    if (!level || !p.keyWordFound) return false;
    const shorter = level.validWords.filter((w) => w.length < level.letters.length);
    return shorter.every((w) => p.foundWords.includes(w));
  });
  if (swept) earned.push('clean-sweep');
  if (progress.every((p) => p.goalDone)) earned.push('goal-getter');
  if (allKeys && progress.every((p) => !p.hintUsed)) earned.push('purist');
  const bestCombo = Math.max(
    SCORING.comboStartTenths,
    ...progress.map((p) => p.bestComboTenths ?? 0),
  );
  if (bestCombo >= T.onFireComboTenths) earned.push('on-fire');
  if (archive) earned.push('time-traveller');
  return earned;
}

/** Achievements earned by the player's streak so far. */
export function earnedByStats(stats: Stats): AchievementId[] {
  const earned: AchievementId[] = [];
  if (stats.maxStreak >= T.weekStreak) earned.push('week-streak');
  if (stats.maxStreak >= T.monthStreak) earned.push('month-streak');
  return earned;
}

/** Adds `ids` to what's already earned; `newly` lists only the ones earned for the first time. */
export function addEarned(
  earned: readonly AchievementId[],
  ids: readonly AchievementId[],
): { earned: AchievementId[]; newly: AchievementId[] } {
  const newly = [...new Set(ids)].filter((id) => !earned.includes(id));
  return { earned: [...earned, ...newly], newly };
}

export function achievement(id: AchievementId): Achievement {
  return ACHIEVEMENTS.find((a) => a.id === id)!;
}

/** Never throws: missing or damaged data means nothing earned; unknown ids are dropped. */
export function loadEarned(storage: KeyValueStorage | null): AchievementId[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(ACHIEVEMENTS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is AchievementId => IDS.includes(id as string)))];
  } catch {
    return [];
  }
}

export function saveEarned(
  storage: KeyValueStorage | null,
  earned: readonly AchievementId[],
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(earned));
    return true;
  } catch {
    return false;
  }
}
