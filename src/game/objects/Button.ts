import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';

const { fonts, layout, palette } = tuning;

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const { buttonWidth: w, buttonHeight: h, buttonCornerRadius: r } = layout.menu;
  const bg = scene.add
    .graphics()
    .fillStyle(palette.planet, 1)
    .fillRoundedRect(-w / 2, -h / 2, w, h, r);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: fonts.family,
      fontSize: `${fonts.button}px`,
      fontStyle: fonts.bold,
      color: toCss(palette.tileText),
    })
    .setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]).setSize(w, h);
  button
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onClick)
    .on('pointerover', () => button.setScale(layout.menu.buttonHoverScale))
    .on('pointerout', () => button.setScale(1));
  return button;
}
