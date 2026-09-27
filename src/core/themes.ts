// Which colour themes exist and how each is unlocked. The colours live in tuning.themes.

import type { AchievementId } from './achievements.ts';
import type { Stats } from './stats.ts';

export const THEMES = [
  { id: 'classic', name: 'Classic', hint: '' },
  { id: 'mars', name: 'Mars', hint: 'Reach a 3-day streak', streak: 3 },
  { id: 'ice', name: 'Ice', hint: 'Earn Key Master', achievement: 'key-master' },
  { id: 'neon', name: 'Neon', hint: 'Reach a 7-day streak', streak: 7 },
] as const satisfies readonly {
  id: string;
  name: string;
  hint: string;
  streak?: number;
  achievement?: AchievementId;
}[];

export type Theme = (typeof THEMES)[number];
export type ThemeId = Theme['id'];

export const THEME_KEY = 'word-orbit:theme';

export function isThemeUnlocked(
  theme: Theme,
  stats: Stats,
  earned: readonly AchievementId[],
): boolean {
  if ('streak' in theme) return stats.maxStreak >= theme.streak;
  if ('achievement' in theme) return earned.includes(theme.achievement);
  return true;
}

/** The saved theme if it exists and is still unlocked, otherwise Classic. */
export function chosenTheme(
  saved: string | null,
  stats: Stats,
  earned: readonly AchievementId[],
): ThemeId {
  const theme = THEMES.find((t) => t.id === saved);
  return theme && isThemeUnlocked(theme, stats, earned) ? theme.id : 'classic';
}
