import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import { reducedMotion } from '../motion.ts';

/** Text that drifts upward and fades out, e.g. "+250". With reduced motion it only fades. */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  fontSize: number = tuning.fonts.message,
  ms: number = tuning.fx.floatText.ms,
): void {
  const { fonts } = tuning;
  const label = scene.add
    .text(x, y, text, {
      fontFamily: fonts.family,
      fontSize: `${fontSize}px`,
      fontStyle: fonts.bold,
      color: toCss(color),
      stroke: toCss(tuning.palette.skyTop),
      strokeThickness: tuning.fx.floatText.outlineWidth,
    })
    .setOrigin(0.5)
    .setDepth(10);
  // Rise the whole time, but stay fully visible for the first half so it can be read.
  if (!reducedMotion()) {
    scene.tweens.add({
      targets: label,
      y: y - tuning.fx.floatText.rise,
      duration: ms,
      ease: 'Cubic.Out',
    });
  }
  scene.tweens.add({
    targets: label,
    alpha: 0,
    delay: ms / 2,
    duration: ms / 2,
    ease: 'Quad.In',
    onComplete: () => label.destroy(),
  });
}
