import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import { reducedMotion } from '../motion.ts';

const { background, layout, palette } = tuning;
const TEXTURE_KEY = 'sky-gradient';

interface Star {
  readonly dot: Phaser.GameObjects.Arc;
  readonly speed: number;
}

/** A vertical gradient sky with layers of slowly drifting stars (nearer layers drift faster). */
export class Background {
  private readonly stars: Star[] = [];
  private readonly scene: Phaser.Scene;
  private surgeFactor = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!scene.textures.exists(TEXTURE_KEY)) createGradientTexture(scene);
    scene.add.image(0, 0, TEXTURE_KEY).setOrigin(0);

    for (const layer of background.starLayers) {
      for (let i = 0; i < layer.count; i++) {
        const dot = scene.add
          .circle(
            Phaser.Math.Between(0, layout.width),
            Phaser.Math.Between(0, layout.height),
            layer.radius,
            palette.star,
          )
          .setAlpha(layer.alpha);
        this.stars.push({ dot, speed: layer.speed });
      }
    }
  }

  /** Drift the stars downward; `speedMultiplier` makes faster levels feel faster. */
  update(deltaMs: number, speedMultiplier = 1): void {
    if (reducedMotion()) return;
    const seconds = deltaMs / 1000;
    for (const { dot, speed } of this.stars) {
      dot.y += speed * speedMultiplier * this.surgeFactor * seconds;
      if (dot.y > layout.height + dot.radius) {
        dot.y = -dot.radius;
        dot.x = Phaser.Math.Between(0, layout.width);
      }
    }
  }

  /** Stars rush past at `multiplier`× speed, then ease back to normal. */
  surge(multiplier: number, ms: number): void {
    this.scene.tweens.addCounter({
      from: multiplier,
      to: 1,
      duration: ms,
      ease: 'Cubic.Out',
      onUpdate: (tween) => {
        this.surgeFactor = tween.getValue() ?? 1;
      },
    });
  }
}

function createGradientTexture(scene: Phaser.Scene): void {
  const texture = scene.textures.createCanvas(TEXTURE_KEY, layout.width, layout.height);
  const ctx = texture?.getContext();
  if (!texture || !ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.height);
  gradient.addColorStop(0, toCss(palette.skyTop));
  gradient.addColorStop(1, toCss(palette.skyBottom));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.width, layout.height);
  texture.refresh();
}
