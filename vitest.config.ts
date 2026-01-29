/**
 * Vitest 测试配置文件
 *
 * 优化策略:
 * - 使用 jsdom 环境模拟浏览器
 * - 启用全局 API 简化测试代码
 * - 配置覆盖率报告
 * - 优化测试性能和并发
 * - 启用快照测试
 */

import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // @ts-expect-error - Vite 8 (Rolldown) plugin compatibility with Vitest
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    /** 使用 jsdom 模拟浏览器环境 */
    environment: 'jsdom',

    /** 启用全局 API (describe, it, expect 等) */
    globals: true,

    /** 排除不需要测试的文件 */
    exclude: [...configDefaults.exclude, 'e2e/**', 'dist/**', 'node_modules/**'],

    /** 测试根目录 */
    root: fileURLToPath(new URL('./', import.meta.url)),

    /** 覆盖率配置 */
    coverage: {
      /** 使用 v8 引擎收集覆盖率（更快） */
      provider: 'v8',

      /** 报告格式 */
      reporter: ['text', 'json', 'html', 'lcov'],

      /** 覆盖率阈值 */
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },

      /** 排除不需要覆盖率的文件 */
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

      /** 包含的文件 */
      include: ['src/**/*.{ts,vue}'],

      /** 清理之前的覆盖率报告 */
      clean: true,
    },

    /** 测试超时时间 (ms) */
    testTimeout: 10000,

    /** Hook 超时时间 (ms) */
    hookTimeout: 10000,

    /** 监听模式下的文件变化 */
    watch: false,

    /** 隔离测试环境 */
    isolate: true,

    /** 测试文件匹配模式 */
    include: ['src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    /** Setup files for global test configuration */
    setupFiles: ['vitest.setup.ts'],

    /** 并发运行测试 */
    pool: 'threads',

    /** 最大并发线程数 */
    threads: {
      singleThread: false,
      maxThreads: 4,
      minThreads: 1,
    },

    /** 启用快照测试 */
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },

    /** 测试报告器 */
    reporters: ['default'],

    /** 静默模式 */
    silent: false,

    /** 启用 UI 模式 */
    ui: false,

    /** 启用浏览器模式 */
    browser: {
      enabled: false,
    },

    /** 性能优化 */
    cache: {
      dir: 'node_modules/.vitest',
    },

    /** 启用类型检查 */
    typecheck: {
      enabled: false,
    },
  },
})
