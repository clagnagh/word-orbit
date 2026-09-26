/**
 * True when the player has asked their device for less motion (an accessibility setting).
 * Read live, so changing the setting takes effect without a reload.
 */
export function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
