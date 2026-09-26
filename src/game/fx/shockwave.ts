import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { reducedMotion } from '../motion.ts';

/** A ring that expands from `fromRadius` and fades out. */
export function shockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  fromRadius: number,
): void {
  if (reducedMotion()) return;
  const { shockwaveRadius, shockwaveMs, shockwaveWidth } = tuning.fx.keyWord;
  const ring = scene.add.graphics({ x, y }).setDepth(5);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: shockwaveMs,
    ease: 'Cubic.Out',
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      ring
        .clear()
        .lineStyle(shockwaveWidth * (1 - t) + 1, color, 1 - t)
        .strokeCircle(0, 0, fromRadius + (shockwaveRadius - fromRadius) * t);
    },
    onComplete: () => ring.destroy(),
  });
}
