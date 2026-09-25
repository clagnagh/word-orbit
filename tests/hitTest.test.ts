import { describe, expect, it } from 'vitest';
import { distance, isInRect, orbitPositions, pickTile } from '../src/game/hitTest';

const centre = { x: 360, y: 560 };

describe('orbitPositions', () => {
  it('puts the first tile at the given angle', () => {
    const [first] = orbitPositions(5, 0, 250, centre);
    expect(first?.x).toBeCloseTo(610);
    expect(first?.y).toBeCloseTo(560);
    const [down] = orbitPositions(5, Math.PI / 2, 250, centre);
    expect(down?.x).toBeCloseTo(360);
    expect(down?.y).toBeCloseTo(810);
  });

  it.each([5, 6, 7])('spaces %i tiles evenly on the circle', (count) => {
    const points = orbitPositions(count, 0.3, 250, centre);
    expect(points).toHaveLength(count);
    for (const p of points) expect(distance(p, centre)).toBeCloseTo(250);
    const gap = distance(points[0]!, points[1]!);
    for (let i = 0; i < count; i++) {
      expect(distance(points[i]!, points[(i + 1) % count]!)).toBeCloseTo(gap);
    }
  });
});

describe('pickTile', () => {
  const tiles = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];

  it('picks a tile when the tap lands inside its hit radius', () => {
    expect(pickTile({ x: 105, y: 110 }, tiles, 74)).toBe(0);
    expect(pickTile({ x: 100, y: 174 }, tiles, 74)).toBe(0);
  });

  it('returns null when the tap misses everything', () => {
    expect(pickTile({ x: 100, y: 175 }, tiles, 74)).toBeNull();
    expect(pickTile({ x: 500, y: 500 }, tiles, 74)).toBeNull();
  });

  it('picks the nearest tile when enlarged hit areas overlap', () => {
    expect(pickTile({ x: 140, y: 100 }, tiles, 74)).toBe(0);
    expect(pickTile({ x: 160, y: 100 }, tiles, 74)).toBe(1);
  });
});

describe('isInRect', () => {
  const tray = { x: 360, y: 990, width: 640, height: 100 };

  it('includes the centre and edges, excludes outside', () => {
    expect(isInRect({ x: 360, y: 990 }, tray)).toBe(true);
    expect(isInRect({ x: 40, y: 1040 }, tray)).toBe(true);
    expect(isInRect({ x: 39, y: 990 }, tray)).toBe(false);
    expect(isInRect({ x: 360, y: 1041 }, tray)).toBe(false);
  });
});
