import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import { toCss } from '../color.ts';
import { createButton } from './Button.ts';

const { fonts, layout, palette } = tuning;

/** Where an overlay's card, title and closing button sit (from tuning.ts). */
export interface OverlayLayout {
  readonly panel: {
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly cornerRadius: number;
  };
  readonly titleY: number;
  readonly titleSize: number;
  readonly buttonY: number;
}

/**
 * A card over a dimmed screen, with a title and a closing button. Subclasses add their
 * content with `this.add(...)`; `text()` makes text in the game's font.
 */
export class Overlay extends Phaser.GameObjects.Container {
  private readonly onClose: () => void;

  constructor(
    scene: Phaser.Scene,
    look: OverlayLayout,
    title: string,
    buttonLabel: string,
    onClose: () => void,
  ) {
    super(scene, 0, 0);
    this.onClose = onClose;
    const { width, height } = layout;
    const { panel } = look;
    const left = (width - panel.width) / 2;
    const top = panel.y - panel.height / 2;

    // Full-screen dimmer that also swallows taps meant for things underneath.
    const dim = scene.add
      .rectangle(0, 0, width, height, palette.skyTop, tuning.howToPlay.dimAlpha)
      .setOrigin(0)
      .setInteractive();
    const card = scene.add
      .graphics()
      .fillStyle(palette.panel, 1)
      .fillRoundedRect(left, top, panel.width, panel.height, panel.cornerRadius)
      .lineStyle(layout.tray.strokeWidth, palette.panelStroke, 1)
      .strokeRoundedRect(left, top, panel.width, panel.height, panel.cornerRadius);
    const heading = this.text(
      width / 2,
      look.titleY,
      title,
      look.titleSize,
      palette.text,
      fonts.bold,
    ).setOrigin(0.5);
    const button = createButton(scene, width / 2, look.buttonY, buttonLabel, () => this.close());
    this.add([dim, card, heading, button]).setDepth(40);
    scene.add.existing(this);
  }

  protected text(
    x: number,
    y: number,
    value: string,
    size: number,
    color: number,
    weight: string = fonts.regular,
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, value, {
      fontFamily: fonts.family,
      fontSize: `${size}px`,
      fontStyle: weight,
      color: toCss(color),
    });
  }

  close(): void {
    if (!this.active) return;
    this.destroy();
    this.onClose();
  }
}
