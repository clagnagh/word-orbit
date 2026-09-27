// Checks the layout numbers in tuning.ts: orbiting tiles must never overlap the UI around them.
import { describe, expect, it } from 'vitest';
import { tuning } from '../src/config/tuning';
import { ACHIEVEMENTS } from '../src/core/achievements';

const { fonts, fx, hint, input, layout } = tuning;
const { planet } = layout;

// The furthest a tile ever reaches from its centre: popped, or wearing its hint ring.
const tileReach = Math.max(
  layout.tileRadius * fx.pop.scale,
  layout.tileRadius + hint.ringGap + hint.ringWidth / 2,
);
const orbitTop = planet.y - layout.orbitRadius - tileReach;
const orbitBottom = planet.y + layout.orbitRadius + tileReach;
const orbitLeft = planet.x - layout.orbitRadius - tileReach;
const orbitRight = planet.x + layout.orbitRadius + tileReach;
/** Text is centred on its y; allow its full font size above and below to be safe. */
const textBottom = (y: number, size: number) => y + size / 2;
const textTop = (y: number, size: number) => y - size / 2;

describe('play screen layout', () => {
  it('keeps tiles inside the screen', () => {
    expect(orbitLeft).toBeGreaterThanOrEqual(0);
    expect(orbitRight).toBeLessThanOrEqual(layout.width);
  });

  it('keeps tiles below the goal line, combo and score', () => {
    expect(textBottom(tuning.goal.y, tuning.goal.fontSize)).toBeLessThan(orbitTop);
    expect(textBottom(layout.comboY, fonts.combo)).toBeLessThan(orbitTop);
    expect(textBottom(layout.hud.valueY, fonts.hudValue)).toBeLessThan(orbitTop);
  });

  it('keeps tiles above the message line and the tray', () => {
    expect(orbitBottom).toBeLessThan(textTop(layout.messageY, fonts.message));
    expect(orbitBottom).toBeLessThan(layout.tray.y - layout.tray.height / 2);
  });

  it('keeps tap areas apart: tiles, planet and tray never compete for a tap', () => {
    const tileHit = layout.tileRadius + input.tileHitPadding;
    const planetHit = planet.radius + input.planetHitPadding;
    const trayHitTop = layout.tray.y - Math.max(layout.tray.height, input.minTapSize) / 2;
    expect(planetHit).toBeLessThan(layout.orbitRadius - tileHit);
    expect(planet.y + layout.orbitRadius + tileHit).toBeLessThan(trayHitTop);
  });

  it('gives every button a tap area of at least the minimum size', () => {
    expect(layout.menu.buttonWidth).toBeGreaterThanOrEqual(input.minTapSize);
    expect(tuning.muteButton.hitSize).toBeGreaterThanOrEqual(input.minTapSize);
    expect(layout.results.buttonWidth).toBeGreaterThanOrEqual(input.minTapSize);
  });

  it('keeps the found-word rows on screen', () => {
    const { foundWords } = layout;
    const lastRow = foundWords.firstRowY + (foundWords.maxRows - 1) * foundWords.rowSpacing;
    expect(lastRow + foundWords.pillHeight / 2).toBeLessThanOrEqual(layout.height);
  });
});

describe('menu and archive layout', () => {
  it('spaces the menu buttons so their tap areas never overlap', () => {
    const { menuBar, muteButton } = tuning;
    const xs = [
      menuBar.helpX,
      menuBar.achievementsX,
      menuBar.archiveX,
      menuBar.themesX,
      muteButton.x,
    ];
    xs.slice(1).forEach((x, i) => expect(x - xs[i]!).toBeGreaterThanOrEqual(input.minTapSize));
    expect(xs[0]! - input.minTapSize / 2).toBeGreaterThanOrEqual(0);
    expect(xs.at(-1)! + input.minTapSize / 2).toBeLessThanOrEqual(layout.width);
  });

  it('fits a six-week month, the legend and the hint above the Menu button', () => {
    const { archive } = tuning;
    expect(7 * archive.cell + 6 * archive.gap).toBeLessThanOrEqual(layout.width);
    const lastRowBottom = archive.firstRowY + 5 * archive.rowSpacing + archive.cell / 2;
    expect(lastRowBottom).toBeLessThan(archive.legendY[0]! - archive.legendSquare / 2);
    expect(archive.hintY).toBeLessThan(
      archive.buttonY - layout.menu.buttonHeight / 2 - fonts.credit,
    );
  });

  it('keeps every achievement row inside its panel, above the Close button', () => {
    const { achievementsPanel: a } = tuning;
    const lastRow =
      a.firstRowY + (ACHIEVEMENTS.length - 1) * a.rowSpacing + a.lineOffset + a.descriptionSize / 2;
    expect(lastRow).toBeLessThan(a.buttonY - layout.menu.buttonHeight / 2);
    expect(a.panel.y + a.panel.height / 2).toBeLessThanOrEqual(layout.height);
  });
});
