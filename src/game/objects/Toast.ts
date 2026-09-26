import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';

const { fonts, layout, palette, toast } = tuning;

/** A short message in a pill that fades in and out, e.g. "Copied!". */
export function showToast(scene: Phaser.Scene, message: string): void {
  const text = scene.add
    .text(0, 0, message, {
      fontFamily: fonts.family,
      fontSize: `${toast.fontSize}px`,
      fontStyle: fonts.bold,
      color: toCss(palette.tileText),
    })
    .setOrigin(0.5);
  const width = text.width + toast.paddingX * 2;
  const bg = scene.add
    .graphics()
    .fillStyle(palette.tile, 1)
    .fillRoundedRect(-width / 2, -toast.height / 2, width, toast.height, toast.height / 2);
  const pill = scene.add
    .container(layout.width / 2, toast.y, [bg, text])
    .setDepth(30)
    .setAlpha(0);
  scene.tweens.chain({
    targets: pill,
    tweens: [
      { alpha: 1, duration: toast.fadeMs },
      { alpha: 0, duration: toast.fadeMs, delay: toast.ms },
    ],
    onComplete: () => pill.destroy(),
  });
}
