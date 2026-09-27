import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import type { AchievementId } from '../../core/achievements.ts';
import type { Stats } from '../../core/stats.ts';
import { isThemeUnlocked, THEMES, type ThemeId } from '../../core/themes.ts';
import { themePalette } from '../theme.ts';
import { Overlay } from './Overlay.ts';

const { fonts, layout, palette, themePanel: t } = tuning;

/** A 2×2 grid of themes to pick from; locked ones say how to unlock them. */
export class ThemePanel extends Overlay {
  constructor(
    scene: Phaser.Scene,
    current: ThemeId,
    stats: Stats,
    earned: readonly AchievementId[],
    onPick: (id: ThemeId) => void,
    onClose: () => void,
  ) {
    super(scene, t, 'Themes', 'Close', onClose);
    THEMES.forEach((theme, i) => {
      const x = t.columnsX[i % 2] ?? layout.width / 2;
      const y = t.rowsY[Math.floor(i / 2)] ?? 0;
      const colors = themePalette(theme.id);
      const unlocked = isThemeUnlocked(theme, stats, earned);
      const inUse = theme.id === current;
      const { width: w, height: h, cornerRadius: r } = t.card;

      const card = this.scene.add
        .graphics()
        // A solid fill: WebGL gradients on rounded shapes show streaks at the corners.
        .fillStyle(colors.skyBottom, 1)
        .fillRoundedRect(x - w / 2, y - h / 2, w, h, r)
        .lineStyle(
          inUse ? t.selectedStroke : layout.tray.strokeWidth,
          inUse ? palette.accent : palette.panelStroke,
          1,
        )
        .strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
      const planet = this.scene.add.circle(x, y + t.planetY, t.planetRadius, colors.planet);
      const name = this.text(
        x,
        y + t.nameY,
        theme.name,
        fonts.subtitle,
        palette.text,
        fonts.bold,
      ).setOrigin(0.5);
      const status = this.text(
        x,
        y + t.statusY,
        inUse ? '✓ In use' : unlocked ? 'Tap to use' : `🔒 ${theme.hint}`,
        t.statusSize,
        inUse ? palette.accent : palette.dimText,
      )
        .setOrigin(0.5, 0)
        .setAlign('center')
        .setWordWrapWidth(w - t.statusPadding * 2);
      if (!unlocked) [planet, name].forEach((part) => part.setAlpha(t.lockedAlpha));

      const hit = this.scene.add.zone(x, y, w, h);
      if (unlocked && !inUse) {
        hit.setInteractive({ useHandCursor: true }).on('pointerup', () => onPick(theme.id));
      }
      this.add([card, planet, name, status, hit]);
    });
  }
}
