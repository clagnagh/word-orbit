// Themes recolour the game by swapping a few palette colours. Everything reads tuning.palette
// when it's drawn, so a scene started after applyTheme() uses the new colours.

import type Phaser from 'phaser';
import { tuning } from '../config/tuning.ts';
import type { ThemeId } from '../core/themes.ts';
import { toCss } from './color.ts';
import { SKY_TEXTURE } from './objects/Background.ts';
import { GLOW_TEXTURE } from './objects/Planet.ts';

type Palette = Record<keyof typeof tuning.palette, number>;
const palette = tuning.palette as Palette;
/** The palette as written in tuning.ts: Classic, and the base every other theme starts from. */
const classic: Palette = { ...palette };

let current: ThemeId = 'classic';

/** A theme's full palette, whichever theme is in use (for previews). */
export function themePalette(id: ThemeId): Palette {
  return { ...classic, ...tuning.themes[id] };
}

export function currentTheme(): ThemeId {
  return current;
}

/**
 * Switches the palette to `id`. Pass the game's textures once the game is running, so the
 * sky and planet-glow textures (drawn once, then reused) are redrawn in the new colours.
 */
export function applyTheme(id: ThemeId, textures?: Phaser.Textures.TextureManager): void {
  current = id;
  Object.assign(palette, classic, tuning.themes[id]);
  for (const key of [SKY_TEXTURE, GLOW_TEXTURE]) {
    if (textures?.exists(key)) textures.remove(key);
  }
  // The page behind the game (seen around it on wide screens) and the phone's status bar.
  document.body.style.background = `linear-gradient(${toCss(palette.skyTop)}, ${toCss(palette.skyBottom)})`;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', toCss(palette.skyTop));
}
