import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { reducedMotion } from '../motion.ts';

const SPARK_TEXTURE = 'spark';

/** A one-off spray of glowing particles from the edge of a circle (radius 0 = a point). */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number = tuning.fx.burst.count,
  fromRadius = 0,
): void {
  if (reducedMotion()) return;
  const { speedMin, speedMax, lifespanMs, particleRadius } = tuning.fx.burst;
  if (!scene.textures.exists(SPARK_TEXTURE)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillCircle(particleRadius, particleRadius, particleRadius);
    g.generateTexture(SPARK_TEXTURE, particleRadius * 2, particleRadius * 2);
    g.destroy();
  }
  const emitter = scene.add.particles(x, y, SPARK_TEXTURE, {
    speed: { min: speedMin, max: speedMax },
    lifespan: lifespanMs,
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: color,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
    ...(fromRadius > 0 && {
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, fromRadius),
        quantity: count,
      },
    }),
  });
  emitter.explode(count);
  scene.time.delayedCall(lifespanMs + 100, () => emitter.destroy());
}
