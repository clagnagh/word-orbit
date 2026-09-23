export interface Dictionary {
  /** True if the word is in the list. Case-insensitive. */
  isValid(word: string): boolean;
  readonly size: number;
}

export function createDictionary(words: Iterable<string>): Dictionary {
  const set = new Set<string>();
  for (const w of words) set.add(w.toLowerCase());
  return {
    isValid: (word) => set.has(word.toLowerCase()),
    size: set.size,
  };
}

/** How many times each letter appears: "eel" → { e: 2, l: 1 }. */
export function letterCounts(letters: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of letters) {
    const c = ch.toLowerCase();
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return counts;
}

/**
 * True if `word` can be spelled using each of `letters` at most once.
 * Letters can repeat in a puzzle, so two E tiles allow "eel" but one doesn't.
 */
export function canBuildFrom(word: string, letters: Iterable<string>): boolean {
  const available = letterCounts(letters);
  for (const [ch, needed] of letterCounts(word)) {
    if ((available.get(ch) ?? 0) < needed) return false;
  }
  return true;
}
