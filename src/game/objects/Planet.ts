import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

const { colors, fonts, layout } = tuning;

export class Planet extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
    super(scene, layout.planet.x, layout.planet.y);
    const circle = scene.add.circle(0, 0, layout.planet.radius, colors.planet);
    const hint = scene.add
      .text(0, 0, 'tap to\nsubmit', {
        fontFamily: fonts.family,
        fontSize: `${fonts.foundWords}px`,
        color: colors.dimText,
        align: 'center',
      })
      .setOrigin(0.5);
    this.add([circle, hint]);
    scene.add.existing(this);
  }
}
