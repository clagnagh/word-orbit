import { tuning } from '../config/tuning.ts';
import { reducedMotion } from './motion.ts';

/** A short vibration on phones that support it (Android). Skipped when reduced motion is on. */
export function vibrate(kind: keyof typeof tuning.haptics): void {
  if (reducedMotion() || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate([...tuning.haptics[kind]]);
  } catch {
    // Some browsers refuse vibration in certain contexts; that's fine.
  }
}
