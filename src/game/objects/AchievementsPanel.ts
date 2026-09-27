import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { ACHIEVEMENTS, type AchievementId } from '../../core/achievements.ts';
import { Overlay } from './Overlay.ts';

const { achievementsPanel: a, fonts, palette } = tuning;

/** Every achievement: earned ones bright, the rest dimmed with a lock and how to earn them. */
export class AchievementsPanel extends Overlay {
  constructor(scene: Phaser.Scene, earned: readonly AchievementId[], onClose: () => void) {
    super(scene, a, `Achievements  ${earned.length}/${ACHIEVEMENTS.length}`, 'Close', onClose);
    ACHIEVEMENTS.forEach((achievement, i) => {
      const y = a.firstRowY + i * a.rowSpacing;
      const has = earned.includes(achievement.id);
      const row = [
        this.text(a.iconX, y, has ? achievement.icon : '🔒', a.iconSize, palette.text).setOrigin(
          0.5,
        ),
        this.text(
          a.textX,
          y - a.lineOffset,
          achievement.title,
          a.rowTitleSize,
          palette.text,
          fonts.bold,
        ).setOrigin(0, 0.5),
        this.text(
          a.textX,
          y + a.lineOffset,
          achievement.description,
          a.descriptionSize,
          palette.dimText,
        ).setOrigin(0, 0.5),
      ];
      if (!has) row.forEach((part) => part.setAlpha(a.lockedAlpha));
      this.add(row);
    });
  }
}
