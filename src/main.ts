import Phaser from 'phaser';
import { tuning } from './config/tuning.ts';
import { installAudioUnlock } from './game/audio.ts';
import { MenuScene } from './game/scenes/MenuScene.ts';
import { PlayScene } from './game/scenes/PlayScene.ts';
import { ResultsScene } from './game/scenes/ResultsScene.ts';

function startGame(): void {
  installAudioUnlock();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: tuning.palette.skyTop,
    // Sound comes from zzfx (src/game/audio.ts), so Phaser's own audio system is switched off.
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: tuning.layout.width,
      height: tuning.layout.height,
    },
    scene: [MenuScene, PlayScene, ResultsScene],
  });

  // Dev builds only: the tuning panel, and a handle for browser tests and the console.
  // Production builds drop this block, and lil-gui with it.
  if (import.meta.env.DEV) {
    Object.assign(window, { wordOrbit: game });
    void import('./game/debugPanel.ts').then((panel) => panel.installDebugPanel(game));
  }
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
