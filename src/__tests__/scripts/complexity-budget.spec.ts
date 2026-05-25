import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  analyzeComplexityBudget,
  collectComplexityMetrics,
  countLines,
  formatComplexityBudgetReport,
} from '../../../scripts/lib/complexity-budget.js'

describe('complexity budget helpers', () => {
  it('counts files without inflating trailing newline line counts', () => {
    expect(countLines('')).toBe(0)
    expect(countLines('const a = 1')).toBe(1)
    expect(countLines('const a = 1\n')).toBe(1)
    expect(countLines('const a = 1\nconst b = 2')).toBe(2)
  })

  it('allows registered large files and flags unregistered complexity debt', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'hmrchan-complexity-budget-'))
    mkdirSync(path.join(rootDir, 'src', 'views'), { recursive: true })
    mkdirSync(path.join(rootDir, 'src', 'views', '__tests__'), { recursive: true })
    writeFileSync(
      path.join(rootDir, 'src', 'views', 'RegisteredPage.vue'),
      Array.from({ length: 12 }, (_, index) => `<div>${index}</div>`).join('\n')
    )
    writeFileSync(
      path.join(rootDir, 'src', 'views', 'NewLargePage.vue'),
      Array.from({ length: 11 }, (_, index) => `const item${index} = ${index}`).join('\n')
    )
    writeFileSync(
      path.join(rootDir, 'src', 'views', '__tests__', 'LargeSpec.spec.ts'),
      Array.from({ length: 20 }, (_, index) => `expect(${index}).toBe(${index})`).join('\n')
    )

    const metrics = collectComplexityMetrics({ rootDir })
    const result = analyzeComplexityBudget(metrics, {
      softLineLimit: 10,
      hardLineLimit: 15,
      registeredLargeFiles: {
        'src/views/RegisteredPage.vue': {
          maxLines: 12,
          refactorQueued: false,
          reason: 'fixture',
        },
      },
    })

    expect(metrics.files.map((file) => file.relativePath)).toEqual([
      'src/views/NewLargePage.vue',
      'src/views/RegisteredPage.vue',
    ])
    expect(result.status).toBe('failed')
    expect(result.largeFiles).toHaveLength(2)
    expect(result.violations).toEqual([
      expect.objectContaining({
        path: 'src/views/NewLargePage.vue',
        lineCount: 11,
        registered: false,
      }),
    ])
    expect(formatComplexityBudgetReport(result)).toContain('NewLargePage.vue')
  })
})
