import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

/** A brief full-screen wash of colour. Kept with reduced motion: it's colour, not movement. */
export function flash(
  scene: Phaser.Scene,
  color: number,
  alpha: number = tuning.fx.keyWord.flashAlpha,
  ms: number = tuning.fx.keyWord.flashMs,
): void {
  const { width, height } = tuning.layout;
  const overlay = scene.add.rectangle(0, 0, width, height, color, alpha).setOrigin(0).setDepth(20);
  scene.tweens.add({
    targets: overlay,
    alpha: 0,
    duration: ms,
    onComplete: () => overlay.destroy(),
  });
}
