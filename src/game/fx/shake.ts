import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { reducedMotion } from '../motion.ts';

/** Shake the whole view. */
export function shake(
  camera: Phaser.Cameras.Scene2D.Camera,
  intensity: number = tuning.fx.cameraShake.intensity,
  ms: number = tuning.fx.cameraShake.ms,
): void {
  if (reducedMotion()) return;
  camera.shake(ms, intensity);
}

/** Wiggle one object side to side, ending where it started. */
export function wiggle(scene: Phaser.Scene, target: Phaser.GameObjects.Container): void {
  if (reducedMotion()) return;
  const { distance, swings, ms } = tuning.fx.trayShake;
  const homeX = target.x;
  scene.tweens.killTweensOf(target);
  target.x = homeX;
  scene.tweens.add({
    targets: target,
    x: homeX + distance,
    duration: ms / (swings * 2),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: swings - 1,
    onComplete: () => {
      target.x = homeX;
    },
  });
}
