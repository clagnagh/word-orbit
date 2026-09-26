# PLAN.md — Word Orbit: A Daily Word Puzzle Game

> **Note to Claude:** This is the master build plan for this project. I'm learning AI-assisted coding, and this project focuses on three skills: iterating on game _feel_, using screenshots as feedback, and keeping game logic separate from rendering. Follow the Working Agreement in every session.

---

## 1. Working Agreement (read this first, every session)

1. **One milestone at a time.** Only work on the milestone I name.
2. **Plan before code.** Start each milestone by listing the files you'll create or change and your approach, then wait for my "go".
3. **Small steps.** Build one task at a time. Run `npm test` and `npm run typecheck` after each one.
4. **No surprise dependencies.** Ask before adding any package not listed in section 3.
5. **Keep the core pure.** Nothing in `src/core/` may import Phaser or touch the DOM, `window`, or `localStorage`. A lint rule enforces this.
6. **Put every tunable number in `src/config/tuning.ts`.** That includes speeds, durations, sizes, colours, and shake strength. Never hard-code them in scenes.
7. **When I send a screenshot:**
   - First, describe what you see in 2–3 sentences, so I know you're looking at the right thing.
   - Then list the problems you notice, before I tell you mine.
   - Then propose specific changes, with numbers (e.g. "tile scale 1.0 → 1.15 over 80 ms, ease Back.Out"), and wait for my pick.
8. **Feel changes happen in the tuning file first.** If a feel request can be met just by changing values in `tuning.ts`, do that and say which values changed and why.
9. **Finish every milestone the same way:**
   - Tick the checkboxes in this file.
   - Make a git commit with a clear message.
   - Give me a **"What you just learned"** summary: 3 concepts, in plain English, each with the file where it's used.
   - Tell me exactly what to try in the browser to check it works.
10. **Flag problems with this plan.** If something here is unclear or a bad idea, say so and suggest a change.

---

## 2. Game Design

### Core idea

A planet sits in the centre of the screen, and letter tiles orbit around it. You tap the letters in order to spell a word, then tap the planet to submit it. Each letter tile can be used only once per word.

### A daily puzzle

Everyone in the world gets the same puzzle on the same date. The puzzle has **3 orbits (levels)**:

| Level | Letters | Orbit speed | Time limit |
| ----- | ------- | ----------- | ---------- |
| 1     | 5       | base        | 90 s       |
| 2     | 6       | base × 1.2  | 90 s       |
| 3     | 7       | base × 1.44 | 90 s       |

Each level hides a **key word** that uses _all_ its letters (for example, the letters in level 1 might spell PLANT). Finding the key word finishes the level early, with a time bonus. Other valid words of 3 or more letters score **bonus points**. When time runs out, you move to the next level anyway.

### Controls

- **Tap a letter** to add it to the tray (the word being built).
- **Tap the planet** to submit.
- **Tap the tray** to remove the last letter. Long-press the tray to clear it.
- **Desktop keyboard:** type letters, Enter to submit, Backspace to delete.

### Scoring (implemented in `core/scoring.ts`)

- A valid word scores `10 × length²`. So a 3-letter word is 90 points, and a 5-letter word is 250.
- Finding the key word scores an extra `500 × level`, plus `5 × seconds remaining`.
- **Combo:** each valid word within 5 s of the previous one adds ×0.1 to the multiplier, up to a maximum of ×2.0. A wrong word resets the combo.
- Words already found, and words shorter than 3 letters, are rejected. This doesn't cost points, but it does reset the combo.

### Share result

The share text looks like this:

```
Word Orbit #42 🪐
🟩🟩🟨
1,240 pts · 9 words · 🔥3
wordorbit.example
```

- 🟩 = found the key word
- 🟨 = found at least one word, but not the key word
- 🟥 = found nothing
- 🔥 = current daily streak

The share must **never reveal the answers**.

### Modes

- **Daily (free):** one play per day, with stats and a streak.
- **Endless (premium):** random puzzles with no limit, and a harder speed curve. Hidden behind a feature flag until Milestone 9.

### Visual direction

