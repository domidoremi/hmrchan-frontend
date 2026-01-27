/**
 * Vitest 测试配置文件
 *
 * 优化策略:
 * - 使用 jsdom 环境模拟浏览器
 * - 启用全局 API 简化测试代码
 * - 配置覆盖率报告
 * - 优化测试性能
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
    exclude: [...configDefaults.exclude, 'e2e/**'],

    /** 测试根目录 */
    root: fileURLToPath(new URL('./', import.meta.url)),

    /** 覆盖率配置 */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        ...(configDefaults.coverage.exclude || []),
        '**/*.config.*',
        '**/mockData',
        'src/main.ts',
        'src/router/**',
        'src/types/**',
      ],
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
    setupFiles: [],
  },
})
