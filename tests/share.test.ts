import { describe, expect, it } from 'vitest';
import type { GameSummary } from '../src/core/game';
import { shareText } from '../src/core/share';

const summary = (levels: [boolean, number][], score: number): GameSummary => ({
  score,
  wordCount: levels.reduce((n, [, w]) => n + w, 0),
  levels: levels.map(([keyWordFound, wordCount]) => ({ keyWordFound, wordCount })),
});

describe('shareText', () => {
  it('matches the format in PLAN.md exactly', () => {
    const text = shareText(
      42,
      summary(
        [
          [true, 4],
          [true, 3],
          [false, 2],
        ],
        1240,
      ),
      3,
    );
    expect(text).toBe('Word Orbit #42 🪐\n🟩🟩🟨\n1,240 pts · 9 words · 🔥3\nwordorbit.example');
  });

  it('shows 🟥 for a level with no words, and "1 word" in the singular', () => {
    const text = shareText(
      7,
      summary(
        [
          [false, 1],
          [false, 0],
          [false, 0],
        ],
        90,
      ),
      1,
    );
    expect(text).toBe('Word Orbit #7 🪐\n🟨🟥🟥\n90 pts · 1 word · 🔥1\nwordorbit.example');
  });

  it('uses a custom URL when given', () => {
    expect(shareText(1, summary([[true, 1]], 10), 1, 'example.com/play')).toMatch(
      /\nexample\.com\/play$/,
    );
  });
});
