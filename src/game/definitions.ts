// Definitions are only needed on the results screen, so they're loaded then, in a separate file,
// instead of making every player download them before the menu appears.

import type { Definitions } from '../core/definitions.ts';

let loading: Promise<Definitions | null> | null = null;

/** Loads the definitions once. Resolves to null if they couldn't be loaded (e.g. offline). */
export function loadDefinitions(): Promise<Definitions | null> {
  loading ??= import('../data/definitions.json')
    .then((module) => module.default as unknown as Definitions)
    .catch(() => {
      loading = null; // let a later results screen try again
      return null;
    });
  return loading;
}