An original, calm, space-themed style: a dark gradient background, soft glowing planet, rounded letter tiles, and gentle motion. It should be satisfying, not frantic. Everything must be our own design, with no copied assets or look from other games.

---

## 3. Tech Stack & Conventions

| Area                 | Choice                                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language             | TypeScript (strict mode) — pinned to 5.9 because typescript-eslint doesn't support 7.x yet                                                                                                                                                                 |
| Game engine          | Phaser 3 (3.90) — chosen over Phaser 4 because most tutorials and examples target 3                                                                                                                                                                        |
| Bundler / dev server | Vite (vanilla-ts template)                                                                                                                                                                                                                                 |
| Tests                | Vitest (core logic only)                                                                                                                                                                                                                                   |
| Lint/format          | ESLint + Prettier, with `no-restricted-imports` blocking `phaser` inside `src/core/**` (plus `no-restricted-globals` for browser globals, and bans on `Date.now` / `Math.random`)                                                                          |
| Sound                | zzfx (tiny sound synthesizer, no audio files needed). _Ask me before installing._ **Approved in Milestone 6.**                                                                                                                                             |
| Debug tweaking       | lil-gui, loaded only in dev mode. _Ask me before installing._ **Approved in Milestone 5 (dev dependency).**                                                                                                                                                |
| Word list            | An open-licensed English word list, such as ENABLE. **Before using any list, stop and tell me: its licence, where to download it, and how you'll filter it.** Keep only lowercase a–z words of 3–7 letters. **Approved: ENABLE (public domain).**          |
| Key-word list        | A separate, curated list of common, family-friendly 5/6/7-letter words. Offensive words are filtered out of _both_ lists. **Approved: SCOWL sizes 10–20 ∩ ENABLE, minus inflections; LDNOOBW + `scripts/blocklist.txt` filter. Licences in `CREDITS.md`.** |
| Node types           | `@types/node` (dev only) so `scripts/` can be typechecked. Approved in Milestone 1.                                                                                                                                                                        |

### Project layout

```
word-orbit/
├── index.html
├── package.json
├── vite.config.ts           # base: './' (required for itch.io and portals)
├── CLAUDE.md
├── PLAN.md
├── LEARNINGS.md             # my notes (Claude: don't edit unless asked)
├── scripts/
│   └── build-wordlists.ts   # filters raw lists → src/data/*.json
├── src/
│   ├── main.ts              # Phaser game config + scene list
│   ├── config/
│   │   └── tuning.ts        # ALL feel numbers live here
│   ├── core/                # PURE logic: no Phaser, no DOM
│   │   ├── rng.ts           # seeded PRNG (e.g. mulberry32) + string hash
│   │   ├── daily.ts         # date → puzzle number → seed
│   │   ├── dictionary.ts    # word set, isValid(), canBuildFrom(letters)
│   │   ├── puzzle.ts        # generatePuzzle(seed) → 3 levels
│   │   ├── game.ts          # state machine / reducer: (state, action) → state
│   │   ├── scoring.ts
│   │   ├── share.ts         # result → share text
│   │   └── stats.ts         # pure stats update; storage is injected
│   ├── game/                # Phaser rendering + input
│   │   ├── scenes/          # Boot, Menu, Play, Results
│   │   ├── objects/         # Planet, LetterTile, Tray, TimerRing
│   │   ├── fx/              # juice helpers: pop, shake, burst, float-text
│   │   └── audio.ts         # sound effects (zzfx wrappers)
│   ├── platform/            # web / itch / portal adapters (Milestone 9)
│   ├── storage.ts           # safe localStorage wrapper (try/catch)
│   └── data/                # generated word lists (JSON)
└── tests/                   # Vitest tests for src/core
```

### Architecture rule

Scenes only **send actions** to `core/game.ts` and **draw the returned state**. For example, the Play scene calls `state = reduce(state, { type: 'tapLetter', tileId })`, then updates the visuals to match. All the rules live in the core, so they can all be tested without a browser.

---

## 4. Core Rules & Edge Cases (must be covered by tests)

