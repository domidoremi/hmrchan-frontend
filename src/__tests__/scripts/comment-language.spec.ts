import { describe, expect, it } from 'vitest'

import { findNonEnglishCommentIssues } from '../../../scripts/lib/comment-language.js'

describe('code comment language audit', () => {
  it('detects non-English script comments without treating string content as comments', () => {
    const source = [
      "const label = '中文文案'",
      '// English comment',
      '// 中文注释',
      'const value = 1 /* 中文块注释 */',
    ].join('\n')

    expect(findNonEnglishCommentIssues(source, '.ts')).toEqual([
      { line: 3, rule: 'english-code-comments' },
      { line: 4, rule: 'english-code-comments' },
    ])
  })

  it('checks Vue template, script, and style comments', () => {
    const source = [
      '<template><!-- 中文模板注释 --></template>',
      '<script setup lang="ts">// 中文脚本注释\nconst ready = true</script>',
      '<style>/* 中文样式注释 */</style>',
    ].join('\n')

    expect(findNonEnglishCommentIssues(source, '.vue')).toHaveLength(3)
  })

  it('accepts English comments', () => {
    expect(findNonEnglishCommentIssues('// Preserve the compatibility fallback.', '.ts')).toEqual(
      []
    )
  })
})
