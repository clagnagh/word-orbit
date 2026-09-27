// Object pooling: reuse finished effect objects instead of creating new ones every time.
// Creating a Text object draws its letters onto a new canvas, which is what caused the stutter
// on word submits; a pooled Text only redraws when its text or style changes.

import Phaser from 'phaser';

type Poolable = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Visible &
  Phaser.GameObjects.Components.Alpha;

const pools = new WeakMap<Phaser.Scene, Map<string, Poolable[]>>();

function poolFor(scene: Phaser.Scene, key: string): Poolable[] {
  let byKey = pools.get(scene);
  if (!byKey) {
    byKey = new Map();
    pools.set(scene, byKey);
    // A scene destroys its objects when it shuts down, so its pools must be emptied too.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => pools.delete(scene));
  }
  let pool = byKey.get(key);
  if (!pool) {
    pool = [];
    byKey.set(key, pool);
  }
  return pool;
}

/** A free object from the pool, or a new one from `create`. */
export function take<T extends Poolable>(scene: Phaser.Scene, key: string, create: () => T): T {
  const pool = poolFor(scene, key);
  const free = pool.find((o) => !o.active) as T | undefined;
  const obj = free ?? create();
  if (!free) pool.push(obj);
  obj.setActive(true).setVisible(true).setAlpha(1);
  return obj;
}

/** Hands an object back for reuse. */
export function release(obj: Poolable): void {
  obj.setActive(false).setVisible(false);
}