- **Same date, same puzzle.** The same date always produces the same puzzle, on any device. Test this with fixed dates.
- **Local date decides the puzzle.** The puzzle number counts days since a launch date (`LAUNCH_DATE` in `daily.ts`) using the player's _local_ calendar date.
- **Puzzle quality.** Every generated level must have a key word from the curated list, and at least 8 valid bonus words (the generator re-rolls deterministically until this is true). Letters are shuffled so the key word isn't displayed in order.
- **Letter use.** A tile can't be tapped twice in the same word. Letters may repeat in a puzzle (e.g. two E tiles).
- **Duplicates.** A word already found is rejected with a "found" reason, not a "wrong" reason.
- **Time.** The timer reaching 0 ends the level. Finding the key word ends it immediately. Time is passed into the reducer as `now` (a `tick` action), never read from a clock inside the core.
- **One daily play.** Only one play per day. Reloading mid-game resumes the saved state; it doesn't restart.
- **Stats.** The streak increases if you played yesterday and resets if you missed a day. Stats survive reloads, and failures of `localStorage` (e.g. private mode) never crash the game.

---

## 5. Milestones

### Milestone 0 — Project setup

- [x] Scaffold with Vite (vanilla-ts), add Phaser, and render a "Hello Orbit" text scene.
- [x] Add Vitest with one passing test, `typecheck`/`lint`/`test` npm scripts, and Prettier.
- [x] Add the ESLint rule that blocks Phaser imports in `src/core/**`. Prove it works by showing me the error on a deliberate bad import, then remove the import.
- [x] Create empty `src/config/tuning.ts`, the folder structure, and `.gitignore`.
- [x] Create `CLAUDE.md` covering: stack, commands, the pure-core rule, the tuning-file rule, the screenshot protocol, and "follow PLAN.md Working Agreement".
- [x] Create `LEARNINGS.md` with headings: _Prompts that worked / Prompts that didn't / Vague vs specific experiment / Concepts learned_.

**Done when:** `npm run dev` shows the scene, and all npm scripts pass.
**Explain to me:** what Vite does, what a Phaser scene is, and why the lint rule matters.

### Milestone 1 — Randomness, dates & dictionary (core)

- [x] `rng.ts`: a seeded PRNG plus a string hash, with helpers `nextInt`, `pick`, and `shuffle`.
- [x] `daily.ts`: `puzzleNumberFor(date)`, `seedFor(puzzleNumber)`, and `msUntilNextPuzzle(now)`.
- [x] `scripts/build-wordlists.ts` produces `src/data/words.json` and `src/data/keywords.json` (after I approve the word list source).
- [x] `dictionary.ts`: `isValid(word)` and `canBuildFrom(word, letters)`, which respects letter counts.
- [x] Tests: determinism, uniform-looking distribution (a rough check), date edge cases (midnight, leap day, daylight saving changes), and repeated letters.

**Done when:** tests pass, and the word list JSON is under 1 MB.
**Explain to me:** what "seeded randomness" means and why daily puzzles need it, plus multisets (counting letters).

### Milestone 2 — Puzzle generation, game state & scoring (core)

- [x] `puzzle.ts`: `generatePuzzle(seed)` returns 3 levels. Each has its letters, key word, and list of all valid words.
- [x] `game.ts`: a reducer with actions `start`, `tapLetter`, `removeLast`, `clear`, `submit`, `tick`, and `nextLevel`, plus events for the renderer: `wordAccepted`, `wordRejected(reason)`, `keyWordFound`, `levelEnded`, and `gameOver`.
- [x] `scoring.ts` and `share.ts`, as described in section 2.
- [x] `stats.ts`: pure functions, with storage passed in as a parameter.
- [x] A dev script, `npm run puzzle -- 2026-10-01`, that prints that date's puzzle in the terminal (to help me debug without the browser).
- [x] Tests for every rule in section 4, plus scoring and combo maths, and share text never containing the answer words.

**Done when:** I can "play" a whole game in a Vitest test, without any graphics.
**Explain to me:** reducers and state machines, why the renderer receives _events_, and what dependency injection means (storage and time).

_Decisions made during Milestone 2:_

