// Pure maths for where tiles are and what a tap hit. No Phaser, so it can be tested.

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Evenly spaced points on a circle, starting at `angle` radians and going clockwise on screen. */
export function orbitPositions(
  count: number,
  angle: number,
  radius: number,
  centre: Point,
): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const theta = angle + (i * 2 * Math.PI) / count;
    return { x: centre.x + radius * Math.cos(theta), y: centre.y + radius * Math.sin(theta) };
  });
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * The index of the tile nearest the tap, if it's within `hitRadius`; otherwise null.
 * Choosing the nearest means overlapping (enlarged) tap areas still pick the tile under the finger.
 */
export function pickTile(
  tap: Point,
  positions: readonly Point[],
  hitRadius: number,
): number | null {
  let best: number | null = null;
  let bestDistance = hitRadius;
  positions.forEach((p, i) => {
    const d = distance(tap, p);
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/** True if the tap is inside a rectangle given by its centre and size. */
export function isInRect(
  tap: Point,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  return Math.abs(tap.x - rect.x) <= rect.width / 2 && Math.abs(tap.y - rect.y) <= rect.height / 2;
}
