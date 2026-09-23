import { describe, expect, it } from 'vitest';
import { createRng, hashString } from '../src/core/rng';

const take = (seed: number, n: number) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.next());
};

describe('hashString', () => {
  it('is deterministic and returns a 32-bit unsigned integer', () => {
    expect(hashString('word-orbit')).toBe(hashString('word-orbit'));
    const h = hashString('word-orbit');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('gives different hashes for similar strings', () => {
    expect(hashString('puzzle-1')).not.toBe(hashString('puzzle-2'));
    expect(hashString('')).not.toBe(hashString(' '));
  });

  it('matches known FNV-1a values', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
  });
});

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(42, 20)).toEqual(take(42, 20));
  });

  it('produces different sequences for different seeds', () => {
    expect(take(1, 20)).not.toEqual(take(2, 20));
  });

  it('keeps next() within [0, 1)', () => {
    for (const x of take(7, 10_000)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('spreads values roughly evenly (each of 10 buckets within ±5%)', () => {
    const rng = createRng(123);
    const buckets = new Array<number>(10).fill(0);
    const rolls = 100_000;
    for (let i = 0; i < rolls; i++) {
      const b = rng.nextInt(0, 9);
      buckets[b] = (buckets[b] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(Math.abs(count - rolls / 10)).toBeLessThan((rolls / 10) * 0.05);
    }
  });
});

describe('nextInt', () => {
  it('stays within bounds, inclusive, and hits both ends', () => {
    const rng = createRng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const n = rng.nextInt(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('rejects bad ranges', () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(5, 4)).toThrow(RangeError);
    expect(() => rng.nextInt(0.5, 4)).toThrow(RangeError);
  });
});

describe('pick', () => {
  it('returns an element of the array', () => {
    const rng = createRng(5);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items));
  });

  it('throws on an empty array', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input unchanged', () => {
    const input = ['p', 'l', 'a', 'n', 'e', 't'];
    const copy = [...input];
    const out = createRng(11).shuffle(input);
    expect(input).toEqual(copy);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('is deterministic for the same seed', () => {
    const input = Array.from({ length: 10 }, (_, i) => i);
    expect(createRng(3).shuffle(input)).toEqual(createRng(3).shuffle(input));
  });

  it('keeps duplicate items', () => {
    const out = createRng(4).shuffle(['e', 'e', 'l']);
    expect(out.filter((x) => x === 'e')).toHaveLength(2);
  });
});
