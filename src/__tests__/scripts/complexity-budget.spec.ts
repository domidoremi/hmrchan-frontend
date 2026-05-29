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
        violationReasons: [
          {
            code: 'unregistered-large-file',
            message: 'file exceeds softLineLimit 10 and is not registered',
          },
        ],
      }),
    ])
    expect(formatComplexityBudgetReport(result)).toContain('unregistered-large-file')
  })

  it('reports registered limit and hard-limit refactor queue violations separately', () => {
    const metrics = {
      files: [
        {
          relativePath: 'src/views/GrewPastRegistration.vue',
          lineCount: 13,
        },
        {
          relativePath: 'src/views/HardLimitWithoutQueue.vue',
          lineCount: 16,
        },
        {
          relativePath: 'src/views/HardLimitWithQueue.vue',
          lineCount: 16,
        },
      ],
    }

    const result = analyzeComplexityBudget(metrics, {
      softLineLimit: 10,
      hardLineLimit: 15,
      registeredLargeFiles: {
        'src/views/GrewPastRegistration.vue': {
          maxLines: 12,
          refactorQueued: false,
          reason: 'grew after registration',
        },
        'src/views/HardLimitWithoutQueue.vue': {
          maxLines: 20,
          refactorQueued: false,
          reason: 'missing queue marker',
        },
        'src/views/HardLimitWithQueue.vue': {
          maxLines: 20,
          refactorQueued: true,
          reason: 'tracked refactor',
        },
      },
    })

    expect(result.status).toBe('failed')
    expect(result.violations).toEqual([
      expect.objectContaining({
        path: 'src/views/GrewPastRegistration.vue',
        violationReasons: [
          {
            code: 'registered-limit-exceeded',
            message: 'file exceeds registered maxLines 12',
          },
        ],
      }),
      expect.objectContaining({
        path: 'src/views/HardLimitWithoutQueue.vue',
        violationReasons: [
          {
            code: 'hard-limit-without-refactor-queue',
            message: 'file exceeds hardLineLimit 15 and is not queued for refactor',
          },
        ],
      }),
    ])

    expect(
      result.largeFiles.find((file) => file.path === 'src/views/HardLimitWithQueue.vue')
    ).toEqual(
      expect.objectContaining({
        violation: false,
        violationReasons: [],
      })
    )
    expect(formatComplexityBudgetReport(result)).toContain('hard-limit-without-refactor-queue')
  })
})
