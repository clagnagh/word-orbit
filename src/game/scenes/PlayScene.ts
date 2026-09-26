import Phaser from 'phaser';
import { tuning } from '../../config/tuning.ts';
import {
  currentLevel,
  newGame,
  reduce,
  summarize,
  totalScore,
  trayWord,
  type Action,
  type GameEvent,
  type GameState,
  type RejectReason,
} from '../../core/game.ts';
import type { Puzzle } from '../../core/puzzle.ts';
import { LEVELS, MIN_WORD_LENGTH, SCORING } from '../../core/rules.ts';
import { secondsLeft } from '../../core/scoring.ts';
import { sfx } from '../audio.ts';
import { toCss } from '../color.ts';
import { burst } from '../fx/burst.ts';
import { flash } from '../fx/flash.ts';
import { floatText } from '../fx/floatText.ts';
import { flyLetter } from '../fx/flyTo.ts';
import { pop } from '../fx/pop.ts';
import { shake, wiggle } from '../fx/shake.ts';
import { shockwave } from '../fx/shockwave.ts';
import { distance, isInRect, orbitPositions, pickTile, type Point } from '../hitTest.ts';
import { vibrate } from '../haptics.ts';
import { reducedMotion } from '../motion.ts';
import { Background } from '../objects/Background.ts';
import { FoundWords } from '../objects/FoundWords.ts';
import { LetterTile } from '../objects/LetterTile.ts';
import { MuteButton } from '../objects/MuteButton.ts';
import { Planet } from '../objects/Planet.ts';
import { TimerRing, timerColor } from '../objects/TimerRing.ts';
import { Tray } from '../objects/Tray.ts';
import type { ResultsData } from './ResultsScene.ts';

const { fonts, fx, input, layout, orbit, palette, timing } = tuning;

export interface PlayData {
  puzzleNumber: number;
  isPreview: boolean;
  puzzle: Puzzle;
}

const REJECT_MESSAGES: Record<RejectReason, string> = {
  tooShort: 'Too short',
  notAWord: 'Not a word',
  alreadyFound: 'Already found',
};

/** What the tray showed just before an action, so effects can start from there. */
interface Before {
  word: string;
  letterPositions: Point[];
  /** True when this action found the key word (so the key-word sound replaces the word chime). */
  keyWord: boolean;
}

export class PlayScene extends Phaser.Scene {
  private playData!: PlayData;
  private state!: GameState;
  private angle = 0;
  /** Extra rotation, used by the key-word spiral. */
  private spin = 0;
  private tiles: LetterTile[] = [];
  /** Each tile's current distance from the planet; animated when tiles fly in, out or spiral. */
  private tileRadii: number[] = [];
  private slowMoElapsed: number | null = null;
  private shown = { comboTenths: 0, score: 0, timerColor: -1, seconds: -1 };
  private background!: Background;
  private planet!: Planet;
  private timerRing!: TimerRing;
  private tray!: Tray;
  private foundWords!: FoundWords;
  private levelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private trayHold?: Phaser.Time.TimerEvent;

  constructor() {
    super('Play');
  }

  init(data: PlayData): void {
    this.playData = data;
    this.state = newGame(data.puzzle);
    this.angle = 0;
    this.spin = 0;
    this.tiles = [];
    this.tileRadii = [];
    this.slowMoElapsed = null;
    this.shown = { comboTenths: 0, score: 0, timerColor: -1, seconds: -1 };
    this.trayHold = undefined;
  }

