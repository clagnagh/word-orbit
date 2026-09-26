import { describe, expect, it } from 'vitest';
import { semitoneRatio, tapPitch } from '../src/game/audio';

describe('pitch maths', () => {
  it('doubles the frequency every 12 semitones (an octave)', () => {
    expect(semitoneRatio(0)).toBe(1);
    expect(semitoneRatio(12)).toBeCloseTo(2);
    expect(semitoneRatio(-12)).toBeCloseTo(0.5);
    expect(semitoneRatio(7)).toBeCloseTo(1.4983); // a fifth
  });

  it('raises each tapped letter 2 semitones above the one before', () => {
    expect(tapPitch(0)).toBe(1);
    expect(tapPitch(1)).toBeCloseTo(semitoneRatio(2));
    expect(tapPitch(6)).toBeCloseTo(2); // the 7th letter is an octave up
  });
});
