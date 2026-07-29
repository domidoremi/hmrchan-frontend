/**
 * Vitest test configuration.
 *
 * Strategy:
 * - Simulate browser behavior with jsdom.
 * - Enable global APIs to keep tests concise.
 * - Configure coverage reporting.
 * - Keep test concurrency stable.
 * - Enable snapshot testing.
 */

import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  /** Vite cache directory; Vitest uses cacheDir/vitest */
  cacheDir: 'node_modules/.vite',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    /** Simulate the browser environment with jsdom */
    environment: 'jsdom',

    /** Enable global APIs such as describe, it, and expect */
    globals: true,

    /** Exclude files that do not require tests */
    exclude: [...configDefaults.exclude, 'e2e/**', 'dist/**', 'node_modules/**'],

    /** Test root directory */
    root: fileURLToPath(new URL('./', import.meta.url)),

    /** Coverage configuration */
    coverage: {
      /**
       * Production gates use Istanbul coverage.
       * The v8 provider has unstable inspector/.tmp aggregation with the current Bun/Windows
       * worker setup, producing false 0% data or runtime failures, so it is not a trusted gate.
       */
      provider: 'istanbul',

      /** Report formats */
      reporter: ['text', 'json', 'html', 'lcov'],

      /**
       * Phase-one coverage baseline.
       * Start with blocking thresholds based on reliable current coverage, then raise them by
       * module instead of retaining a misleading global 60% threshold.
       */
      thresholds: {
        lines: 39,
        functions: 37,
        branches: 30,
        statements: 38,
      },

      /** Exclude files that do not require coverage */
      exclude: [
        ...(configDefaults.coverage.exclude || []),
        '**/*.config.*',
        '**/*.d.ts',
        '**/mockData/**',
        '**/types/**',
        'src/main.ts',
        'src/router/**',
        'src/types/**',
        'functions/**',
        'scripts/**',
        'public/**',
      ],

      /** Included files */
      include: ['src/**/*.{ts,vue}'],

      /** Remove previous coverage reports */
      clean: true,
    },

    /** Test timeout in milliseconds */
    testTimeout: 10000,

    /** Hook timeout in milliseconds */
    hookTimeout: 10000,

    /** Watch file changes */
    watch: false,

    /** Isolate test environments */
    isolate: true,

    /** Test file patterns */
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'functions/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'build/vite/plugins/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],

    /** Setup files for global test configuration */
    setupFiles: ['vitest.setup.ts'],

    /**
     * Thread workers can fail to start in non-interactive terminals on Windows with Bun.
     * Forks keep the same test command stable in Codex, CI, and background terminals.
     */
    pool: 'forks',

    /** Snapshot formatting */
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },

    /** Test reporters */
    reporters: ['default'],

    /** Silent mode */
    silent: false,

    /** UI mode */
    ui: false,

    /** Browser mode */
    browser: {
      enabled: false,
    },

    /** Type checking */
    typecheck: {
      enabled: false,
    },
  },
})
