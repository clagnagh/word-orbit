import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import type { Point } from '../hitTest.ts';

const { fonts, layout, palette, tray } = tuning;

/** Shows the word being built. Tapping and holding it is handled by the Play scene. */
export class Tray extends Phaser.GameObjects.Container {
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private word = '';
  private flashTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    const { x, y } = layout.tray;
    super(scene, x, y);
    this.box = scene.add.graphics();
    this.drawBox(palette.panelStroke);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.tray}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);
    this.add([this.box, this.label]);
    scene.add.existing(this);
    this.setWord('');
  }

  setWord(word: string): void {
    this.word = word;
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

  /** Screen positions of each letter currently shown, left to right. */
  letterPositions(): Point[] {
    const n = this.word.length;
    if (n === 0) return [];
    // Letters are separated by spaces, so the text is 2n − 1 roughly equal-width characters.
    const advance = this.label.width / (2 * n - 1);
    const left = layout.tray.x - this.label.width / 2;
    return Array.from({ length: n }, (_, i) => ({
      x: left + advance * (2 * i + 0.5),
      y: layout.tray.y,
    }));
  }

  /** Briefly colour the border, e.g. coral for a wrong word. */
  flashBorder(color: number, ms: number): void {
    this.flashTimer?.remove();
    this.drawBox(color);
    this.flashTimer = this.scene.time.delayedCall(ms, () => this.drawBox(palette.panelStroke));
  }

  private drawBox(strokeColor: number): void {
    const { width, height, cornerRadius, strokeWidth } = layout.tray;
    this.box
      .clear()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius)
      .lineStyle(strokeWidth, strokeColor, 1)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, cornerRadius);
  }
}
