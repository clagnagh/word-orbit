// Dev builds only (loaded from main.ts behind import.meta.env.DEV): a panel of sliders for
// every number in tuning.ts, so feel can be adjusted while playing. Press ` to show or hide.
// Changes are not saved: copy the values you like into tuning.ts.

import GUI from 'lil-gui';
import type Phaser from 'phaser';
import { tuning } from '../config/tuning.ts';

const TOGGLE_KEY = '`';
const OPEN_FOLDERS = new Set(['fx', 'orbit']);

type Tunable = Record<string, unknown>;

export function installDebugPanel(game: Phaser.Game): void {
  const gui = new GUI({ title: 'Tuning (` to hide)' });
  gui.add(
    {
      'Restart scene': () => {
        const active = game.scene.getScenes(true)[0];
        active?.scene.restart();
      },
    },
    'Restart scene',
  );

  for (const [key, value] of Object.entries(tuning as unknown as Tunable)) {
    if (!isObject(value)) continue;
    const folder = gui.addFolder(key);
    addEntries(folder, value, key === 'palette');
    if (!OPEN_FOLDERS.has(key)) folder.close();
  }
  gui.hide();

  let visible = false;
  window.addEventListener('keydown', (event) => {
    if (event.key !== TOGGLE_KEY) return;
    visible = !visible;
    gui.show(visible);
  });
}

function addEntries(folder: GUI, obj: Tunable, colors: boolean): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'number') {
      if (colors) folder.addColor(obj, key);
      else addSlider(folder, obj, key, value);
    } else if (isObject(value) || Array.isArray(value)) {
      const sub = folder.addFolder(key);
      addEntries(sub, value as Tunable, colors);
      sub.close();
    }
  }
}

/** A slider from 0 to about three times the starting value, with a sensible step. */
function addSlider(folder: GUI, obj: Tunable, key: string, value: number): void {
  const max = value === 0 ? 1 : Math.abs(value) * 3;
  const step = Number.isInteger(value) && value >= 10 ? 1 : max / 300;
  folder.add(obj, key, Math.min(0, value * 3), max, step);
}

function isObject(value: unknown): value is Tunable {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A small frames-per-second readout in the top-left corner (dev builds only). */
export function installFpsMeter(game: Phaser.Game): void {
  const meter = document.createElement('div');
  Object.assign(meter.style, {
    position: 'fixed',
    top: '4px',
    left: '4px',
    padding: '2px 6px',
    font: '12px ui-monospace, Menlo, Consolas, monospace',
    color: '#7be08a',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '20',
  });
  document.body.appendChild(meter);
  window.setInterval(() => {
    const fps = Math.round(game.loop.actualFps);
    meter.textContent = `${fps} fps`;
    meter.style.color = fps >= 55 ? '#7be08a' : fps >= 30 ? '#ffc970' : '#ff7a7a';
  }, 500);
}
