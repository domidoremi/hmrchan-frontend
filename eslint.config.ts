/**
 * ESLint configuration.
 *
 * Includes:
 * - Vue 3 and TypeScript lint rules.
 * - Vitest-specific test rules.
 * - Project-specific rules.
 * - Formatting-rule exclusions handled by Prettier.
 *
 * TypeScript may report inference warnings because of a known ESLint flat-config limitation;
 * these warnings do not affect runtime behavior.
 */

import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

const config: ReturnType<typeof defineConfigWithVueTs> = defineConfigWithVueTs(
  /** Application lint scope */
  {
    name: 'app/files-to-lint',
    /** Include application, script, and Vue source files */
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx,vue}'],
  },

  /** Ignore build output, coverage reports, and local agent tooling */
  {
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/output/**',
      '**/.wrangler/**',
      '**/.claude/**',
      '**/.gitnexus/**',
      '**/.agent/**',
      '**/.agents/**',
      '**/.qoder/**',
      '**/.skills/**',
      '**/.superpowers/**',
      '**/.kiro/**',
      '**/.windsurf/**',
    ],
  },

  /** Essential Vue 3 rules */
  pluginVue.configs['flat/essential'],

  /** Recommended TypeScript rules */
  vueTsConfigs.recommended,

  /** Vitest rules */
  {
    ...pluginVitest.configs.recommended,
    /** Apply Vitest rules only to test files */
    files: ['src/**/__tests__/*'],
  },

  /** Leave formatting to Prettier */
  skipFormatting,

  /** Project-specific rules */
  {
    name: 'app/custom-rules',
    rules: {
      /**
       * Require multi-word Vue component names while allowing conventional single-word UI names
       * such as Button, Input, and Card.
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
  }
)

export default config
