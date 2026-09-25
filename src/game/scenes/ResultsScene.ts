import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import type { GameSummary } from '../../core/game.ts';
import type { Puzzle } from '../../core/puzzle.ts';
import { shareText } from '../../core/share.ts';
import { toCss } from '../color.ts';
import { Background } from '../objects/Background.ts';
import { createButton } from '../objects/Button.ts';

const { fonts, layout, palette } = tuning;
const { results } = layout;

export interface ResultsData {
  puzzleNumber: number;
  isPreview: boolean;
  puzzle: Puzzle;
  summary: GameSummary;
}

/** Placeholder until stats are saved in Milestone 7. */
const PLACEHOLDER_STREAK = 1;

export class ResultsScene extends Phaser.Scene {
  private background!: Background;

  constructor() {
    super('Results');
  }

  create(data: ResultsData): void {
    const cx = layout.width / 2;
    this.background = new Background(this);

    const text = (y: number, value: string, size: number, color: number, weight: string) =>
      this.add
        .text(cx, y, value, {
          fontFamily: fonts.family,
          fontSize: `${size}px`,
          fontStyle: weight,
          color: toCss(color),
          align: 'center',
        })
        .setOrigin(0.5);

    text(
      results.titleY,
      data.isPreview ? 'PREVIEW COMPLETE' : `PUZZLE #${data.puzzleNumber} COMPLETE`,
      fonts.subtitle,
      palette.dimText,
      fonts.regular,
    ).setLetterSpacing(fonts.labelLetterSpacing);
    text(
      results.scoreY,
      data.summary.score.toLocaleString('en-US'),
      fonts.resultsScore,
      palette.text,
      fonts.bold,
    );

    data.puzzle.levels.forEach((level, i) => {
      const outcome = data.summary.levels[i];
      const found = outcome?.keyWordFound ?? false;
      const words = outcome?.wordCount ?? 0;
      text(
        results.levelsY + i * results.levelSpacing,
        `${found ? '✓' : '✗'}  ${level.keyWord.toUpperCase()}  ·  ${words} ${words === 1 ? 'word' : 'words'}`,
        fonts.resultsLevel,
        found ? palette.good : palette.dimText,
        fonts.medium,
      );
    });

    const { card } = results;
    this.add
      .graphics()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(
        cx - card.width / 2,
        card.y - card.height / 2,
        card.width,
        card.height,
        card.cornerRadius,
      )
      .lineStyle(layout.tray.strokeWidth, palette.panelStroke, 1)
      .strokeRoundedRect(
        cx - card.width / 2,
        card.y - card.height / 2,
        card.width,
        card.height,
        card.cornerRadius,
      );
    this.add
      .text(cx, card.y, shareText(data.puzzleNumber, data.summary, PLACEHOLDER_STREAK), {
        fontFamily: fonts.family,
        fontSize: `${fonts.share}px`,
        color: toCss(palette.text),
        align: 'center',
        lineSpacing: results.shareLineSpacing,
      })
      .setOrigin(0.5);

    createButton(this, cx, results.buttonY, 'Menu', () => this.scene.start('Menu'));
  }

  update(_time: number, delta: number): void {
    this.background.update(delta);
  }
}
