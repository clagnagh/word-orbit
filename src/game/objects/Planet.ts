import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

const { palette, planet } = tuning;
const GLOW_TEXTURE = 'planet-glow';
const GLOW_TEXTURE_SIZE = 256;

/** The glowing planet. Its ✓ brightens when the current word is long enough to submit. */
export class Planet extends Phaser.GameObjects.Container {
  private readonly check?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, showCheck: boolean) {
    super(scene, x, y);

    // A soft radial halo; additive blending brightens the sky behind it, so it reads as light.
    if (!scene.textures.exists(GLOW_TEXTURE)) createGlowTexture(scene);
    const glow = scene.add
      .image(0, 0, GLOW_TEXTURE)
      .setDisplaySize(radius * planet.glowScale * 2, radius * planet.glowScale * 2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add([glow, scene.add.circle(0, 0, radius, palette.planet)]);

    if (showCheck) {
      this.check = drawCheck(scene).setAlpha(planet.checkIdleAlpha);
      this.add(this.check);
    }

    const baseScale = glow.scaleX;
    scene.tweens.add({
      targets: glow,
      scaleX: baseScale * planet.breatheScale,
      scaleY: baseScale * planet.breatheScale,
      duration: planet.breatheMs / 2,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
    scene.add.existing(this);
  }

  setReady(ready: boolean): void {
    this.check?.setAlpha(ready ? planet.checkReadyAlpha : planet.checkIdleAlpha);
  }
}

/** Full glow from the planet's edge, fading to nothing at the texture's edge. */
function createGlowTexture(scene: Phaser.Scene): void {
  const size = GLOW_TEXTURE_SIZE;
  const texture = scene.textures.createCanvas(GLOW_TEXTURE, size, size);
  const ctx = texture?.getContext();
  if (!texture || !ctx) return;
  const r = (palette.planetGlow >> 16) & 0xff;
  const g = (palette.planetGlow >> 8) & 0xff;
  const b = palette.planetGlow & 0xff;
  const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const edge = 1 / planet.glowScale;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, rgba(planet.glowAlpha));
  gradient.addColorStop(edge, rgba(planet.glowAlpha));
  gradient.addColorStop(edge + (1 - edge) * 0.35, rgba(planet.glowAlpha * 0.35));
  gradient.addColorStop(1, rgba(0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

function drawCheck(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const s = planet.checkSize;
  return scene.add
    .graphics()
    .lineStyle(planet.checkStroke, palette.tileText, 1)
    .beginPath()
    .moveTo(-s * 0.9, 0)
    .lineTo(-s * 0.25, s * 0.6)
    .lineTo(s * 0.95, -s * 0.6)
    .strokePath();
}
