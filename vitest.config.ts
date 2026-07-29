import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // @ts-expect-error - Vite 8 (Rolldown) plugin compatibility with Vitest - type mismatch in hotUpdate hook
  plugins: [vue()],

  cacheDir: 'node_modules/.vite',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',

    globals: true,

    exclude: [...configDefaults.exclude, 'e2e/**', 'dist/**', 'node_modules/**'],

    root: fileURLToPath(new URL('./', import.meta.url)),

    coverage: {
      // Istanbul avoids unstable V8 inspector aggregation under Bun/Windows workers.
      provider: 'istanbul',

      reporter: ['text', 'json', 'html', 'lcov'],

      thresholds: {
        lines: 39,
        functions: 37,
        branches: 30,
        statements: 38,
      },

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

      include: ['src/**/*.{ts,vue}'],

      clean: true,
    },

    testTimeout: 10000,

    hookTimeout: 10000,

    watch: false,

    isolate: true,

    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'functions/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],

    /** Setup files for global test configuration */
    setupFiles: ['vitest.setup.ts'],

    // Fork workers remain stable in CI and non-interactive Windows terminals.
    pool: 'forks',

    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },

    reporters: ['default'],

    silent: false,

    ui: false,

    browser: {
      enabled: false,
    },

    typecheck: {
      enabled: false,
    },
  },
})
