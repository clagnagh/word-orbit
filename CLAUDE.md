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
- **Look and feel.** Colours come from `tuning.palette` (0xRRGGBB numbers; convert with `toCss()` from `src/game/color.ts` for text). Text uses `tuning.fonts.family` (Fredoka, bundled in `public/fonts/` and loaded before Phaser starts in `main.ts`).
- **Effects ("juice")** live in `src/game/fx/` and read their numbers from `tuning.fx`. Every effect must respect `reducedMotion()` (`src/game/motion.ts`): no shakes, pops, flying letters, particles or spirals, and no star drift; colour flashes and fading text stay.
- **Dev tuning panel:** in `npm run dev`, press `to open lil-gui sliders for every`tuning.ts`value. It is dev-only and excluded from production builds. Changes aren't saved; copy good values into`tuning.ts`.
- **Sound** goes through `sfx` in `src/game/audio.ts`; recipes (zzfx number lists) and timings live in `tuning.audio`. zzfx is loaded on the first tap or key press (browsers block audio before that), and sounds asked for while it loads are queued. Phaser's own audio is disabled (`audio.noAudio`). Mute is saved via `src/storage.ts`.
- **Saved data** always goes through `src/storage.ts` (never `localStorage` directly), so blocked or full storage can't crash the game.
- **Game time comes from `this.game.loop.time`** (PlayScene's `now()`), never `this.time.now`: the scene clock holds a stale value when a scene starts, which once took the time spent on the Menu off level 1's timer.
- **Daily loop:** `src/game/session.ts` owns today's date, saving/loading today's game (`core/save.ts`), stats and the "seen help" flag. The preview puzzle (before launch) is never saved or counted. Test other days with `?date=2026-10-02` in `npm run dev` (or `#2026-10-02` on builds made with `VITE_DATE_OVERRIDE=1`); production builds strip the override.
- **Portrait design size** is 720×1280 with `Phaser.Scale.FIT`.
- **Keyboard input uses `window` `keydown` listeners**, removed on scene `SHUTDOWN`. Don't use Phaser's keyboard plugin for typing: its queue replayed earlier keys in frames with pointer input, adding duplicate letters.
- **Tap detection** uses the pure helpers in `src/game/hitTest.ts` (nearest tile within an enlarged radius), not per-object Phaser hit areas.
- **Browser testing:** dev builds expose the Phaser game as `window.wordOrbit` (e.g. `wordOrbit.scene.getScene('Play').state`). It is stripped from production builds. Headless Chromium + Playwright is available for driving the game.
- `vite.config.ts` must keep `base: './'` so builds work from a subfolder (itch.io, portals).
- Don't edit `LEARNINGS.md` unless asked.

## Screenshot protocol

When the user sends a screenshot:

1. Describe what you see in 2–3 sentences.
2. List the problems you notice before hearing theirs.
3. Propose specific changes with numbers (e.g. "tile scale 1.0 → 1.15 over 80 ms, ease Back.Out") and wait for their pick.
