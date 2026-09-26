import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import { pop } from '../fx/pop.ts';

const { fonts, layout, palette } = tuning;
const area = layout.foundWords;

/** "Found 3 · 20 to find" plus the words as pills, newest first, centred in rows. */
export class FoundWords {
  private readonly header: Phaser.GameObjects.Text;
  private readonly pills: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly pillByWord = new Map<string, Phaser.GameObjects.Container>();
  private shownKey = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.header = scene.add
      .text(layout.width / 2, area.headerY, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.foundHeader}px`,
        color: toCss(palette.dimText),
      })
      .setOrigin(0.5)
      .setLetterSpacing(fonts.labelLetterSpacing);
    this.pills = scene.add.container(0, 0);
  }

  update(words: readonly string[], totalWords: number): void {
    const key = `${totalWords}:${words.join(',')}`;
    if (key === this.shownKey) return;
    this.shownKey = key;

    const left = totalWords - words.length;
    this.header.setText(`FOUND ${words.length}  ·  ${left} TO FIND`);
    this.pills.removeAll(true);
    this.pillByWord.clear();

    const rows: Phaser.GameObjects.Container[][] = [[]];
    const rowWidths = [0];
    for (const word of [...words].reverse()) {
      const pill = this.makePill(word);
      const width = pill.width;
      let row = rows.length - 1;
      const limit = row === area.maxRows - 1 ? area.lastRowWidth : area.width;
      const needed = rowWidths[row]! + (rows[row]!.length ? area.pillGap : 0) + width;
      if (needed > limit) {
        if (rows.length === area.maxRows) {
          pill.destroy();
          break;
        }
        rows.push([]);
        rowWidths.push(0);
        row++;
      }
      rowWidths[row]! += (rows[row]!.length ? area.pillGap : 0) + width;
      rows[row]!.push(pill);
    }

    rows.forEach((row, r) => {
      let x = (layout.width - rowWidths[r]!) / 2;
      for (const pill of row) {
        pill.setPosition(x + pill.width / 2, area.firstRowY + r * area.rowSpacing);
        x += pill.width + area.pillGap;
      }
    });
  }

  private makePill(word: string): Phaser.GameObjects.Container {
    const text = this.scene.add
      .text(0, 0, word.toUpperCase(), {
        fontFamily: fonts.family,
        fontSize: `${fonts.foundWord}px`,
        fontStyle: fonts.medium,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);
    const width = text.width + area.pillPaddingX * 2;
    const h = area.pillHeight;
    const bg = this.scene.add
      .graphics()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(-width / 2, -h / 2, width, h, h / 2);
    const pill = this.scene.add.container(0, 0, [bg, text]).setSize(width, h);
    this.pillByWord.set(word, pill);
    this.pills.add(pill);
    return pill;
  }

  /** Draw the eye to a word that's already been found. */
  pulse(word: string): void {
    const pill = this.pillByWord.get(word);
    if (!pill) return;
    const text = pill.list.find(
      (o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text,
    );
    text?.setColor(toCss(palette.accent));
    pop(this.scene, pill, tuning.fx.pillPulse.scale);
    this.scene.time.delayedCall(tuning.fx.pillPulse.highlightMs, () =>
      text?.setColor(toCss(palette.text)),
    );
  }
}
