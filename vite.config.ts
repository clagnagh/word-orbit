import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the build works from a subfolder (itch.io, game portals).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    // A fixed zone with daylight saving, so date tests behave the same on every machine.
    env: { TZ: 'America/New_York' },
  },
});
