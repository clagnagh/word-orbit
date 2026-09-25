import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { LAUNCH_DATE, playablePuzzleNumber } from '../../core/daily.ts';
import { generateDailyPuzzle } from '../../core/puzzle.ts';
import { toCss } from '../color.ts';
import { orbitPositions } from '../hitTest.ts';
import { Background } from '../objects/Background.ts';
import { createButton } from '../objects/Button.ts';
import { LetterTile } from '../objects/LetterTile.ts';
import { Planet } from '../objects/Planet.ts';
import { wordLists } from '../wordLists.ts';
import type { PlayData } from './PlayScene.ts';

const { fonts, layout, orbit, palette } = tuning;
const { menu } = layout;
const MENU_ORBIT_LETTERS = 'orbit';

export class MenuScene extends Phaser.Scene {
  private background!: Background;
  private tiles: LetterTile[] = [];
  private angle = 0;

  constructor() {
    super('Menu');
  }

  create(): void {
    const { puzzleNumber, isPreview } = playablePuzzleNumber(new Date());
    const cx = layout.width / 2;
    const launch = new Date(LAUNCH_DATE.year, LAUNCH_DATE.month - 1, LAUNCH_DATE.day);

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

    const play = () => {
      const data: PlayData = {
        puzzleNumber,
        isPreview,
        puzzle: generateDailyPuzzle(puzzleNumber, wordLists),
      };
      this.scene.start('Play', data);
    };
    createButton(this, cx, menu.buttonY, 'Play', play);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) play();
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
  }

  private placeTiles(): void {
    const centre = { x: layout.width / 2, y: menu.orbitY };
    orbitPositions(this.tiles.length, this.angle, menu.orbitRadius, centre).forEach((p, i) =>
      this.tiles[i]?.setPosition(p.x, p.y),
    );
  }
}
