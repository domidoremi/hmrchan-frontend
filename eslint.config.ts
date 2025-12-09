/**
 * ESLint 配置文件
 *
 * 主要配置：
 * - Vue 3 + TypeScript 项目的代码检查规则
 * - Vitest 测试文件的特殊规则
 * - 自定义规则配置
 * - 格式化规则跳过配置（由 Prettier 处理）
 */

import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  /** 应用文件检查范围配置 */
  {
    name: 'app/files-to-lint',
    /** 指定需要检查的文件类型：TypeScript 和 Vue 文件 */
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  /** 全局忽略的目录：构建产物和测试覆盖率报告 */
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  /** Vue 3 基础规则配置 - 包含 Vue 3 必需的核心规则 */
  pluginVue.configs['flat/essential'],

  /** TypeScript 推荐规则配置 - 包含 TypeScript 类型检查和最佳实践 */
  vueTsConfigs.recommended,

  /** Vitest 测试文件规则配置 */
  {
    ...pluginVitest.configs.recommended,
    /** 仅对测试文件应用 Vitest 规则 */
    files: ['src/**/__tests__/*'],
  },

  /** 跳过格式化相关规则 - 格式化由 Prettier 统一处理 */
  skipFormatting,

  /** 自定义规则配置 */
  {
    name: 'app/custom-rules',
    rules: {
      /**
       * Vue 组件命名规则
       * 要求组件名使用多个单词，但允许常见的单字 UI 组件名
       * 忽略列表包含：Button、Input、Card 等常用 UI 组件
       */
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: [
            'Button',
            'Input',
            'Card',
            'Badge',
            'Icon',
            'Modal',
            'Toast',
            'Loading',
            'Skeleton',
            'Checkbox',
            'Radio',
          ],
        },
      ],
    },
  },
)
