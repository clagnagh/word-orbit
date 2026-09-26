// The game as a state machine: reduce(state, action) → { state, events }.
// Scenes send actions and draw the returned state; events tell them what just happened
// (e.g. play a sound, burst particles). Time always arrives as `now`, never read from a clock.

import { isFullWord, type Level, type Puzzle } from './puzzle.ts';
import { GOAL, HINT, LEVELS, MIN_WORD_LENGTH, SCORING } from './rules.ts';
import { applyCombo, keyWordBonus, nextComboTenths, wordScore } from './scoring.ts';

export type Phase = 'ready' | 'playing' | 'levelEnded' | 'over';
export type RejectReason = 'tooShort' | 'notAWord' | 'alreadyFound';

export interface LevelProgress {
  readonly foundWords: readonly string[];
  readonly keyWordFound: boolean;
  readonly score: number;
  readonly goalDone: boolean;
  readonly hintUsed: boolean;
}

export interface GameState {
  readonly puzzle: Puzzle;
  readonly phase: Phase;
  /** 0-based index into puzzle.levels. */
  readonly levelIndex: number;
  /** One entry per level. */
  readonly progress: readonly LevelProgress[];
  /** Tile ids (indexes into the level's letters) in the order they were tapped. */
  readonly tray: readonly number[];
  readonly remainingMs: number;
  readonly lastTickAt: number | null;
  readonly comboTenths: number;
  readonly lastAcceptedAt: number | null;
}

export type Action =
  | { type: 'start'; now: number }
  | { type: 'tapLetter'; tileId: number }
  | { type: 'typeLetter'; letter: string }
  | { type: 'removeLast' }
  | { type: 'clear' }
  | { type: 'submit'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'nextLevel'; now: number }
  | { type: 'hint' }
  /** Continue a restored game: the clock restarts from `now`; time while closed doesn't count. */
  | { type: 'resume'; now: number };

export type GameEvent =
  | { type: 'levelStarted'; level: number }
  | { type: 'wordAccepted'; word: string; points: number; comboTenths: number }
  | { type: 'wordRejected'; word: string; reason: RejectReason }
  | { type: 'keyWordFound'; word: string; bonus: number }
  | { type: 'levelEnded'; level: number; reason: 'keyWord' | 'timeUp' }
  | { type: 'gameOver'; score: number }
  | { type: 'goalCompleted'; bonus: number }
  | { type: 'hintShown'; tileId: number; cost: number }
  | { type: 'hintUnavailable' };

