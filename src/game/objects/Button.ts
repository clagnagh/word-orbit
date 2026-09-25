import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

const { colors, fonts, layout } = tuning;

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const { buttonWidth, buttonHeight } = layout.menu;
  const box = scene.add
    .rectangle(0, 0, buttonWidth, buttonHeight, colors.button)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onClick);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: fonts.family,
      fontSize: `${fonts.button}px`,
      fontStyle: 'bold',
      color: colors.text,
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [box, text]);
}
