// Every "feel" number lives here: speeds, durations, sizes, colours, shake strength.
// Scenes read from this file; they never hard-code these values.
// Game-rule numbers (timers, points) are in src/core/rules.ts instead.

/** The palette. Colours are 0xRRGGBB numbers; use toCss() from src/game/color.ts for text. */
const palette = {
  skyTop: 0x0a0f24,
  skyBottom: 0x1b1646,
  star: 0xdfe4ff,
  planet: 0x6fd3c7,
  planetGlow: 0x6fd3c7,
  tile: 0xf4efe6,
  tileText: 0x1a1f3d,
  shadow: 0x000000,
  accent: 0xffc970,
  panel: 0x161b3a,
  panelStroke: 0x3a4170,
  text: 0xe6e9ff,
  dimText: 0x8a91b8,
  good: 0x7be08a,
  warn: 0xffc970,
  bad: 0xff7a7a,
} as const;

export const tuning = {
  palette,

  layout: {
    width: 720,
    height: 1280,
    planet: { x: 360, y: 560, radius: 110 },
    orbitRadius: 250,
    tileRadius: 44,
    hud: { labelY: 58, valueY: 98, sideMargin: 44 },
    comboY: 170,
    messageY: 885,
    tray: { x: 360, y: 975, width: 640, height: 100, cornerRadius: 24, strokeWidth: 2 },
    foundWords: {
      headerY: 1068,
      firstRowY: 1118,
      rowSpacing: 52,
      maxRows: 3,
      width: 640,
      pillGap: 10,
      pillPaddingX: 16,
      pillHeight: 40,
    },
    menu: {
      titleY: 250,
      subtitleY: 345,
      subtitleLineSpacing: 10,
      orbitY: 640,
      orbitRadius: 150,
      planetRadius: 60,
      tileRadius: 34,
      buttonY: 960,
      buttonWidth: 320,
      buttonHeight: 104,
      buttonCornerRadius: 52,
      buttonHoverScale: 1.04,
    },
    results: {
      titleY: 140,
      scoreY: 240,
      levelsY: 380,
      levelSpacing: 84,
      card: { y: 800, width: 560, height: 250, cornerRadius: 28 },
      shareLineSpacing: 10,
      buttonY: 1120,
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
    /** The decorative orbit on the menu. */
    menuSpeed: 0.25,
  },

  timing: {
    levelTransitionMs: 2_000,
    gameOverDelayMs: 2_000,
    messageMs: 1_200,
  },

  background: {
    /** Star layers, far to near. Drift speed (px/s) is multiplied by the level's orbit speed. */
    starLayers: [
      { count: 60, speed: 4, alpha: 0.35, radius: 1.2 },
      { count: 30, speed: 8, alpha: 0.55, radius: 1.8 },
      { count: 12, speed: 16, alpha: 0.8, radius: 2.4 },
    ],
  },

  planet: {
    /** Soft halo around the planet: its size as a multiple of the planet radius, and its peak opacity. */
    glowScale: 1.8,
    glowAlpha: 0.4,
    breatheScale: 1.04,
    breatheMs: 3_200,
    /** Opacity of the ✓ on the planet: dim until the word is long enough to submit. */
    checkIdleAlpha: 0.35,
    checkReadyAlpha: 1,
    checkSize: 34,
    checkStroke: 8,
  },

  timerRing: {
    radius: 128,
    thickness: 8,
    trackAlpha: 0.15,
    /** Colour changes when fewer than this many seconds remain. */
    warnBelowSec: 20,
    dangerBelowSec: 10,
  },

  tile: {
    shadowOffsetY: 4,
    shadowAlpha: 0.35,
    selectedRingWidth: 4,
    selectedLetterAlpha: 0.45,
    badgeRadius: 15,
    badgeOffset: 32,
  },

  tray: {
    placeholder: 'Tap letters to spell a word',
    placeholderAlpha: 0.4,
  },

  fonts: {
    family: 'Fredoka, "Trebuchet MS", system-ui, sans-serif',
    regular: '400',
    medium: '500',
    bold: '600',
    title: 88,
    subtitle: 30,
    button: 42,
    hudLabel: 20,
    hudValue: 38,
    combo: 30,
    tile: 44,
    tileBadge: 18,
    tray: 56,
    message: 34,
    foundHeader: 24,
    foundWord: 24,
    resultsScore: 96,
    resultsLevel: 32,
    share: 28,
    labelLetterSpacing: 3,
  },
} as const;
