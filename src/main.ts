import Phaser from 'phaser';
import { tuning } from './config/tuning.ts';
import { MenuScene } from './game/scenes/MenuScene.ts';
import { PlayScene } from './game/scenes/PlayScene.ts';
import { ResultsScene } from './game/scenes/ResultsScene.ts';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: tuning.colors.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: tuning.layout.width,
    height: tuning.layout.height,
  },
  scene: [MenuScene, PlayScene, ResultsScene],
});

// Dev builds only: lets browser tests and the console inspect the running game.
if (import.meta.env.DEV) Object.assign(window, { wordOrbit: game });
