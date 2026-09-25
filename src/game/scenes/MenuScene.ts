import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { LAUNCH_DATE, playablePuzzleNumber } from '../../core/daily.ts';
import { generateDailyPuzzle } from '../../core/puzzle.ts';
import { createButton } from '../objects/Button.ts';
import { wordLists } from '../wordLists.ts';
import type { PlayData } from './PlayScene.ts';

const { colors, fonts, layout } = tuning;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { puzzleNumber, isPreview } = playablePuzzleNumber(new Date());
    const cx = layout.width / 2;
    const launch = new Date(LAUNCH_DATE.year, LAUNCH_DATE.month - 1, LAUNCH_DATE.day);

    this.add
      .text(cx, layout.menu.titleY, 'WORD ORBIT', {
        fontFamily: fonts.family,
        fontSize: `${fonts.title}px`,
        fontStyle: 'bold',
        color: colors.text,
      })
      .setOrigin(0.5);

    const subtitle = isPreview
      ? `Preview puzzle\nDaily puzzles start ${launch.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`
      : `Puzzle #${puzzleNumber}`;
    this.add
      .text(cx, layout.menu.subtitleY, subtitle, {
        fontFamily: fonts.family,
        fontSize: `${fonts.subtitle}px`,
        color: colors.dimText,
        align: 'center',
      })
      .setOrigin(0.5, 0);

    const play = () => {
      const data: PlayData = {
        puzzleNumber,
        isPreview,
        puzzle: generateDailyPuzzle(puzzleNumber, wordLists),
      };
      this.scene.start('Play', data);
    };
    createButton(this, cx, layout.menu.buttonY, 'Play', play);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) play();
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', onKey),
    );
  }
}
