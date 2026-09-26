// Sound effects, generated from numbers by zzfx (no audio files).
// Browsers only allow sound after the player interacts, so the synth is loaded and its audio
// context started on the first tap or key press (see installAudioUnlock).

import type { ZZFX as ZzfxEngine, ZzfxParams } from 'zzfx';
import { tuning } from '../config/tuning.ts';
import { storage } from '../storage.ts';

const MUTED_KEY = 'word-orbit:muted';
const { audio } = tuning;

let engine: typeof ZzfxEngine | null = null;
let loading = false;
/** Sounds asked for while the synth was still loading (the very first tap), played once it's ready. */
let pending: (() => void)[] = [];
let muted: boolean | null = null;

/** Frequency multiplier for a note `semitones` above (or below) a base note. */
export function semitoneRatio(semitones: number): number {
  return 2 ** (semitones / 12);
}

/** Pitch multiplier for the tap sound of the letter at `index` (0-based) in the word. */
export function tapPitch(index: number): number {
  return semitoneRatio(index * audio.tapSemitoneStep);
}

/** Start listening for the first interaction; also re-wakes audio if the browser suspended it. */
export function installAudioUnlock(): void {
  const unlock = () => {
    if (engine) {
      if (engine.audioContext.state !== 'running') void engine.audioContext.resume();
      return;
    }
    if (loading) return;
    loading = true;
    import('zzfx')
      .then(({ ZZFX }) => {
        engine = ZZFX;
        void engine.audioContext.resume();
        for (const start of pending) start();
        pending = [];
      })
      .catch(() => {
        // No audio support: the game carries on silently.
        pending = [];
      });
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

export function isMuted(): boolean {
  muted ??= storage.getItem(MUTED_KEY) === '1';
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  storage.setItem(MUTED_KEY, value ? '1' : '0');
}

function play(recipe: readonly number[], pitch = 1, delayMs = 0): void {
  if (isMuted() || (!engine && !loading)) return;
  const params: ZzfxParams = [...recipe];
  params[2] = (recipe[2] ?? 220) * pitch;
  const start = () => {
    if (!engine || isMuted()) return;
    engine.volume = audio.masterVolume;
    try {
      engine.play(...params);
    } catch {
      // A failed sound should never interrupt the game.
    }
  };
  if (!engine) pending.push(() => window.setTimeout(start, delayMs));
  else if (delayMs > 0) window.setTimeout(start, delayMs);
  else start();
}

function phrase(semitones: readonly number[], gapMs: number): void {
  semitones.forEach((s, i) => play(audio.recipes.note, semitoneRatio(s), i * gapMs));
}

export const sfx = {
  /** Rises in pitch with each letter of the word. */
  tap: (index: number) => play(audio.recipes.tap, tapPitch(index)),
  valid: () => {
    play(audio.recipes.chime);
    play(audio.recipes.chime, audio.chimeSecondRatio, audio.chimeGapMs);
  },
  wrong: () => play(audio.recipes.wrong),
  keyWord: () => phrase(audio.keyWordNotes, audio.keyWordGapMs),
  /** `steps` above ×1.0: the blip climbs as the combo grows. */
  comboUp: (steps: number) =>
    play(
      audio.recipes.comboBlip,
      semitoneRatio(steps * audio.comboSemitoneStep),
      audio.comboDelayMs,
    ),
  levelStart: () => play(audio.recipes.whoosh),
  tick: (high: boolean) => play(high ? audio.recipes.tick : audio.recipes.tock),
  gameOver: () => phrase(audio.gameOverNotes, audio.gameOverGapMs),
  goal: () => phrase(tuning.goal.notes, tuning.goal.gapMs),
  hint: () => play(audio.recipes.comboBlip),
};
