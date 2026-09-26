import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';

const { layout, palette, timerRing } = tuning;

/** Teal normally, amber when time is getting low, coral near the end. */
export function timerColor(secondsLeft: number): number {
  if (secondsLeft < timerRing.dangerBelowSec) return palette.bad;
  if (secondsLeft < timerRing.warnBelowSec) return palette.warn;
  return palette.planet;
}

/** A ring around the planet that shrinks clockwise as time runs out, changing colour near the end. */
export class TimerRing extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene) {
    super(scene, { x: layout.planet.x, y: layout.planet.y });
    scene.add.existing(this);
  }

  /** `fraction` is time left from 1 (full) to 0 (empty). */
  setTime(fraction: number, secondsLeft: number): void {
    const color = timerColor(secondsLeft);
    const start = -Math.PI / 2;
    this.clear()
      .lineStyle(timerRing.thickness, palette.text, timerRing.trackAlpha)
      .strokeCircle(0, 0, timerRing.radius);
    if (fraction <= 0) return;
    this.lineStyle(timerRing.thickness, color, 1)
      .beginPath()
      .arc(0, 0, timerRing.radius, start, start + fraction * Math.PI * 2, false)
      .strokePath();
  }
}
