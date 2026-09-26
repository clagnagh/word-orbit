import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { LAUNCH_DATE, msUntilNextPuzzle } from '../../core/daily.ts';
import { summarize, type GameState } from '../../core/game.ts';
import { generateDailyPuzzle } from '../../core/puzzle.ts';
import { hasPlayed } from '../../core/stats.ts';
import { toCss } from '../color.ts';
import { orbitPositions } from '../hitTest.ts';
import { Background } from '../objects/Background.ts';
import { createButton } from '../objects/Button.ts';
import { HelpOverlay } from '../objects/HelpOverlay.ts';
import { LetterTile } from '../objects/LetterTile.ts';
import { MuteButton } from '../objects/MuteButton.ts';
import { Planet } from '../objects/Planet.ts';
import {
  hasSeenHelp,
  loadGame,
  loadPlayerStats,
  markHelpSeen,
  today,
  todaysPuzzle,
} from '../session.ts';
import { wordLists } from '../wordLists.ts';
import type { PlayData } from './PlayScene.ts';
import type { ResultsData } from './ResultsScene.ts';

const { daily, fonts, layout, muteButton, orbit, palette } = tuning;
const { menu } = layout;
const MENU_ORBIT_LETTERS = 'orbit';

/** "05:12:33" */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((n) => String(n).padStart(2, '0')).join(':');
}

export class MenuScene extends Phaser.Scene {
  private background!: Background;
  private tiles: LetterTile[] = [];
  private angle = 0;
  private statusText?: Phaser.GameObjects.Text;
  private statusPrefix = '';
  private help: HelpOverlay | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    const { puzzleNumber, isPreview } = todaysPuzzle();
    const cx = layout.width / 2;
    const launch = new Date(LAUNCH_DATE.year, LAUNCH_DATE.month - 1, LAUNCH_DATE.day);
    this.help = null;

    this.background = new Background(this);

    this.add
      .text(cx, menu.titleY, 'Word Orbit', {
        fontFamily: fonts.family,
        fontSize: `${fonts.title}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);

    const launchText = launch.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    this.add
      .text(
        cx,
        menu.subtitleY,
        isPreview
          ? `PREVIEW PUZZLE\nDAILY PUZZLES FROM ${launchText.toUpperCase()}`
          : `PUZZLE #${puzzleNumber}`,
        {
          fontFamily: fonts.family,
          fontSize: `${fonts.subtitle}px`,
          color: toCss(palette.dimText),
          align: 'center',
          lineSpacing: menu.subtitleLineSpacing,
        },
      )
      .setOrigin(0.5, 0)
      .setLetterSpacing(fonts.labelLetterSpacing);

    new Planet(this, cx, menu.orbitY, menu.planetRadius, false);
    this.angle = -Math.PI / 2;
    this.tiles = [...MENU_ORBIT_LETTERS].map(
      (letter) => new LetterTile(this, letter, menu.tileRadius, fonts.subtitle),
    );
    this.placeTiles();

    // What the main button does depends on today's progress.
    const puzzle = generateDailyPuzzle(puzzleNumber, wordLists);
    const saved = isPreview ? null : loadGame(puzzle, puzzleNumber);
    const stats = loadPlayerStats();
    const finished = saved?.phase === 'over';
    const played = !isPreview && (finished || hasPlayed(stats, puzzleNumber));

    const startPlay = (resume?: GameState) => {
      const data: PlayData = { puzzleNumber, isPreview, puzzle, resume };
      this.scene.start('Play', data);
    };
    const showResults = (state: GameState) => {
      const data: ResultsData = {
        puzzleNumber,
        isPreview: false,
        puzzle,
        summary: summarize(state),
        stats,
      };
      this.scene.start('Results', data);
    };

    let primary: (() => void) | null;
    let label: string;
    if (finished && saved) {
      label = 'See results';
      primary = () => showResults(saved);
    } else if (played) {
      label = 'Played ✓';
      primary = null;
    } else if (saved && saved.phase !== 'ready') {
      label = 'Continue';
      primary = () => startPlay(saved);
    } else {
      label = 'Play';
      primary = () => startPlay();
    }
    const button = createButton(this, cx, menu.buttonY, label, () => primary?.());
    if (!primary) button.setAlpha(0.5).disableInteractive();

    if (!isPreview) {
      this.statusPrefix = `${played ? `${daily.playedLabel}  ·  ` : ''}${daily.countdownPrefix} `;
      this.statusText = this.add
        .text(cx, daily.statusY, '', {
          fontFamily: fonts.family,
          fontSize: `${fonts.hudLabel}px`,
          color: toCss(palette.dimText),
        })
        .setOrigin(0.5)
        .setLetterSpacing(fonts.labelLetterSpacing);
    }

    new MuteButton(this);
    this.createHelpButton();
    if (!hasSeenHelp()) this.openHelp();

    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key !== 'Enter' || event.repeat) return;
      if (this.help) this.help.close();
      else primary?.();
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', onKey),
    );
  }

  update(_time: number, delta: number): void {
    this.background.update(delta);
    this.angle += orbit.menuSpeed * (delta / 1000);
    this.placeTiles();

    if (this.statusText) {
      const left = msUntilNextPuzzle(today());
      // A new day has started: rebuild the menu for the new puzzle.
      if (left <= 0) {
        this.scene.restart();
        return;
      }
      this.statusText.setText(this.statusPrefix + formatCountdown(left));
    }
  }

  private createHelpButton(): void {
    const { x, y, fontSize } = tuning.helpButton;
    const bg = this.add
      .circle(0, 0, muteButton.radius, palette.panel)
      .setStrokeStyle(layout.tray.strokeWidth, palette.panelStroke);
    const mark = this.add
      .text(0, 0, '?', {
        fontFamily: fonts.family,
        fontSize: `${fontSize}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);
    this.add
      .container(x, y, [bg, mark])
      .setSize(muteButton.hitSize, muteButton.hitSize)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.openHelp());
  }

  private openHelp(): void {
    if (this.help) return;
    this.help = new HelpOverlay(this, () => {
      this.help = null;
      markHelpSeen();
    });
  }

  private placeTiles(): void {
    const centre = { x: layout.width / 2, y: menu.orbitY };
    orbitPositions(this.tiles.length, this.angle, menu.orbitRadius, centre).forEach((p, i) =>
      this.tiles[i]?.setPosition(p.x, p.y),
    );
  }
}
