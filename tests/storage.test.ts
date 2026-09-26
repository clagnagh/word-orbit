import { describe, expect, it } from 'vitest';
import { safeStorage } from '../src/storage';

function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('safeStorage', () => {
  it('reads and writes through to working storage', () => {
    const s = safeStorage(memory);
    const backing = memory();
    const t = safeStorage(() => backing);
    t.setItem('muted', '1');
    expect(t.getItem('muted')).toBe('1');
    expect(s.getItem('missing')).toBeNull();
  });

  it('never throws when localStorage itself is unavailable (e.g. blocked)', () => {
    const s = safeStorage(() => {
      throw new Error('SecurityError');
    });
    expect(s.getItem('muted')).toBeNull();
    expect(() => s.setItem('muted', '1')).not.toThrow();
  });

  it('never throws when reading or writing fails (e.g. storage full)', () => {
    const broken = memory();
    broken.getItem = () => {
      throw new Error('boom');
    };
    broken.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const s = safeStorage(() => broken);
    expect(s.getItem('muted')).toBeNull();
    expect(() => s.setItem('muted', '1')).not.toThrow();
  });

  it('does not touch window until it is used', () => {
    expect(() => safeStorage()).not.toThrow();
  });
});
