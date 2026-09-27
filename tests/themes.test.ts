import { describe, expect, it } from 'vitest';
import { chosenTheme, isThemeUnlocked, THEMES } from '../src/core/themes';
import { emptyStats, recordGame } from '../src/core/stats';

const theme = (id: string) => THEMES.find((t) => t.id === id)!;
const streakOf = (days: number) => {
  let stats = emptyStats();
  for (let n = 1; n <= days; n++) stats = recordGame(stats, n, 1);
  return stats;
};

describe('themes', () => {
  it('Classic is always unlocked', () => {
    expect(isThemeUnlocked(theme('classic'), emptyStats(), [])).toBe(true);
  });

  it('Mars and Neon unlock by best streak, Ice by Key Master', () => {
    expect(isThemeUnlocked(theme('mars'), streakOf(2), [])).toBe(false);
    expect(isThemeUnlocked(theme('mars'), streakOf(3), [])).toBe(true);
    expect(isThemeUnlocked(theme('neon'), streakOf(6), [])).toBe(false);
    expect(isThemeUnlocked(theme('neon'), streakOf(7), [])).toBe(true);
    expect(isThemeUnlocked(theme('ice'), emptyStats(), ['purist'])).toBe(false);
    expect(isThemeUnlocked(theme('ice'), emptyStats(), ['key-master'])).toBe(true);
  });

  it('falls back to Classic for unknown or locked saved themes', () => {
    expect(chosenTheme('ice', emptyStats(), ['key-master'])).toBe('ice');
    expect(chosenTheme('ice', emptyStats(), [])).toBe('classic');
    expect(chosenTheme('rainbow', emptyStats(), [])).toBe('classic');
    expect(chosenTheme(null, emptyStats(), [])).toBe('classic');
  });
});
