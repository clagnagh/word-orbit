import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import { createButton } from './Button.ts';

const { fonts, howToPlay: h, layout, palette } = tuning;

/** "How to play": dims the screen, lists the rules, and closes with "Got it". */
export class HelpOverlay extends Phaser.GameObjects.Container {
  private readonly onClose: () => void;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, 0, 0);
    this.onClose = onClose;
    const { width, height } = layout;

    // Full-screen dimmer that also swallows taps meant for things underneath.
    const dim = scene.add
      .rectangle(0, 0, width, height, palette.skyTop, h.dimAlpha)
      .setOrigin(0)
      .setInteractive();
    const { panel } = h;
    const card = scene.add
      .graphics()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(
        (width - panel.width) / 2,
        panel.y - panel.height / 2,
        panel.width,
        panel.height,
        panel.cornerRadius,
      )
      .lineStyle(layout.tray.strokeWidth, palette.panelStroke, 1)
      .strokeRoundedRect(
        (width - panel.width) / 2,
        panel.y - panel.height / 2,
        panel.width,
        panel.height,
        panel.cornerRadius,
      );
    const title = scene.add
      .text(width / 2, h.titleY, h.title, {
        fontFamily: fonts.family,
        fontSize: `${h.titleSize}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);

    const lines = h.lines.flatMap((line, i) => {
      const y = h.firstLineY + i * h.lineSpacing;
      const style = { fontFamily: fonts.family, fontSize: `${h.lineSize}px` };
      return [
        scene.add
          .text(h.numberX, y, String(i + 1), {
            ...style,
            fontStyle: fonts.bold,
            color: toCss(palette.accent),
          })
          .setOrigin(0.5, 0),
        scene.add.text(h.textX, y, line, {
          ...style,
          color: toCss(palette.text),
          wordWrap: { width: h.lineWidth },
        }),
      ];
    });

    const button = createButton(scene, width / 2, h.buttonY, 'Got it', () => this.close());
    this.add([dim, card, title, ...lines, button]).setDepth(40);
    scene.add.existing(this);
  }

  close(): void {
    if (!this.active) return;
    this.destroy();
    this.onClose();
  }
}
