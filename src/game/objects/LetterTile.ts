import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';

const { fonts, palette, tile } = tuning;

export class LetterTile extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly badge: Phaser.GameObjects.Container;
  private readonly badgeText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, letter: string, radius: number, fontSize: number = fonts.tile) {
    super(scene);
    const shadow = scene.add
      .circle(0, tile.shadowOffsetY, radius, palette.shadow)
      .setAlpha(tile.shadowAlpha);
    const face = scene.add.circle(0, 0, radius, palette.tile);
    this.ring = scene.add
      .circle(0, 0, radius, palette.tile)
      .setStrokeStyle(tile.selectedRingWidth, palette.accent)
      .setVisible(false);
    this.label = scene.add
      .text(0, 0, letter.toUpperCase(), {
        fontFamily: fonts.family,
        fontSize: `${fontSize}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.tileText),
      })
      .setOrigin(0.5);

    this.badgeText = scene.add
      .text(0, 0, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.tileBadge}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.tileText),
      })
      .setOrigin(0.5);
    this.badge = scene.add
      .container(tile.badgeOffset, -tile.badgeOffset, [
        scene.add.circle(0, 0, tile.badgeRadius, palette.accent),
        this.badgeText,
      ])
      .setVisible(false);

    this.add([shadow, face, this.ring, this.label, this.badge]);
    scene.add.existing(this);
  }

  /** `order` is this tile's 1-based position in the current word, or null if not used. */
  setOrder(order: number | null): void {
    const selected = order !== null;
    this.ring.setVisible(selected);
    this.badge.setVisible(selected);
    this.badgeText.setText(selected ? String(order) : '');
    this.label.setAlpha(selected ? tile.selectedLetterAlpha : 1);
  }
}
