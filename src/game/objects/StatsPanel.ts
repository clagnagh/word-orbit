import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import type { Stats } from '../../core/stats.ts';
import { toCss } from '../color.ts';

const { fonts, layout, palette } = tuning;
const { chart, stats: columns } = layout.results;

/** Played · Streak · Best, then a small bar chart of recent scores with today's bar highlighted. */
export function drawStatsPanel(
  scene: Phaser.Scene,
  stats: Stats,
  streak: number,
  todayPuzzle: number,
): void {
  const values: [string, string][] = [
    [String(stats.played), 'PLAYED'],
    [`🔥${streak}`, 'STREAK'],
    [stats.bestScore.toLocaleString('en-US'), 'BEST'],
  ];
  values.forEach(([value, label], i) => {
    const x = columns.columnsX[i] ?? 0;
    scene.add
      .text(x, columns.valueY, value, {
        fontFamily: fonts.family,
        fontSize: `${fonts.hudValue}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);
    scene.add
      .text(x, columns.labelY, label, {
        fontFamily: fonts.family,
        fontSize: `${fonts.hudLabel}px`,
        color: toCss(palette.dimText),
      })
      .setOrigin(0.5)
      .setLetterSpacing(fonts.labelLetterSpacing);
  });

  const games = stats.history.slice(-chart.maxBars);
  if (games.length === 0) return;
  scene.add
    .text(
      layout.width / 2,
      chart.titleY,
      `LAST ${games.length} ${games.length === 1 ? 'GAME' : 'GAMES'}`,
      {
        fontFamily: fonts.family,
        fontSize: `${fonts.hudLabel}px`,
        color: toCss(palette.dimText),
      },
    )
    .setOrigin(0.5)
    .setLetterSpacing(fonts.labelLetterSpacing);

  // Bars keep a fixed width (as if all 14 were shown) and are centred, so few games still look tidy.
  const barWidth = (chart.width - chart.barGap * (chart.maxBars - 1)) / chart.maxBars;
  const totalWidth = games.length * barWidth + (games.length - 1) * chart.barGap;
  const left = (layout.width - totalWidth) / 2;
  const best = Math.max(1, ...games.map((g) => g.score));
  const g = scene.add.graphics();
  games.forEach((game, i) => {
    const h = Math.max(chart.cornerRadius * 2, (game.score / best) * chart.height);
    const isToday = game.puzzle === todayPuzzle;
    g.fillStyle(isToday ? palette.accent : palette.planet, isToday ? 1 : chart.pastAlpha);
    g.fillRoundedRect(
      left + i * (barWidth + chart.barGap),
      chart.top + chart.height - h,
      barWidth,
      h,
      chart.cornerRadius,
    );
  });
}
