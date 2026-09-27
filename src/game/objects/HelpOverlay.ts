import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { Overlay } from './Overlay.ts';

const { fonts, howToPlay: h, palette } = tuning;

/** "How to play": the rules as a numbered list, closed with "Got it". */
export class HelpOverlay extends Overlay {
  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, h, h.title, 'Got it', onClose);
    h.lines.forEach((line, i) => {
      const y = h.firstLineY + i * h.lineSpacing;
      this.add([
        this.text(h.numberX, y, String(i + 1), h.lineSize, palette.accent, fonts.bold).setOrigin(
          0.5,
          0,
        ),
        this.text(h.textX, y, line, h.lineSize, palette.text).setWordWrapWidth(h.lineWidth),
      ]);
    });
  }
}