export interface Step {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

const EMPTY_PROGRESS: LevelProgress = {
  foundWords: [],
  keyWordFound: false,
  score: 0,
  goalDone: false,
  hintUsed: false,
};

export interface LevelGoal {
  /** Find this many words… */
  readonly count: number;
  /** …of exactly this many letters. */
  readonly length: number;
}

/**
 * The level's mini-goal: 2 words of (letters − 1) letters. If the level doesn't have 2 of those,
 * the next shorter length that does, so the goal is always possible.
 */
export function levelGoal(level: Level): LevelGoal {
  const target = level.letters.length - GOAL.lettersBelowLevel;
  for (let length = target; length >= MIN_WORD_LENGTH; length--) {
    const available = level.validWords.filter((w) => w.length === length).length;
    if (available >= GOAL.wordCount) return { count: GOAL.wordCount, length };
  }
  return { count: 1, length: MIN_WORD_LENGTH };
}

/** How many of the goal's words have been found on the current level. */
export function goalProgress(state: GameState): number {
  const goal = levelGoal(currentLevel(state));
  const found = state.progress[state.levelIndex]?.foundWords ?? [];
  return Math.min(goal.count, found.filter((w) => w.length === goal.length).length);
}

export function newGame(puzzle: Puzzle): GameState {
  return {
    puzzle,
    phase: 'ready',
    levelIndex: 0,
    progress: puzzle.levels.map(() => EMPTY_PROGRESS),
    tray: [],
    remainingMs: timeLimit(0),
    lastTickAt: null,
    comboTenths: SCORING.comboStartTenths,
    lastAcceptedAt: null,
  };
}

export function currentLevel(state: GameState): Level {
  return state.puzzle.levels[state.levelIndex] as Level;
}

export function trayWord(state: GameState): string {
  const { letters } = currentLevel(state);
  return state.tray.map((id) => letters[id]).join('');
}

export function totalScore(state: GameState): number {
  return state.progress.reduce((sum, p) => sum + p.score, 0);
}

export function reduce(state: GameState, action: Action): Step {
  switch (action.type) {
    case 'start':
      if (state.phase !== 'ready') return unchanged(state);
      return beginLevel(state, 0, action.now);

    case 'nextLevel':
      if (state.phase !== 'levelEnded') return unchanged(state);
      return beginLevel(state, state.levelIndex + 1, action.now);

    case 'tapLetter':
      return addTile(state, action.tileId);

    case 'typeLetter': {
      const letter = action.letter.toLowerCase();
      const tileId = currentLevel(state).letters.findIndex(
        (l, id) => l === letter && !state.tray.includes(id),
      );
      return addTile(state, tileId);
    }

    case 'removeLast':
      if (state.phase !== 'playing' || state.tray.length === 0) return unchanged(state);
      return { state: { ...state, tray: state.tray.slice(0, -1) }, events: [] };

    case 'clear':
      if (state.phase !== 'playing' || state.tray.length === 0) return unchanged(state);
      return { state: { ...state, tray: [] }, events: [] };

    case 'tick':
      return advanceTime(state, action.now);

    case 'hint':
      return useHint(state);

    case 'resume':
      if (state.phase !== 'playing' || state.lastTickAt !== null) return unchanged(state);
      return { state: { ...state, lastTickAt: action.now }, events: [] };

    case 'submit': {
      const timed = advanceTime(state, action.now);
      if (timed.state.phase !== 'playing' || timed.state.tray.length === 0) return timed;
      const judged = judgeWord(timed.state, action.now);
      return { state: judged.state, events: [...timed.events, ...judged.events] };
    }
  }
}

function useHint(state: GameState): Step {
  if (state.phase !== 'playing' || state.tray.length > 0) return unchanged(state);
  const progress = state.progress[state.levelIndex] ?? EMPTY_PROGRESS;
  if (progress.hintUsed) return { state, events: [{ type: 'hintUnavailable' }] };
  const level = currentLevel(state);
  const tileId = level.letters.indexOf(level.keyWord[0] ?? '');
  // The hint costs points, but never takes the total score below 0.
  const cost = Math.min(HINT.cost, totalScore(state));
  const updated: LevelProgress = { ...progress, hintUsed: true, score: progress.score - cost };
  return {
    state: {
      ...state,
      progress: state.progress.map((p, i) => (i === state.levelIndex ? updated : p)),
    },
    events: [{ type: 'hintShown', tileId, cost }],
  };
}

function unchanged(state: GameState): Step {
  return { state, events: [] };
}

function timeLimit(levelIndex: number): number {
  return LEVELS[levelIndex]?.timeLimitMs ?? 0;
}

function beginLevel(state: GameState, levelIndex: number, now: number): Step {
  return {
    state: {
      ...state,
      phase: 'playing',
      levelIndex,
      tray: [],
      remainingMs: timeLimit(levelIndex),
      lastTickAt: now,
      comboTenths: SCORING.comboStartTenths,
      lastAcceptedAt: null,
    },
    events: [{ type: 'levelStarted', level: levelIndex + 1 }],
  };
}

function addTile(state: GameState, tileId: number): Step {
  const valid =
    Number.isInteger(tileId) && tileId >= 0 && tileId < currentLevel(state).letters.length;
  if (state.phase !== 'playing' || !valid || state.tray.includes(tileId)) return unchanged(state);
  return { state: { ...state, tray: [...state.tray, tileId] }, events: [] };
}

function advanceTime(state: GameState, now: number): Step {
  if (state.phase !== 'playing' || state.lastTickAt === null) return unchanged(state);
  // A clock that jumps backwards counts as no time passing; it never adds time.
  const elapsed = Math.max(0, now - state.lastTickAt);
  const remainingMs = Math.max(0, state.remainingMs - elapsed);
  const next = { ...state, remainingMs, lastTickAt: now };
  return remainingMs === 0 ? endLevel(next, 'timeUp', []) : { state: next, events: [] };
}

function endLevel(
  state: GameState,
  reason: 'keyWord' | 'timeUp',
  events: readonly GameEvent[],
): Step {
  const isLast = state.levelIndex >= state.puzzle.levels.length - 1;
  const ended: GameState = { ...state, phase: isLast ? 'over' : 'levelEnded', tray: [] };
  const endEvents: GameEvent[] = [
    ...events,
    { type: 'levelEnded', level: state.levelIndex + 1, reason },
  ];
  if (isLast) endEvents.push({ type: 'gameOver', score: totalScore(ended) });
  return { state: ended, events: endEvents };
}

function judgeWord(state: GameState, now: number): Step {
  const word = trayWord(state);
  const level = currentLevel(state);
  const progress = state.progress[state.levelIndex] ?? EMPTY_PROGRESS;

  const reason: RejectReason | null =
    word.length < MIN_WORD_LENGTH
      ? 'tooShort'
      : progress.foundWords.includes(word)
        ? 'alreadyFound'
        : !level.validWords.includes(word)
          ? 'notAWord'
          : null;

  if (reason) {
    return {
      state: {
        ...state,
        tray: [],
        comboTenths: SCORING.comboStartTenths,
        lastAcceptedAt: null,
      },
      events: [{ type: 'wordRejected', word, reason }],
    };
  }

  const comboTenths = nextComboTenths(state.comboTenths, state.lastAcceptedAt, now);
  const points = applyCombo(wordScore(word.length), comboTenths);
  const isKey = isFullWord(level, word);
  const bonus = isKey ? keyWordBonus(state.levelIndex + 1, state.remainingMs) : 0;

  const foundWords = [...progress.foundWords, word];
  const goal = levelGoal(level);
  const goalNowDone =
    !progress.goalDone && foundWords.filter((w) => w.length === goal.length).length >= goal.count;
  const goalBonus = goalNowDone ? GOAL.bonusPerLevel * (state.levelIndex + 1) : 0;
  const updated: LevelProgress = {
    ...progress,
    foundWords,
    keyWordFound: progress.keyWordFound || isKey,
    goalDone: progress.goalDone || goalNowDone,
    score: progress.score + points + bonus + goalBonus,
  };
  const next: GameState = {
    ...state,
    tray: [],
    comboTenths,
    lastAcceptedAt: now,
    progress: state.progress.map((p, i) => (i === state.levelIndex ? updated : p)),
  };
  const events: GameEvent[] = [{ type: 'wordAccepted', word, points, comboTenths }];
  if (goalNowDone) events.push({ type: 'goalCompleted', bonus: goalBonus });
  if (!isKey) return { state: next, events };

  events.push({ type: 'keyWordFound', word, bonus });
  return endLevel(next, 'keyWord', events);
}

export interface GameSummary {
  readonly score: number;
  readonly wordCount: number;
  readonly levels: readonly { keyWordFound: boolean; wordCount: number }[];
}

export function summarize(state: GameState): GameSummary {
  return {
    score: totalScore(state),
    wordCount: state.progress.reduce((n, p) => n + p.foundWords.length, 0),
    levels: state.progress.map((p) => ({
      keyWordFound: p.keyWordFound,
      wordCount: p.foundWords.length,
    })),
  };
}