- Daily key words follow a fixed shuffled order per length, so none repeats for 688+ days. `generatePuzzle(seed)` (random picks) is kept for Endless mode.
- Any valid word using all the letters (e.g. an anagram like SHORE for HORSE) counts as the key word.
- Game-rule numbers (timers, points, combo) live in `src/core/rules.ts`; feel numbers stay in `tuning.ts`.
- `reduce` returns `{ state, events }`. Extra action `typeLetter` (keyboard picks the tile in the core) and extra event `levelStarted`.
- Word lists are passed into `generateDailyPuzzle(n, lists)`, not imported by the core.

### Milestone 3 — Grey-box gameplay (rendering, no polish yet)

Make it work before making it pretty. Use plain circles and rectangles only.

- [x] Play scene: a planet circle in the centre, letter tiles orbiting at a radius set in `tuning.ts`, evenly spaced, rotating at the level's speed.
- [x] Tap input on tiles (with a generous hit area), the planet (submit), and the tray. Add keyboard input for desktop.
- [x] A tray showing the current word, a score display, a timer display, and a list of found words.
- [x] Scenes wired to the reducer: Menu → Play (3 levels) → Results (score and share preview text).
- [x] Portrait design resolution of 720×1280 with Phaser `Scale.FIT`.

**Done when:** I can play a full daily puzzle from start to finish with placeholder graphics.
**Explain to me:** the Phaser game loop (`update`), how orbit positions come from sin/cos, and why tapping moving targets needs bigger hit areas.
**My checkpoint:** I'll send a screenshot, and you follow the screenshot protocol.

### Milestone 4 — Visual style

- [x] Palette, fonts, and sizes all defined in `tuning.ts`. Pick a Google Font, or use a system font stack as a fallback. Ask me which.
- [x] Background: a gradient plus a slow parallax star field.
- [x] Planet: a soft glow, with a subtle breathing (pulsing) animation.
- [x] Tiles: rounded, with a slight shadow and a clear selected state. Show the tap order with small numbers.
- [x] A timer ring drawn around the planet that shrinks as time passes.
- [x] Menu and Results screens styled to match.

**Done when:** I'm happy with how it looks. This is decided by screenshot review rounds, not by tests.
**Explain to me:** Phaser Graphics vs images, blend modes for glow effects, and why we keep colours in one place.

### Milestone 5 — Juice, part 1: motion & feedback

Juice means small effects that make actions feel satisfying.

