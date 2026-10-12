import coreWebVitals from 'eslint-config-next/core-web-vitals';
import tsConfig from 'eslint-config-next/typescript';

export default [
  ...coreWebVitals,
  ...tsConfig,
  {
    ignores: ['node_modules/**', '.next/**', 'worker/**', 'drizzle/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
