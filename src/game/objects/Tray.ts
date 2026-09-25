import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

const { colors, fonts, layout } = tuning;

/** Shows the word being built. Tapping and holding it is handled by the Play scene. */
export class Tray extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { x, y, width, height } = layout.tray;
    super(scene, x, y);
    const box = scene.add
      .rectangle(0, 0, width, height, colors.tray)
      .setStrokeStyle(2, colors.trayStroke);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.tray}px`,
        fontStyle: 'bold',
        color: colors.text,
      })
      .setOrigin(0.5);
    this.add([box, this.label]);
    scene.add.existing(this);
  }

  setWord(word: string): void {
    this.label.setText(word.toUpperCase().split('').join(' '));
  }
}