- [x] Build `fx/` helpers: `pop(target)`, `shake(camera, intensity, ms)`, `burst(x, y, colour)` (particles), `floatText(x, y, "+250")`, and `flash(colour)`.
- [x] Tap a letter: the tile pops, and a "ghost" copy flies into the tray.
- [x] Valid word: tray letters fly into the planet, a particle burst plays, and the score floats upward.
- [x] Wrong word: the tray shakes and flashes red. The camera shakes for 100 ms (intensity set in tuning).
- [x] Key word: a big moment — slow motion, a ring shockwave, then tiles spiral into the planet.
- [x] Combo: the multiplier text grows and glows as the combo climbs.
- [x] Level transition: tiles fly out, the next orbit flies in, and speed visibly increases.
- [x] **Dev debug panel** (lil-gui, dev builds only) for adjusting any `tuning.ts` value live. Press the backtick (`) key to toggle it.
- [x] Respect `prefers-reduced-motion`: turn off shake and big motion, and keep only colour feedback.

**Done when:** I say it "feels good" after playing on desktop and phone.
**Explain to me:** tweens and easing curves, particle emitters, and why the debug panel speeds up tuning.
**🎓 My checkpoint (vague vs specific):**

1. I'll prompt _"make it more fun"_ and we'll commit the result on a branch called `vague`.
2. I'll then give a specific prompt, e.g. _"increase orbit speed 20% each level and add a 100 ms screen shake on a wrong answer"_, on a branch called `specific`.
3. Compare the two branches with me. Then I'll write up the difference in `LEARNINGS.md`.

### Milestone 6 — Juice, part 2: sound & haptics

- [x] `audio.ts`: sounds for tap (pitch rises with each letter in the word), valid word, wrong word, key word, combo up, level start, tick-tock in the last 10 s, and game over.
- [x] Unlock audio on the first user tap (browsers block sound until then).
- [x] A mute toggle that is remembered between visits. Master volume goes in tuning.
- [x] Short vibrations on supported phones (`navigator.vibrate`), off by default when reduced motion is on.

**Done when:** the sounds feel good together and nothing is annoying after 5 plays.
**Explain to me:** why browsers block audio until a user interaction, and how zzfx generates sound from numbers.

### Milestone 7 — Daily loop & sharing

- [ ] Menu shows: today's puzzle number, a "Play" button (or "Played ✓" if done), and a countdown to the next puzzle.
- [ ] Save game progress mid-play, so a reload resumes it. A completed daily shows Results instead of replaying.
- [ ] Results screen: score, words found, and the key words revealed **only after** the game is over. Show stats too: played, streak, best score, and a small score history bar chart.
- [ ] Share button: use the Web Share API on mobile, copy to clipboard on desktop, and show a "Copied!" toast.
- [ ] A "How to play" overlay on first launch, which can be reopened from the menu.

**Done when:** I play two days in a row (fake the date with a dev-only `?date=2026-10-02` URL parameter) and the streak shows 🔥2.
**Explain to me:** the Web Share API, localStorage limits, and why the date override is dev-only.

### Milestone 8 — Mobile, accessibility & performance

- [ ] Test at several screen sizes (small phone, tall phone, tablet, desktop). Handle safe areas and resizing, and prevent pull-to-refresh or zoom on double-tap.
- [ ] Touch targets are at least 48 px on screen, and tiles never overlap the tray or UI.
- [ ] Colour-blind-friendly feedback: never rely on colour alone. Add icons or shapes for right/wrong.
- [ ] Performance: steady 60 fps on a mid-range phone. Limit particle counts, reuse objects, and show an FPS readout in dev.
- [ ] Pause when the browser tab is hidden (the timer pauses too).
- [ ] Build size check: report the final size of the gzipped bundle.

**Done when:** I've played a full game on my own phone with no layout or performance problems.
**Explain to me:** responsive scaling in Phaser, object pooling, and what gzip size means for load time.

### Milestone 9 — Monetisation & shipping

- [ ] `platform/` adapter interface: `init()`, `gameplayStart()`, `gameplayStop()`, `showInterstitialAd()`, `isPremium()`. Implement `web` and `itch` versions first. **For CrazyGames and Poki, read their current SDK docs with me before writing any code.** Each portal has its own rules.
- [ ] Endless mode behind `isPremium()`, using random (non-daily) seeds and a harder speed curve.
- [ ] Separate build commands per platform (`npm run build:itch`, `build:web`, etc.) using Vite modes and environment variables.
- [ ] Itch.io: a zip of `dist/` with relative paths. Test it locally from a subfolder first. Draft the itch page text, tags, and a pay-what-you-want note.
- [ ] Own website: deploy to Netlify or GitHub Pages, with basic meta tags and a social preview image.
- [ ] Privacy note: the game stores data only in the browser; list it plainly. Update this note if portal ads add tracking.
- [ ] Write a CHANGELOG and tag `v1.0.0`.
- [ ] **Freeze past puzzles.** After launch, any change to the word lists, blocklist or generator changes the puzzles for everyone, including today's. Before `v1.0.0`, decide how list updates only affect future dates (e.g. versioned lists with a start date).

**Done when:** the game is live on itch.io and my own URL, and a friend has played it from a shared link.
**Explain to me:** the adapter pattern, build-time environment variables, and why `base: './'` matters.

---

## 6. Final Review (after Milestone 9)

Claude, please do these three things:

1. Review the codebase: find any rule logic that leaked out of `core/`, any magic numbers outside `tuning.ts`, and any bugs. List findings by severity before fixing.
2. Suggest 5 changes that would most improve player retention (people coming back daily).
3. Quiz me with 10 questions about how the game works, then correct my answers.

## 7. Stretch Goals (future plans)

- **Leaderboards:** a daily top-scores board. This needs a small backend, so plan it as a separate milestone.
- **Themes:** unlockable colour palettes and planet skins, driven entirely by `tuning.ts` presets.
- **Level editor:** make custom puzzles and share them via a URL code (reuses `core/puzzle.ts` validation).
- **Archive:** play past daily puzzles (a premium feature).
