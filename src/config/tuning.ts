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
      /** The last row stays clear of the mute button in the bottom-right corner. */
      lastRowWidth: 520,
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

  /**
   * Sound. Each recipe is a list of zzfx numbers, in this order:
   * volume, randomness, frequency (Hz), attack, sustain, release (s), shape (0 sine, 1 triangle,
   * 2 saw, 3 tan, 4 noise), shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime,
   * noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo.
   * Design or tweak recipes at https://killedbyapixel.github.io/ZzFX/ and paste them here.
   */
  audio: {
    masterVolume: 0.3,
    recipes: {
      tap: [0.45, 0, 520, 0, 0.02, 0.08, 1, 2],
      chime: [0.5, 0, 660, 0.01, 0.05, 0.3, 0, 1.5],
      wrong: [0.5, 0.05, 150, 0, 0.04, 0.14, 1, 1, -6],
      note: [0.5, 0, 523, 0.005, 0.06, 0.35, 0, 1.8],
      comboBlip: [0.25, 0, 880, 0, 0.01, 0.06, 0, 1],
      whoosh: [0.25, 0, 220, 0.2, 0.08, 0.3, 0, 1, 7, 0, 0, 0, 0, 1.2],
      tick: [0.18, 0, 1400, 0, 0, 0.03, 1],
      tock: [0.18, 0, 1000, 0, 0, 0.03, 1],
    },
    /** Each letter in the word plays this many semitones higher than the one before. */
    tapSemitoneStep: 2,
    /** The valid-word chime's second note: ratio 1.5 is a musical fifth above the first. */
    chimeSecondRatio: 1.5,
    chimeGapMs: 90,
    /** Combo blip rises this many semitones per combo step. */
    comboSemitoneStep: 1,
    comboDelayMs: 200,
    /** Key word: a rising arpeggio of these semitones above the note recipe's pitch. */
    keyWordNotes: [0, 4, 7, 12],
    keyWordGapMs: 70,
    /** Game over: a gentle falling phrase. */
    gameOverNotes: [7, 4, 0],
    gameOverGapMs: 170,
    /** Tick-tock plays once per second when this many seconds or fewer remain. */
    tickFromSec: 10,
  },

  /** Vibration patterns in ms (on, off, on…). Android only; off when reduced motion is on. */
  haptics: {
    tap: [8],
    valid: [20],
    wrong: [30, 40, 30],
    keyWord: [40, 60, 120],
  },

  /** hitSize is the invisible tap area: bigger than the drawn button so it's easy to hit (≥ 48 px on a phone). */
  muteButton: { x: 668, y: 1228, radius: 30, hitSize: 100, iconSize: 14, lineWidth: 4 },

  /** Juice: the small effects that make actions feel good. Durations are in ms. */
  fx: {
    /** Tapped tile grows, then springs back. */
    pop: { scale: 1.18, upMs: 70, downMs: 140 },
    /** The score pops a little each time it goes up. */
    scorePopScale: 1.12,
    /** Copy of a tapped letter flying into its tray slot. */
    ghost: { ms: 200, endScale: 0.6 },
    /** Tray letters flying into the planet after a valid word. */
    intoPlanet: { ms: 260, staggerMs: 30, endScale: 0.3 },
    burst: {
      /** Word bursts use palette.star so they show up against the teal planet. */
      count: 18,
      keyWordCount: 40,
      speedMin: 120,
      speedMax: 320,
      lifespanMs: 700,
      particleRadius: 6,
    },
    /** Floating text gets a dark outline so it reads over the planet and tiles. */
    floatText: { rise: 90, ms: 800, keyWordFontSize: 52, keyWordMs: 1_400, outlineWidth: 8 },
    trayShake: { distance: 14, swings: 4, ms: 260 },
    trayFlashMs: 220,
    cameraShake: { ms: 100, intensity: 0.006 },
    /** An already-found word's pill pops and turns amber for highlightMs. */
    pillPulse: { scale: 1.2, highlightMs: 540 },
    keyWord: {
      /** Everything animates at this fraction of normal speed, easing back to 1 over slowMs. */
      slowScale: 0.35,
      slowMs: 350,
      flashAlpha: 0.25,
      flashMs: 150,
      shockwaveRadius: 700,
      shockwaveMs: 700,
      shockwaveWidth: 6,
      spiralTurns: 1,
      spiralMs: 900,
      /** Tiles shrink to this size as they spiral in. */
      spiralEndScale: 0.3,
    },
    /** glowPadding must be at least glowPerStep × 10 so the glow isn't clipped into a box. */
    combo: { growPerStep: 0.05, popScale: 1.3, glowPerStep: 3, glowPadding: 32 },
    flyOut: { radius: 700, ms: 500 },
    flyIn: { fromRadius: 700, ms: 600, staggerMs: 60 },
    /** Stars briefly rush past when a faster level starts. */
    starSurge: { multiplier: 4, ms: 900 },
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
