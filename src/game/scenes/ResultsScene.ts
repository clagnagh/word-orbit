import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { wordOfTheDay } from '../../core/definitions.ts';
import type { GameSummary } from '../../core/game.ts';
import type { Puzzle } from '../../core/puzzle.ts';
import { shareText } from '../../core/share.ts';
import { displayStreak, isNewBest, type Stats } from '../../core/stats.ts';
import { toCss } from '../color.ts';
import { loadDefinitions } from '../definitions.ts';
import { Background } from '../objects/Background.ts';
import { createButton } from '../objects/Button.ts';
import { drawStatsPanel } from '../objects/StatsPanel.ts';
import { showToast } from '../objects/Toast.ts';
import { shareResult } from '../share.ts';

const { fonts, layout, palette } = tuning;
const { results } = layout;

export interface ResultsData {
  puzzleNumber: number;
  isPreview: boolean;
  puzzle: Puzzle;
  summary: GameSummary;
  /** The player's stats including this game, or null for the (unsaved) preview puzzle. */
  stats: Stats | null;
}

const SHARE_MESSAGES = {
  shared: 'Shared!',
  copied: 'Copied!',
  cancelled: null,
  failed: 'Couldn’t copy. Try again?',
} as const;

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

    const newBest = data.stats ? isNewBest(data.stats, data.puzzleNumber) : false;
    if (newBest) {
      text(
        results.newBestY,
        '⭐ NEW BEST',
        fonts.hudLabel,
        palette.accent,
        fonts.bold,
      ).setLetterSpacing(fonts.labelLetterSpacing);
    }

    // Key words are only revealed here, after the game is over.
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

    const streak = data.stats ? displayStreak(data.stats, data.puzzleNumber) : 0;
    if (data.stats) {
      drawStatsPanel(this, data.stats, streak, data.puzzleNumber);
    } else {
      text(
        results.previewNoteY,
        results.previewNote,
        fonts.hudLabel,
        palette.dimText,
        fonts.regular,
      ).setLetterSpacing(fonts.labelLetterSpacing);
    }

    this.showWordOfTheDay(data.puzzle);

    const share = shareText(data.puzzleNumber, data.summary, streak, { newBest });
    const { card } = results;
    const left = cx - card.width / 2;
    const top = card.y - card.height / 2;
    this.add
      .graphics()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(left, top, card.width, card.height, card.cornerRadius)
      .lineStyle(layout.tray.strokeWidth, palette.panelStroke, 1)
      .strokeRoundedRect(left, top, card.width, card.height, card.cornerRadius);
    this.add
      .text(cx, card.y, share, {
        fontFamily: fonts.family,
        fontSize: `${fonts.share}px`,
        color: toCss(palette.text),
        align: 'center',
        lineSpacing: results.shareLineSpacing,
      })
      .setOrigin(0.5);

    const [shareX, menuX] = results.buttonsX;
    createButton(
      this,
      shareX ?? cx,
      results.buttonY,
      'Share',
      () => {
        void shareResult(share).then((outcome) => {
          const message = SHARE_MESSAGES[outcome];
          if (message && this.scene.isActive()) showToast(this, message);
        });
      },
      results.buttonWidth,
    );
    createButton(
      this,
      menuX ?? cx,
      results.buttonY,
      'Menu',
      () => this.scene.start('Menu'),
      results.buttonWidth,
    );
  }

  /** Fades in once the definitions have loaded; its space is kept free until then. */
  private showWordOfTheDay(puzzle: Puzzle): void {
    const { wordOfDay } = results;
    const cx = layout.width / 2;
    void loadDefinitions().then((definitions) => {
      const word = definitions && wordOfTheDay(puzzle, definitions);
      if (!word || !this.scene.isActive()) return;
      const style = (size: number, color: number, weight: string = fonts.regular) => ({
        fontFamily: fonts.family,
        fontSize: `${size}px`,
        fontStyle: weight,
        color: toCss(color),
        align: 'center',
      });
      const label = this.add
        .text(cx, wordOfDay.labelY, 'WORD OF THE DAY', style(fonts.hudLabel, palette.dimText))
        .setOrigin(0.5)
        .setLetterSpacing(fonts.labelLetterSpacing);
      const headline = this.add
        .text(
          cx,
          wordOfDay.headlineY,
          `${word.word.toUpperCase()}  (${word.partOfSpeech})`,
          style(fonts.wordOfDay, palette.accent, fonts.bold),
        )
        .setOrigin(0.5);
      const definition = this.add
        .text(cx, wordOfDay.definitionY, word.definition, {
          ...style(fonts.definition, palette.text),
          wordWrap: { width: wordOfDay.textWidth, useAdvancedWrap: true },
          maxLines: wordOfDay.maxLines,
          lineSpacing: wordOfDay.lineSpacing,
        })
        .setOrigin(0.5, 0);
      const credit = this.add
        .text(
          cx,
          definition.y + definition.height + wordOfDay.creditGap,
          wordOfDay.credit,
          style(fonts.credit, palette.dimText),
        )
        .setOrigin(0.5, 0);
      const parts = [label, headline, definition, credit];
      parts.forEach((part) => part.setAlpha(0));
      this.tweens.add({ targets: parts, alpha: 1, duration: wordOfDay.fadeMs });
    });
  }

  update(_time: number, delta: number): void {
    this.background.update(delta);
  }
}
