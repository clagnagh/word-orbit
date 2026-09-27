// Phones held sideways shrink the portrait game to about a third of its size, so instead we ask
// the player to turn the phone upright (the prompt is in index.html) and pause the game meanwhile.

const SIDEWAYS_PHONE = '(orientation: landscape) and (max-height: 500px) and (pointer: coarse)';

const query = window.matchMedia?.(SIDEWAYS_PHONE);

export function isSideways(): boolean {
  return query?.matches ?? false;
}

/** Calls `listener` whenever the phone turns sideways or back. Returns a function to stop. */
export function onSidewaysChange(listener: (sideways: boolean) => void): () => void {
  const handler = (event: MediaQueryListEvent) => listener(event.matches);
  query?.addEventListener('change', handler);
  return () => query?.removeEventListener('change', handler);
}

/** Shows or hides the "turn your phone upright" prompt to match the phone's orientation. */
export function installRotatePrompt(): void {
  const update = (sideways: boolean) => document.body.classList.toggle('sideways', sideways);
  update(isSideways());
  onSidewaysChange(update);
}
