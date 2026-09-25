import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

const { colors, fonts, layout } = tuning;

export class LetterTile extends Phaser.GameObjects.Container {
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, letter: string) {
    super(scene);
    this.circle = scene.add.circle(0, 0, layout.tileRadius, colors.tile);
    this.label = scene.add
      .text(0, 0, letter.toUpperCase(), {
        fontFamily: fonts.family,
        fontSize: `${fonts.tile}px`,
        fontStyle: 'bold',
        color: colors.text,
      })
      .setOrigin(0.5);
    this.add([this.circle, this.label]);
    scene.add.existing(this);
  }

  setSelected(selected: boolean): void {
    this.circle.setFillStyle(selected ? colors.tileSelected : colors.tile);
    this.label.setColor(selected ? colors.dimText : colors.text);
  }
}
