import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',

    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/output/**',
      '**/.wrangler/**',
      '**/.gitnexus/**',
      '**/.claude/**',
      '**/.agent/**',
      '**/.agents/**',
      '**/.qoder/**',
      '**/.skills/**',
      '**/.superpowers/**',
      '**/.kiro/**',
      '**/.windsurf/**',
    ],
  },

  pluginVue.configs['flat/essential'],

  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,

    files: ['src/**/__tests__/*'],
  },

  skipFormatting,

  {
    name: 'app/custom-rules',
    rules: {
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
