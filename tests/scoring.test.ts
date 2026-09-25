import { describe, expect, it } from 'vitest';
import {
  applyCombo,
  keyWordBonus,
  nextComboTenths,
  secondsLeft,
  wordScore,
} from '../src/core/scoring';

describe('wordScore', () => {
  it('is 10 × length²', () => {
    expect(wordScore(3)).toBe(90);
    expect(wordScore(5)).toBe(250);
    expect(wordScore(7)).toBe(490);
  });
});

describe('secondsLeft', () => {
  it('rounds up like an on-screen timer, and never goes negative', () => {
    expect(secondsLeft(90_000)).toBe(90);
    expect(secondsLeft(44_001)).toBe(45);
    expect(secondsLeft(400)).toBe(1);
    expect(secondsLeft(0)).toBe(0);
    expect(secondsLeft(-500)).toBe(0);
  });
});

describe('keyWordBonus', () => {
  it('is 500 × level + 5 × seconds remaining', () => {
    expect(keyWordBonus(1, 45_000)).toBe(725);
    expect(keyWordBonus(3, 0)).toBe(1500);
    expect(keyWordBonus(2, 89_500)).toBe(1000 + 450);
  });
});

describe('combo', () => {
  it('starts at ×1.0 for the first word', () => {
    expect(nextComboTenths(10, null, 1_000)).toBe(10);
  });

  it('grows by ×0.1 per word inside the 5 s window, including exactly 5 s', () => {
    expect(nextComboTenths(10, 0, 4_999)).toBe(11);
    expect(nextComboTenths(11, 0, 5_000)).toBe(12);
  });

  it('restarts after more than 5 s', () => {
    expect(nextComboTenths(15, 0, 5_001)).toBe(10);
  });

  it('caps at ×2.0 after 10 quick words, with no rounding drift', () => {
    let tenths = nextComboTenths(10, null, 0);
    const seen = [tenths];
    for (let i = 1; i <= 15; i++) {
      tenths = nextComboTenths(tenths, (i - 1) * 1_000, i * 1_000);
      seen.push(tenths);
    }
    expect(seen.slice(0, 12)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 20]);
    expect(tenths).toBe(20);
  });

  it('applies to points as whole numbers', () => {
    expect(applyCombo(90, 10)).toBe(90);
    expect(applyCombo(90, 13)).toBe(117);
    expect(applyCombo(250, 20)).toBe(500);
  });
});
