import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { isMuted, setMuted } from '../audio.ts';

const { muteButton: b, palette } = tuning;

/** A round speaker button in the bottom-right corner; the choice is remembered between visits. */
export class MuteButton extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    super(scene, b.x, b.y);
    const bg = scene.add
      .circle(0, 0, b.radius, palette.panel)
      .setStrokeStyle(tuning.layout.tray.strokeWidth, palette.panelStroke);
    this.icon = scene.add.graphics();
    this.add([bg, this.icon]).setSize(b.hitSize, b.hitSize).setDepth(15);
    this.setInteractive({ useHandCursor: true }).on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        setMuted(!isMuted());
        this.draw();
      },
    );
    scene.add.existing(this);
    this.draw();
  }

  private draw(): void {
    const s = b.iconSize;
    const g = this.icon.clear();
    // Speaker: a small box and a cone.
    g.fillStyle(palette.text, 1)
      .fillRect(-s, -s * 0.4, s * 0.6, s * 0.8)
      .fillTriangle(-s * 0.4, -s * 0.4, 0, -s, 0, s)
      .fillTriangle(-s * 0.4, -s * 0.4, 0, s, -s * 0.4, s * 0.4);
    g.lineStyle(b.lineWidth, isMuted() ? palette.bad : palette.text, 1);
    if (isMuted()) {
      // A cross: sound off.
      g.lineBetween(s * 0.35, -s * 0.45, s * 1.15, s * 0.45).lineBetween(
        s * 0.35,
        s * 0.45,
        s * 1.15,
        -s * 0.45,
      );
    } else {
      // Sound waves.
      g.beginPath()
        .arc(0, 0, s * 0.6, -0.8, 0.8)
        .strokePath();
      g.beginPath()
        .arc(0, 0, s * 1.1, -0.8, 0.8)
        .strokePath();
    }
  }
}
