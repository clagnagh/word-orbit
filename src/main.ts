import Phaser from 'phaser';
import { tuning } from './config/tuning.ts';
import { MenuScene } from './game/scenes/MenuScene.ts';
import { PlayScene } from './game/scenes/PlayScene.ts';
import { ResultsScene } from './game/scenes/ResultsScene.ts';

function startGame(): void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: tuning.palette.skyTop,
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
}

// Phaser draws text once onto a canvas, so the font must be ready before the first scene.
// If it fails to load, start anyway with the fallback fonts.
Promise.all(
  [tuning.fonts.regular, tuning.fonts.bold].map((weight) =>
    document.fonts.load(`${weight} 40px Fredoka`),
  ),
)
  .catch(() => undefined)
  .finally(startGame);
