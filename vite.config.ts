import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the build works from a subfolder (itch.io, game portals).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
