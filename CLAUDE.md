# Word Orbit — notes for Claude

A daily word puzzle game: letter tiles orbit a planet; tap letters to spell words, tap the planet to submit.

**Follow the Working Agreement in `PLAN.md` (section 1) every session.** Work only on the milestone named, plan before code and wait for "go", and finish each milestone with ticked boxes, a commit, a "What you just learned" summary, and browser test steps.

## Stack

- TypeScript 5.9 (strict), Phaser 3.90, Vite 8, Vitest 5, ESLint 10 + typescript-eslint, Prettier 3.
- Don't add any package that isn't listed in `PLAN.md` section 3 without asking first.

## Commands

| Command             | What it does                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Dev server at http://localhost:5173                                                                                                                     |
| `npm test`          | Vitest (core logic tests in `tests/`)                                                                                                                   |
| `npm run typecheck` | `tsc --noEmit`                                                                                                                                          |
| `npm run lint`      | ESLint                                                                                                                                                  |
| `npm run format`    | Prettier (rewrites files)                                                                                                                               |
| `npm run build`     | Typecheck + production build into `dist/`                                                                                                               |
| `npm run wordlists` | Rebuild `src/data/*.json` from the sources in `CREDITS.md` (Node 22.18+). Edit `scripts/blocklist.txt` to remove words, then rerun and commit the JSON. |

| `npm run puzzle -- 2026-10-01` | Print that date's puzzle with all answers (no date = today). |

Run `npm test` and `npm run typecheck` after every task.

## Rules

- **Pure core.** `src/core/` holds all game rules and must not import Phaser, `src/game`, `src/platform` or storage, or use `window`, `document`, `localStorage`, `navigator`, `Date.now()` or `Math.random()`. Time comes in as `now`; randomness comes from the seeded RNG; storage is injected. ESLint enforces this, so never disable the rule to make lint pass.
- **Scenes send actions, draw state.** Scenes call `reduce(state, action)` in `core/game.ts` and render the result; no rule logic lives in `src/game/`.
- **Imports inside `src/core/` end in `.ts`** (`./rng.ts`) so Node scripts in `scripts/` can run core code directly. Core uses only erasable TypeScript (no `enum` or `namespace`).
- **Rules vs feel.** Game-rule numbers (timers, points, combo) live in `src/core/rules.ts`.
- **Tuning file.** Every feel number (speeds, durations, sizes, colours, shake strength) lives in `src/config/tuning.ts`. Scenes never hard-code them. Try to meet feel requests by changing tuning values first, and say which values changed and why.
- **Portrait design size** is 720×1280 with `Phaser.Scale.FIT`.
- `vite.config.ts` must keep `base: './'` so builds work from a subfolder (itch.io, portals).
- Don't edit `LEARNINGS.md` unless asked.

## Screenshot protocol

When the user sends a screenshot:

1. Describe what you see in 2–3 sentences.
2. List the problems you notice before hearing theirs.
3. Propose specific changes with numbers (e.g. "tile scale 1.0 → 1.15 over 80 ms, ease Back.Out") and wait for their pick.
