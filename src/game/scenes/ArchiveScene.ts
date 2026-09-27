import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import {
  archiveMonths,
  dayColor,
  isArchiveDay,
  monthDays,
  type DayColor,
} from '../../core/archive.ts';
import { LAUNCH_DATE, puzzleNumberFor } from '../../core/daily.ts';
import { generateDailyPuzzle } from '../../core/puzzle.ts';
import { toCss } from '../color.ts';
import { pop } from '../fx/pop.ts';
import { Background } from '../objects/Background.ts';
import { createButton } from '../objects/Button.ts';
import { createIconButton } from '../objects/IconButton.ts';
import { loadArchiveGame, loadDayResults, today } from '../session.ts';
import { wordLists } from '../wordLists.ts';
import type { PlayData } from './PlayScene.ts';

const { archive: a, fonts, layout, palette } = tuning;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface ArchiveData {
  /** Which month to show, as an index into archiveMonths(); defaults to the latest. */
  monthIndex?: number;
}

/** Read when drawn, so the colours follow the current theme. */
function fillFor(color: DayColor): number {
  return {
    perfect: palette.good,
    played: palette.accent,
    empty: palette.panelStroke,
    unplayed: palette.panel,
  }[color];
}

/** A calendar of past puzzles: coloured by how each day went, and tap a day to play it. */
export class ArchiveScene extends Phaser.Scene {
  private background!: Background;

  constructor() {
    super('Archive');
  }

  create(data: ArchiveData = {}): void {
    const cx = layout.width / 2;
    this.background = new Background(this);
    const text = (
      x: number,
      y: number,
      value: string,
      size: number,
      color: number,
      weight: string = fonts.regular,
    ) =>
      this.add
        .text(x, y, value, {
          fontFamily: fonts.family,
          fontSize: `${size}px`,
          fontStyle: weight,
          color: toCss(color),
          align: 'center',
        })
        .setOrigin(0.5);

    text(cx, a.titleY, 'ARCHIVE', fonts.subtitle, palette.dimText).setLetterSpacing(
      fonts.labelLetterSpacing,
    );
    createButton(this, cx, a.buttonY, 'Menu', () => this.scene.start('Menu'));

    const now = today();
    const months = archiveMonths(now);
    if (months.length === 0) {
      const launch = new Date(LAUNCH_DATE.year, LAUNCH_DATE.month - 1, LAUNCH_DATE.day);
      const date = launch.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
      text(
        cx,
        a.emptyNoteY,
        `The archive opens on ${date},\nwhen puzzle #1 goes live.`,
        fonts.subtitle,
        palette.text,
      ).setLineSpacing(a.lineSpacing);
      return;
    }

    const index = Phaser.Math.Clamp(data.monthIndex ?? months.length - 1, 0, months.length - 1);
    const { year, month } = months[index]!;
    const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
    text(cx, a.monthY, label.toUpperCase(), fonts.hudValue, palette.text, fonts.bold);
    const [prevX, nextX] = a.arrowsX;
    if (index > 0) {
      createIconButton(this, prevX ?? 0, a.monthY, '‹', () =>
        this.scene.restart({ monthIndex: index - 1 }),
      );
    }
    if (index < months.length - 1) {
      createIconButton(this, nextX ?? 0, a.monthY, '›', () =>
        this.scene.restart({ monthIndex: index + 1 }),
      );
    }

    const gridWidth = 7 * a.cell + 6 * a.gap;
    const left = (layout.width - gridWidth) / 2 + a.cell / 2;
    WEEKDAYS.forEach((d, i) =>
      text(left + i * (a.cell + a.gap), a.weekdayY, d, fonts.hudLabel, palette.dimText),
    );

    const todayPuzzle = puzzleNumberFor(now);
    const results = loadDayResults();
    const days = monthDays(year, month);
    const firstWeekday = days[0]?.weekday ?? 0;
    for (const day of days) {
      const slot = firstWeekday + day.day - 1;
      const x = left + (slot % 7) * (a.cell + a.gap);
      const y = a.firstRowY + Math.floor(slot / 7) * a.rowSpacing;
      const playable = isArchiveDay(day.puzzleNumber, todayPuzzle);
      const isToday = day.puzzleNumber === todayPuzzle;
      const color = dayColor(results[day.puzzleNumber]);
      const filled = playable && color !== 'unplayed';

      const cell = this.add.container(x, y);
      const box = this.add
        .graphics()
        .fillStyle(fillFor(playable ? color : 'unplayed'), 1)
        .fillRoundedRect(-a.cell / 2, -a.cell / 2, a.cell, a.cell, a.cornerRadius);
      if (isToday) {
        box
          .lineStyle(a.todayStroke, palette.accent, 1)
          .strokeRoundedRect(-a.cell / 2, -a.cell / 2, a.cell, a.cell, a.cornerRadius);
      }
      const number = text(
        0,
        0,
        String(day.day),
        a.dayFont,
        filled && color !== 'empty' ? palette.tileText : palette.text,
        fonts.bold,
      );
      cell.add([box, number]);
      if (!playable && !isToday) cell.setAlpha(a.unavailableAlpha);

      if (playable) {
        cell
          .setSize(a.cell, a.cell)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            pop(this, cell, a.tapPopScale);
            this.playDay(day.puzzleNumber);
          });
      } else if (isToday) {
        // Today's puzzle is the daily: the menu's Play button is the way in.
        cell
          .setSize(a.cell, a.cell)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.scene.start('Menu'));
      }
    }

    // Legend: what the colours mean, in two rows of two.
    const legend: [DayColor, string][] = [
      ['perfect', 'All key words'],
      ['played', 'Some words'],
      ['empty', 'No words'],
      ['unplayed', 'Not played'],
    ];
    legend.forEach(([color, name], i) => {
      const x = a.legendX[i % 2] ?? 0;
      const y = a.legendY[Math.floor(i / 2)] ?? 0;
      const size = a.legendSquare;
      this.add
        .graphics()
        .fillStyle(fillFor(color), 1)
        .fillRoundedRect(x, y - size / 2, size, size, 4)
        .lineStyle(2, palette.panelStroke, 1)
        .strokeRoundedRect(x, y - size / 2, size, size, 4);
      this.add
        .text(x + size + 10, y, name, {
          fontFamily: fonts.family,
          fontSize: `${fonts.credit}px`,
          color: toCss(palette.dimText),
        })
        .setOrigin(0, 0.5);
    });
    text(cx, a.hintY, a.hint, fonts.credit, palette.dimText).setWordWrapWidth(a.hintWidth);
  }

  /** Starts a past day, continuing it if it's the archive game left unfinished. */
  private playDay(puzzleNumber: number): void {
    const puzzle = generateDailyPuzzle(puzzleNumber, wordLists);
    const saved = loadArchiveGame(puzzle, puzzleNumber);
    const resume = saved && saved.phase !== 'over' && saved.phase !== 'ready' ? saved : undefined;
    const data: PlayData = { puzzleNumber, isPreview: false, isArchive: true, puzzle, resume };
    this.scene.start('Play', data);
  }

  update(_time: number, delta: number): void {
    this.background.update(delta);
  }
}
