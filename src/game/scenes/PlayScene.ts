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
import { toCss } from '../color.ts';
import { distance, isInRect, orbitPositions, pickTile, type Point } from '../hitTest.ts';
import { Background } from '../objects/Background.ts';
import { FoundWords } from '../objects/FoundWords.ts';
import { LetterTile } from '../objects/LetterTile.ts';
import { Planet } from '../objects/Planet.ts';
import { TimerRing, timerColor } from '../objects/TimerRing.ts';
import { Tray } from '../objects/Tray.ts';
import type { ResultsData } from './ResultsScene.ts';

const { fonts, input, layout, orbit, palette, timing } = tuning;

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

export class PlayScene extends Phaser.Scene {
  private playData!: PlayData;
  private state!: GameState;
  private angle = 0;
  private tiles: LetterTile[] = [];
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
    this.tiles = [];
    this.trayHold = undefined;
  }

  create(): void {
    this.background = new Background(this);
    this.timerRing = new TimerRing(this);
    this.planet = new Planet(this, layout.planet.x, layout.planet.y, layout.planet.radius, true);
    this.tray = new Tray(this);
    this.foundWords = new FoundWords(this);
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
    const multiplier = orbit.levelSpeedMultipliers[this.state.levelIndex] ?? 1;
    if (this.state.phase === 'playing') {
      this.angle += orbit.baseSpeed * multiplier * (delta / 1000);
    }
    this.background.update(delta, multiplier);
    this.dispatch({ type: 'tick', now: this.time.now });
    this.tilePositions().forEach((p, i) => this.tiles[i]?.setPosition(p.x, p.y));
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
      .setOrigin(0.5);
  }

  /** The one way the scene changes the game: send an action, draw the new state, react to events. */
  private dispatch(action: Action): void {
    const { state, events } = reduce(this.state, action);
    if (state === this.state) return;
    this.state = state;
    for (const event of events) this.onGameEvent(event);
    this.draw();
  }

  private draw(): void {
    const { state } = this;
    const level = currentLevel(state);
    const limit = LEVELS[state.levelIndex]?.timeLimitMs ?? 1;
    const seconds = secondsLeft(state.remainingMs);

    this.levelText.setText(`${state.levelIndex + 1}/${state.puzzle.levels.length}`);
    this.scoreText.setText(totalScore(state).toLocaleString('en-US'));
    this.timerText
      .setText(String(seconds))
      .setColor(
        toCss(seconds < tuning.timerRing.warnBelowSec ? timerColor(seconds) : palette.text),
      );
    this.timerRing.setTime(state.remainingMs / limit, seconds);
    this.comboText.setText(
      state.comboTenths > SCORING.comboStartTenths
        ? `COMBO ×${(state.comboTenths / 10).toFixed(1)}`
        : '',
    );

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

  private onGameEvent(event: GameEvent): void {
    switch (event.type) {
      case 'levelStarted':
        this.buildTiles();
        this.showMessage(`Level ${event.level}`, palette.text);
        break;
      case 'wordAccepted':
        this.showMessage(`+${event.points}`, palette.good);
        break;
      case 'wordRejected':
        this.showMessage(REJECT_MESSAGES[event.reason], palette.bad);
        break;
      case 'keyWordFound':
        this.showMessage(`Key word! +${event.bonus} bonus`, palette.accent);
        break;
      case 'levelEnded':
        if (event.reason === 'timeUp') this.showMessage("Time's up!", palette.bad);
        if (event.level < this.state.puzzle.levels.length) {
          this.time.delayedCall(timing.levelTransitionMs, () =>
            this.dispatch({ type: 'nextLevel', now: this.time.now }),
          );
        }
        break;
      case 'gameOver':
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

  private buildTiles(): void {
    for (const tile of this.tiles) tile.destroy();
    this.tiles = currentLevel(this.state).letters.map(
      (letter) => new LetterTile(this, letter, layout.tileRadius),
    );
    this.tilePositions().forEach((p, i) => this.tiles[i]?.setPosition(p.x, p.y));
  }

  private tilePositions(): Point[] {
    const count = currentLevel(this.state).letters.length;
    return orbitPositions(count, this.angle, layout.orbitRadius, layout.planet);
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
    if (event.repeat && event.key !== 'Backspace') return;
    if (event.key === 'Enter') this.dispatch({ type: 'submit', now: this.time.now });
    else if (event.key === 'Backspace') this.dispatch({ type: 'removeLast' });
    else if (event.key === 'Escape') this.dispatch({ type: 'clear' });
    else if (/^[a-z]$/i.test(event.key)) this.dispatch({ type: 'typeLetter', letter: event.key });
  };
}
