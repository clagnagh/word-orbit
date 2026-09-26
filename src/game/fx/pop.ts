import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { reducedMotion } from '../motion.ts';

type Scalable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/** Quickly grow a target, then spring back to `restScale`. */
export function pop(
  scene: Phaser.Scene,
  target: Scalable,
  scale: number = tuning.fx.pop.scale,
  restScale = 1,
): void {
  if (reducedMotion()) return;
  const { upMs, downMs } = tuning.fx.pop;
  scene.tweens.killTweensOf(target);
  target.setScale(restScale);
  scene.tweens.chain({
    targets: target,
    tweens: [
      { scale: restScale * scale, duration: upMs, ease: 'Quad.Out' },
      { scale: restScale, duration: downMs, ease: 'Back.Out' },
    ],
  });
}
