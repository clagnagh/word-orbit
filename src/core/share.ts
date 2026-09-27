import type { GameSummary } from './game.ts';

export const SHARE_URL = 'wordorbit.example';

/**
 * 🟩 found the key word · 🟨 found some words · ⬛ found nothing.
 * ⬛ differs from the others in brightness, not just colour, so it reads with colour blindness.
 */
function levelSquare(level: GameSummary['levels'][number]): string {
  if (level.keyWordFound) return '🟩';
  return level.wordCount > 0 ? '🟨' : '⬛';
}

export interface ShareOptions {
  /** This score beat every earlier game. */
  readonly newBest?: boolean;
  readonly url?: string;
}

/**
 * The spoiler-free result players paste into chats. Built only from counts and flags,
 * so it cannot contain any answer. The last two lines invite friends to play.
 */
export function shareText(
  puzzleNumber: number,
  summary: GameSummary,
  streak: number,
  { newBest = false, url = SHARE_URL }: ShareOptions = {},
): string {
  const score = summary.score.toLocaleString('en-US');
  const words = `${summary.wordCount} ${summary.wordCount === 1 ? 'word' : 'words'}`;
  return [
    `Word Orbit #${puzzleNumber} 🪐`,
    summary.levels.map(levelSquare).join(''),
    `${score} pts · ${words} · 🔥${streak}`,
    `${newBest ? '⭐ New best! ' : ''}Can you beat me?`,
    url,
  ].join('\n');
}
