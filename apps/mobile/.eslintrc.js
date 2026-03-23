/**
 * ESLint configuration for Fix My Chess mobile app
 * React Native + TypeScript strict rules
 * Note: Nx uses flat config (eslint.config.mjs) - this file provides legacy fallback
 */
module.exports = {
  root: true,
  extends: ['../../node_modules/@nx/eslint-plugin/dist/configs/base.js'],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
};
