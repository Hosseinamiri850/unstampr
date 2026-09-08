import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // DB-backed integration suites share one PostgreSQL database; parallel test
    // files let one file's cleanPakinoTables() wipe another file's fixtures.
    fileParallelism: false,
  },
});
