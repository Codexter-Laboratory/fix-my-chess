import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/react'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Web-only rule (expects <span>); React Native uses role/aria-label on <Text> instead.
      'jsx-a11y/accessible-emoji': 'off',
    },
  },
  {
    ignores: ['public', '.cache', 'node_modules', '**/out-tsc'],
  },
];
