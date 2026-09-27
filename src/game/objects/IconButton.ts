import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';

const { fonts, layout, muteButton, palette } = tuning;

/** A round button showing a symbol or emoji, with a tap area of at least the minimum size. */
export function createIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
  fontSize: number = tuning.helpButton.fontSize,
): Phaser.GameObjects.Container {
  const bg = scene.add
    .circle(0, 0, muteButton.radius, palette.panel)
    .setStrokeStyle(layout.tray.strokeWidth, palette.panelStroke);
  const mark = scene.add
    .text(0, 0, label, {
      fontFamily: fonts.family,
      fontSize: `${fontSize}px`,
      fontStyle: fonts.bold,
      color: toCss(palette.text),
    })
    .setOrigin(0.5);
  return scene.add
    .container(x, y, [bg, mark])
    .setSize(muteButton.hitSize, muteButton.hitSize)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onTap);
}
