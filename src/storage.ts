// A localStorage wrapper that never throws. Private browsing, blocked cookies or a full disk
// make localStorage throw; the game should just forget things instead of crashing.

import type { KeyValueStorage } from './core/stats.ts';

export function safeStorage(
  getStorage: () => Storage = () => window.localStorage,
): KeyValueStorage {
  return {
    getItem(key) {
      try {
        return getStorage().getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        getStorage().setItem(key, value);
      } catch {
        // Not saved; the game carries on with the value in memory.
      }
    },
  };
}

export const storage = safeStorage();
