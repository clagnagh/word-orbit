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
import { SCORING } from '../../core/rules.ts';
import { secondsLeft } from '../../core/scoring.ts';
import { distance, isInRect, orbitPositions, pickTile, type Point } from '../hitTest.ts';
import { LetterTile } from '../objects/LetterTile.ts';
import { Planet } from '../objects/Planet.ts';
import { Tray } from '../objects/Tray.ts';
import type { ResultsData } from './ResultsScene.ts';

const { colors, fonts, input, layout, orbit, timing } = tuning;

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
  private tray!: Tray;
  private levelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private foundText!: Phaser.GameObjects.Text;
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
    new Planet(this);
    this.tray = new Tray(this);

    const hudStyle = { fontFamily: fonts.family, fontSize: `${fonts.hud}px`, color: colors.text };
    const m = layout.hudSideMargin;
    this.levelText = this.add.text(m, layout.hudY, '', hudStyle).setOrigin(0, 0.5);
    this.scoreText = this.add.text(layout.width / 2, layout.hudY, '', hudStyle).setOrigin(0.5);
    this.timerText = this.add.text(layout.width - m, layout.hudY, '', hudStyle).setOrigin(1, 0.5);
    this.comboText = this.add
      .text(layout.width / 2, layout.comboY, '', { ...hudStyle, color: colors.good })
      .setOrigin(0.5);
    this.messageText = this.add
      .text(layout.width / 2, layout.messageY, '', {
        fontFamily: fonts.family,
        fontSize: `${fonts.message}px`,
        color: colors.text,
      })
      .setOrigin(0.5);
    this.foundText = this.add.text(layout.foundWords.x, layout.foundWords.y, '', {
      fontFamily: fonts.family,
      fontSize: `${fonts.foundWords}px`,
      color: colors.dimText,
      wordWrap: { width: layout.foundWords.width },
      lineSpacing: layout.foundWords.lineSpacing,
    });

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
    if (this.state.phase === 'playing') {
      const multiplier = orbit.levelSpeedMultipliers[this.state.levelIndex] ?? 1;
      this.angle += orbit.baseSpeed * multiplier * (delta / 1000);
    }
    this.dispatch({ type: 'tick', now: this.time.now });
    this.tilePositions().forEach((p, i) => this.tiles[i]?.setPosition(p.x, p.y));
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
    const levelCount = state.puzzle.levels.length;
    this.levelText.setText(`Level ${state.levelIndex + 1}/${levelCount}`);
    this.scoreText.setText(`Score ${totalScore(state).toLocaleString('en-US')}`);
    this.timerText.setText(`⏱ ${secondsLeft(state.remainingMs)}`);
    this.comboText.setText(
      state.comboTenths > SCORING.comboStartTenths
        ? `Combo ×${(state.comboTenths / 10).toFixed(1)}`
        : '',
    );
    this.tray.setWord(trayWord(state));
    this.tiles.forEach((tile, id) => tile.setSelected(state.tray.includes(id)));
    const found = state.progress[state.levelIndex]?.foundWords ?? [];
    this.foundText.setText(found.length ? found.map((w) => w.toUpperCase()).join('   ') : '');
  }

  private onGameEvent(event: GameEvent): void {
    switch (event.type) {
      case 'levelStarted':
        this.buildTiles();
        this.showMessage(`Level ${event.level}`, colors.text);
        break;
      case 'wordAccepted':
        this.showMessage(`+${event.points}`, colors.good);
        break;
      case 'wordRejected':
        this.showMessage(REJECT_MESSAGES[event.reason], colors.bad);
        break;
      case 'keyWordFound':
        this.showMessage(`Key word! +${event.bonus} bonus`, colors.good);
        break;
      case 'levelEnded':
        if (event.reason === 'timeUp') this.showMessage("Time's up!", colors.bad);
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
    this.tiles = currentLevel(this.state).letters.map((letter) => new LetterTile(this, letter));
    this.tilePositions().forEach((p, i) => this.tiles[i]?.setPosition(p.x, p.y));
  }

  private tilePositions(): Point[] {
    const count = currentLevel(this.state).letters.length;
    return orbitPositions(count, this.angle, layout.orbitRadius, layout.planet);
  }

  private showMessage(text: string, color: string): void {
    this.messageTimer?.remove();
    this.messageText.setText(text).setColor(color);
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
