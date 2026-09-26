import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import { reducedMotion } from '../motion.ts';
import type { Point } from '../hitTest.ts';

export interface FlyOptions {
  from: Point;
  to: Point;
  ms: number;
  delayMs?: number;
  endScale: number;
  ease: string;
  fontSize: number;
}

/** A temporary copy of a letter that flies from one place to another, then disappears. */
export function flyLetter(scene: Phaser.Scene, letter: string, options: FlyOptions): void {
  if (reducedMotion()) return;
  const { fonts, palette } = tuning;
  const ghost = scene.add
    .text(options.from.x, options.from.y, letter.toUpperCase(), {
      fontFamily: fonts.family,
      fontSize: `${options.fontSize}px`,
      fontStyle: fonts.bold,
      color: toCss(palette.text),
    })
    .setOrigin(0.5)
    .setDepth(8);
  scene.tweens.add({
    targets: ghost,
    x: options.to.x,
    y: options.to.y,
    scale: options.endScale,
    alpha: { from: 1, to: 0.2 },
    delay: options.delayMs ?? 0,
    duration: options.ms,
    ease: options.ease,
    onComplete: () => ghost.destroy(),
  });
}