  create(): void {
    this.tweens.timeScale = 1;
    this.background = new Background(this);
    this.timerRing = new TimerRing(this);
    this.planet = new Planet(this, layout.planet.x, layout.planet.y, layout.planet.radius, true);
    this.tray = new Tray(this);
    this.foundWords = new FoundWords(this);
    new MuteButton(this);
    this.createHud();

    this.messageText = this.add
      .text(layout.width / 2, layout.messageY, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.message}px`,
        fontStyle: fonts.medium,
        color: toCss(palette.text),
      })
      .setOrigin(0.5);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    // Typing uses the browser's keydown event directly: Phaser's keyboard queue can replay
    // earlier keys in the same frame as pointer input, which would add duplicate letters.
    window.addEventListener('keydown', this.onKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', this.onKeyDown),
    );

    this.dispatch({ type: 'start', now: this.time.now });
  }

  update(_time: number, delta: number): void {
    const multiplier = this.speedMultiplier();
    if (this.state.phase === 'playing') {
      this.angle += orbit.baseSpeed * multiplier * (delta / 1000);
    }
    this.updateSlowMo(delta);
    this.background.update(delta, multiplier);
    this.dispatch({ type: 'tick', now: this.time.now });
    this.tilePositions().forEach((p, i) => this.tiles[i]?.setPosition(p.x, p.y));
  }

  private speedMultiplier(): number {
    return orbit.levelSpeedMultipliers[this.state.levelIndex] ?? 1;
  }

  private createHud(): void {
    const { hud } = layout;
    const label = (x: number, text: string, originX: number) =>
      this.add
        .text(x, hud.labelY, text, {
          fontFamily: fonts.family,
          fontSize: `${fonts.hudLabel}px`,
          color: toCss(palette.dimText),
        })
        .setOrigin(originX, 0.5)
        .setLetterSpacing(fonts.labelLetterSpacing);
    const value = (x: number, originX: number) =>
      this.add
        .text(x, hud.valueY, '', {
          fontFamily: fonts.family,
          fontSize: `${fonts.hudValue}px`,
          fontStyle: fonts.bold,
          color: toCss(palette.text),
        })
        .setOrigin(originX, 0.5);

    // Level and time are anchored to the screen edges, so changing digit widths
    // only move their inner edge; the score is centred under its label.
    const left = hud.sideMargin;
    const right = layout.width - hud.sideMargin;
    label(left, 'LEVEL', 0);
    label(layout.width / 2, 'SCORE', 0.5);
    label(right, 'TIME', 1);
    this.levelText = value(left, 0);
    this.scoreText = value(layout.width / 2, 0.5);
    this.timerText = value(right, 1);
    this.comboText = this.add
      .text(layout.width / 2, layout.comboY, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.combo}px`,
        fontStyle: fonts.bold,
        color: toCss(palette.accent),
      })
      .setOrigin(0.5)
      .setPadding(fx.combo.glowPadding);
  }

  /** The one way the scene changes the game: send an action, draw the new state, react to events. */
  private dispatch(action: Action): void {
    const prev = this.state;
    const before: Before = {
      word: trayWord(prev),
      letterPositions: action.type === 'submit' ? this.tray.letterPositions() : [],
      keyWord: false,
    };
    const { state, events } = reduce(prev, action);
    if (state === prev) return;
    before.keyWord = events.some((e) => e.type === 'keyWordFound');
    this.state = state;
    for (const event of events) this.onGameEvent(event, before);
    this.draw();

    const added =
      state.tray.length === prev.tray.length + 1 && state.levelIndex === prev.levelIndex;
    if (added) this.onTileAdded(state.tray[state.tray.length - 1]!);
  }

  private draw(): void {
    const { state } = this;
    const level = currentLevel(state);
    const limit = LEVELS[state.levelIndex]?.timeLimitMs ?? 1;
    const seconds = secondsLeft(state.remainingMs);

    this.levelText.setText(`${state.levelIndex + 1}/${state.puzzle.levels.length}`);
    this.timerText.setText(String(seconds));
    if (seconds !== this.shown.seconds) {
      this.shown.seconds = seconds;
      const ticking = seconds > 0 && seconds <= tuning.audio.tickFromSec;
      if (ticking && state.phase === 'playing') sfx.tick(seconds % 2 === 0);
    }
    this.timerRing.setTime(state.remainingMs / limit, seconds);

    // Changing a text's colour or shadow redraws it, so only do it when the value changes.
    const color = seconds < tuning.timerRing.warnBelowSec ? timerColor(seconds) : palette.text;
    if (color !== this.shown.timerColor) {
      this.shown.timerColor = color;
      this.timerText.setColor(toCss(color));
    }
    const score = totalScore(state);
    if (score !== this.shown.score) {
      if (score > this.shown.score) pop(this, this.scoreText, fx.scorePopScale);
      this.shown.score = score;
      this.scoreText.setText(score.toLocaleString('en-US'));
    }
    if (state.comboTenths !== this.shown.comboTenths) this.drawCombo(state.comboTenths);

    const word = trayWord(state);
    this.tray.setWord(word);
    this.planet.setReady(word.length >= MIN_WORD_LENGTH);
    this.tiles.forEach((tile, id) => {
      const position = state.tray.indexOf(id);
      tile.setOrder(position === -1 ? null : position + 1);
    });

    const found = state.progress[state.levelIndex]?.foundWords ?? [];
    this.foundWords.update(found, level.validWords.length);
  }

  /** The combo grows and glows as it climbs, and pops each time it goes up. */
  private drawCombo(tenths: number): void {
    const rising = tenths > this.shown.comboTenths;
    this.shown.comboTenths = tenths;
    const steps = tenths - SCORING.comboStartTenths;
    if (steps <= 0) {
      this.tweens.killTweensOf(this.comboText);
      this.comboText.setText('').setScale(1);
      return;
    }
    const restScale = 1 + steps * fx.combo.growPerStep;
    this.comboText
      .setText(`COMBO ×${(tenths / 10).toFixed(1)}`)
      .setShadow(0, 0, toCss(palette.accent), steps * fx.combo.glowPerStep, false, true)
      .setScale(restScale);
    if (rising) pop(this, this.comboText, fx.combo.popScale, restScale);
  }

  private onGameEvent(event: GameEvent, before: Before): void {
    const { planet } = layout;
    switch (event.type) {
      case 'levelStarted': {
        this.buildTiles();
        sfx.levelStart();
        this.showMessage(`Level ${event.level}`, palette.text);
        if (event.level > 1) {
          floatText(this, planet.x, planet.y, `SPEED ×${this.speedMultiplier()}`, palette.accent);
          this.background.surge(fx.starSurge.multiplier, fx.starSurge.ms);
        }
        break;
      }
      case 'wordAccepted': {
        if (!before.keyWord) {
          sfx.valid();
          vibrate('valid');
        }
        const comboSteps = event.comboTenths - SCORING.comboStartTenths;
        if (comboSteps > 0) sfx.comboUp(comboSteps);
        const { ms, staggerMs, endScale } = fx.intoPlanet;
        before.letterPositions.forEach((from, i) =>
          flyLetter(this, before.word[i] ?? '', {
            from,
            to: planet,
            ms,
            delayMs: i * staggerMs,
            endScale,
            ease: 'Cubic.In',
            fontSize: fonts.tray,
          }),
        );
        const arriveMs = reducedMotion() ? 0 : ms + staggerMs * (before.letterPositions.length - 1);
        this.time.delayedCall(arriveMs, () => {
          burst(this, planet.x, planet.y, palette.star, fx.burst.count, planet.radius);
          floatText(this, planet.x, planet.y - planet.radius, `+${event.points}`, palette.good);
        });
        break;
      }
      case 'wordRejected':
        sfx.wrong();
        vibrate('wrong');
        this.showMessage(REJECT_MESSAGES[event.reason], palette.bad);
        wiggle(this, this.tray);
        if (event.reason === 'alreadyFound') {
          this.tray.flashBorder(palette.accent, fx.trayFlashMs);
          this.foundWords.pulse(event.word);
        } else {
          this.tray.flashBorder(palette.bad, fx.trayFlashMs);
          if (event.reason === 'notAWord') shake(this.cameras.main);
        }
        break;
      case 'keyWordFound':
        sfx.keyWord();
        vibrate('keyWord');
        this.keyWordMoment(event.bonus);
        break;
      case 'levelEnded':
        if (event.reason === 'timeUp') {
          this.showMessage("Time's up!", palette.bad);
          this.flyTilesOut();
        }
        if (event.level < this.state.puzzle.levels.length) {
          this.time.delayedCall(timing.levelTransitionMs, () =>
            this.dispatch({ type: 'nextLevel', now: this.time.now }),
          );
        }
        break;
      case 'gameOver':
        sfx.gameOver();
        this.time.delayedCall(timing.gameOverDelayMs, () => {
          const data: ResultsData = {
            puzzleNumber: this.playData.puzzleNumber,
            isPreview: this.playData.isPreview,
            puzzle: this.state.puzzle,
            summary: summarize(this.state),
          };
          this.scene.start('Results', data);
        });
        break;
    }
  }

  /** The big moment: slow motion, a flash, a shockwave, then the tiles spiral into the planet. */
  private keyWordMoment(bonus: number): void {
    const { planet } = layout;
    const k = fx.keyWord;
    if (!reducedMotion()) {
      this.slowMoElapsed = 0;
      this.tweens.timeScale = k.slowScale;
    }
    flash(this, palette.text);
    shockwave(this, planet.x, planet.y, palette.accent, planet.radius);
    burst(this, planet.x, planet.y, palette.accent, fx.burst.keyWordCount, planet.radius);
    floatText(
      this,
      planet.x,
      planet.y,
      `KEY WORD +${bonus.toLocaleString('en-US')}`,
      palette.accent,
      fx.floatText.keyWordFontSize,
      fx.floatText.keyWordMs,
    );

    const startRadii = [...this.tileRadii];
    if (reducedMotion()) {
      this.tweens.add({ targets: this.tiles, alpha: 0, duration: k.spiralMs });
      return;
    }
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: k.spiralMs,
      ease: 'Cubic.In',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        this.spin = t * k.spiralTurns * Math.PI * 2;
        this.tileRadii = startRadii.map((r) => r * (1 - t));
        for (const tile of this.tiles)
          tile.setAlpha(1 - t).setScale(1 - t * (1 - k.spiralEndScale));
      },
    });
  }

  private updateSlowMo(delta: number): void {
    if (this.slowMoElapsed === null) return;
    this.slowMoElapsed += delta;
    const { slowScale, slowMs } = fx.keyWord;
    const t = Math.min(1, this.slowMoElapsed / slowMs);
    this.tweens.timeScale = slowScale + (1 - slowScale) * t * t;
    if (t >= 1) this.slowMoElapsed = null;
  }

  private onTileAdded(tileId: number): void {
    const tile = this.tiles[tileId];
    const target = this.tray.letterPositions().at(-1);
    if (!tile || !target) return;
    sfx.tap(this.state.tray.length - 1);
    vibrate('tap');
    pop(this, tile);
    flyLetter(this, currentLevel(this.state).letters[tileId] ?? '', {
      from: { x: tile.x, y: tile.y },
      to: target,
      ms: fx.ghost.ms,
      endScale: fx.ghost.endScale,
      ease: 'Cubic.Out',
      fontSize: fonts.tile,
    });
  }

  /** New tiles fly in from outside the screen, one after another. */
  private buildTiles(): void {
    for (const tile of this.tiles) tile.destroy();
    this.spin = 0;
    const letters = currentLevel(this.state).letters;
    this.tiles = letters.map((letter) => new LetterTile(this, letter, layout.tileRadius));
    const { fromRadius, ms, staggerMs } = fx.flyIn;
    const still = reducedMotion();
    this.tileRadii = letters.map(() => (still ? layout.orbitRadius : fromRadius));
    this.tiles.forEach((tile, i) => {
      tile.setAlpha(0);
      this.tweens.add({ targets: tile, alpha: 1, delay: i * staggerMs, duration: ms });
      if (still) return;
      this.tweens.addCounter({
        from: fromRadius,
        to: layout.orbitRadius,
        delay: i * staggerMs,
        duration: ms,
        ease: 'Back.Out',
        onUpdate: (tween) => {
          this.tileRadii[i] = tween.getValue() ?? layout.orbitRadius;
        },
      });
    });
    this.tilePositions().forEach((p, i) => this.tiles[i]?.setPosition(p.x, p.y));
  }

  private flyTilesOut(): void {
    const { radius, ms } = fx.flyOut;
    this.tweens.add({ targets: this.tiles, alpha: 0, duration: ms, ease: 'Cubic.In' });
    if (reducedMotion()) return;
    const startRadii = [...this.tileRadii];
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      ease: 'Cubic.In',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        this.tileRadii = startRadii.map((r) => r + (radius - r) * t);
      },
    });
  }

  private tilePositions(): Point[] {
    const count = currentLevel(this.state).letters.length;
    const { planet, orbitRadius } = layout;
    return orbitPositions(count, this.angle + this.spin, orbitRadius, planet).map((p, i) => {
      const k = (this.tileRadii[i] ?? orbitRadius) / orbitRadius;
      return { x: planet.x + (p.x - planet.x) * k, y: planet.y + (p.y - planet.y) * k };
    });
  }

  private showMessage(text: string, color: number): void {
    this.messageTimer?.remove();
    this.messageText.setText(text).setColor(toCss(color));
    this.messageTimer = this.time.delayedCall(timing.messageMs, () => this.messageText.setText(''));
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const tap = { x: pointer.x, y: pointer.y };
    const tileId = pickTile(tap, this.tilePositions(), layout.tileRadius + input.tileHitPadding);
    if (tileId !== null) {
      this.dispatch({ type: 'tapLetter', tileId });
    } else if (distance(tap, layout.planet) <= layout.planet.radius + input.planetHitPadding) {
      this.dispatch({ type: 'submit', now: this.time.now });
    } else if (isInRect(tap, layout.tray)) {
      // Tap = remove last letter (on release); hold = clear the whole word.
      this.trayHold = this.time.delayedCall(input.longPressMs, () => {
        this.trayHold = undefined;
        this.dispatch({ type: 'clear' });
      });
    }
  }

  private onPointerUp(): void {
    if (!this.trayHold) return;
    this.trayHold.remove();
    this.trayHold = undefined;
    this.dispatch({ type: 'removeLast' });
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Keys typed into a text box (e.g. the dev tuning panel) aren't meant for the game.
    if (event.target instanceof HTMLInputElement) return;
    if (event.repeat && event.key !== 'Backspace') return;
    if (event.key === 'Enter') this.dispatch({ type: 'submit', now: this.time.now });
    else if (event.key === 'Backspace') this.dispatch({ type: 'removeLast' });
    else if (event.key === 'Escape') this.dispatch({ type: 'clear' });
    else if (/^[a-z]$/i.test(event.key)) this.dispatch({ type: 'typeLetter', letter: event.key });
  };
}
