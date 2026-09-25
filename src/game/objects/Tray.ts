import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';

const { fonts, layout, palette, tray } = tuning;

/** Shows the word being built. Tapping and holding it is handled by the Play scene. */
export class Tray extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { x, y, width, height, cornerRadius, strokeWidth } = layout.tray;
    super(scene, x, y);
    const box = scene.add
      .graphics()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius)
      .lineStyle(strokeWidth, palette.panelStroke, 1)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.tray}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);
    this.add([box, this.label]);
    scene.add.existing(this);
    this.setWord('');
  }

  setWord(word: string): void {
    if (word) {
      this.label
        .setText(word.toUpperCase().split('').join(' '))
        .setFontSize(fonts.tray)
        .setFontStyle(fonts.bold)
        .setAlpha(1);
    } else {
      this.label
        .setText(tray.placeholder)
        .setFontSize(fonts.subtitle)
        .setFontStyle(fonts.regular)
        .setAlpha(tray.placeholderAlpha);
    }
  }
}
