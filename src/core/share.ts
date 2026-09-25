import type { GameSummary } from './game.ts';

export const SHARE_URL = 'wordorbit.example';

/** 🟩 found the key word · 🟨 found some words · 🟥 found nothing. */
function levelSquare(level: GameSummary['levels'][number]): string {
  if (level.keyWordFound) return '🟩';
  return level.wordCount > 0 ? '🟨' : '🟥';
}

/**
 * The spoiler-free result players paste into chats. Built only from counts and flags,
 * so it cannot contain any answer.
 */
export function shareText(
  puzzleNumber: number,
  summary: GameSummary,
  streak: number,
  url: string = SHARE_URL,
): string {
  const score = summary.score.toLocaleString('en-US');
  const words = `${summary.wordCount} ${summary.wordCount === 1 ? 'word' : 'words'}`;
  return [
    `Word Orbit #${puzzleNumber} 🪐`,
    summary.levels.map(levelSquare).join(''),
    `${score} pts · ${words} · 🔥${streak}`,
    url,
  ].join('\n');
}
