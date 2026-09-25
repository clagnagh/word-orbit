// Every "feel" number lives here: speeds, durations, sizes, colours, shake strength.
// Scenes read from this file; they never hard-code these values.
// Game-rule numbers (timers, points) are in src/core/rules.ts instead.

export const tuning = {
  layout: {
    width: 720,
    height: 1280,
    planet: { x: 360, y: 560, radius: 110 },
    orbitRadius: 250,
    tileRadius: 44,
    hudY: 90,
    hudSideMargin: 40,
    comboY: 150,
    messageY: 900,
    tray: { x: 360, y: 990, width: 640, height: 100 },
    foundWords: { x: 40, y: 1080, width: 640, lineSpacing: 6 },
    menu: { titleY: 380, subtitleY: 480, buttonY: 700, buttonWidth: 320, buttonHeight: 110 },
    results: {
      titleY: 160,
      scoreY: 270,
      levelsY: 400,
      levelSpacing: 90,
      shareY: 820,
      shareLineSpacing: 8,
      buttonY: 1150,
    },
  },

  input: {
    /** Extra tap area around each moving tile, beyond its drawn edge. */
    tileHitPadding: 30,
    planetHitPadding: 20,
    /** Hold the tray this long to clear it. */
    longPressMs: 500,
  },

  orbit: {
    /** Radians per second on level 1 (0.35 ≈ one lap every 18 s). */
    baseSpeed: 0.35,
    /** Speed multiplier for levels 1, 2 and 3. */
    levelSpeedMultipliers: [1, 1.2, 1.44],
  },

  timing: {
    levelTransitionMs: 2_000,
    gameOverDelayMs: 2_000,
    messageMs: 1_200,
  },

  colors: {
    background: 0x0b1026,
    planet: 0x3a4a8c,
    tile: 0x5a6390,
    tileSelected: 0x2a2f48,
    tray: 0x1b2340,
    trayStroke: 0x5a6390,
    button: 0x3a4a8c,
    text: '#e6e9ff',
    dimText: '#8a91b8',
    good: '#7be08a',
    bad: '#ff7a7a',
  },

  fonts: {
    family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    monoFamily: 'ui-monospace, Menlo, Consolas, monospace',
    title: 80,
    subtitle: 34,
    button: 44,
    hud: 34,
    tile: 40,
    tray: 56,
    message: 32,
    foundWords: 26,
    share: 28,
  },
} as const;
