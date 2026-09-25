import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import type { GameSummary } from '../../core/game.ts';
import type { Puzzle } from '../../core/puzzle.ts';
import { shareText } from '../../core/share.ts';
import { createButton } from '../objects/Button.ts';

const { colors, fonts, layout } = tuning;

export interface ResultsData {
  puzzleNumber: number;
  isPreview: boolean;
  puzzle: Puzzle;
  summary: GameSummary;
}

/** Placeholder until stats are saved in Milestone 7. */
const PLACEHOLDER_STREAK = 1;

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(data: ResultsData): void {
    const cx = layout.width / 2;
    const { results } = layout;
    const text = (y: number, value: string, size: number, color: string = colors.text) =>
      this.add
        .text(cx, y, value, {
          fontFamily: fonts.family,
          fontSize: `${size}px`,
          color,
          align: 'center',
        })
        .setOrigin(0.5);

    text(
      results.titleY,
      data.isPreview ? 'Preview complete' : `Puzzle #${data.puzzleNumber} complete`,
      fonts.subtitle,
      colors.dimText,
    );
    text(results.scoreY, `${data.summary.score.toLocaleString('en-US')} pts`, fonts.title);

    data.puzzle.levels.forEach((level, i) => {
      const outcome = data.summary.levels[i];
      const found = outcome?.keyWordFound;
      const words = outcome?.wordCount ?? 0;
      text(
        results.levelsY + i * results.levelSpacing,
        `Level ${i + 1}: ${level.keyWord.toUpperCase()} ${found ? '✓' : '✗'}  ·  ${words} ${words === 1 ? 'word' : 'words'}`,
        fonts.subtitle,
        found ? colors.good : colors.bad,
      );
    });

    this.add
      .text(cx, results.shareY, shareText(data.puzzleNumber, data.summary, PLACEHOLDER_STREAK), {
        fontFamily: fonts.monoFamily,
        fontSize: `${fonts.share}px`,
        color: colors.dimText,
        align: 'center',
        lineSpacing: results.shareLineSpacing,
      })
      .setOrigin(0.5);

    createButton(this, cx, results.buttonY, 'Menu', () => this.scene.start('Menu'));
  }
}
