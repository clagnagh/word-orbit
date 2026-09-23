import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Pure-core rule: game logic must run (and be tested) without a browser or Phaser.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'src/core must stay pure: no Phaser imports.' }],
          patterns: [
            {
              group: ['**/game/**', '**/platform/**', '**/storage'],
              message: 'src/core must not depend on rendering, platform or storage code.',
            },
            { group: ['node:*'], message: 'src/core must run in the browser: no Node modules.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'process'].map(
          (name) => ({
            name,
            message: 'src/core must stay pure: pass outside things in as parameters.',
          }),
        ),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Pass time into the core as `now`.' },
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in core/rng.ts.' },
      ],
    },
  },
);
