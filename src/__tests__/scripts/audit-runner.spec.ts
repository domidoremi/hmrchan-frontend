import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildAuditReport,
  parseArgs,
  runAuditModules,
  selectModules,
} from '../../../scripts/audit/index'
import type { AuditModule, AuditOptions, AuditResult } from '../../../scripts/audit/types'

describe('audit runner helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses fix, verbose, and only flags', () => {
    expect(parseArgs(['--fix', '--verbose', '--only=text-style'])).toEqual({
      fix: true,
      verbose: true,
      only: 'text-style',
    })
  })

  it('keeps default options when no supported flags are provided', () => {
    expect(parseArgs(['--unknown'])).toEqual({
      fix: false,
      verbose: false,
      only: null,
    })
  })

  it('selects audit modules by name without requiring exact case', () => {
    expect(selectModules('TEXT-STYLE').map((mod) => mod.name)).toEqual(['text-style'])
  })

  it('builds aggregate report counts from module results', () => {
    const results: AuditResult[] = [
      {
        module: 'passing',
        status: 'pass',
        issues: [],
        summary: 'ok',
        duration: 4,
      },
      {
        module: 'warning',
        status: 'warn',
        issues: [{ severity: 'warning', message: 'warning issue' }],
        summary: 'warned',
        duration: 8,
      },
      {
        module: 'failing',
        status: 'fail',
        issues: [
          { severity: 'error', message: 'first error' },
          { severity: 'error', message: 'second error' },
        ],
        summary: 'failed',
        duration: 12,
      },
    ]

    expect(buildAuditReport(results, 24)).toMatchObject({
      results,
      totalIssues: 3,
      passCount: 1,
      warnCount: 1,
      failCount: 1,
      totalDuration: 24,
    })
  })

  it('runs selected modules in order and returns the aggregate report', async () => {
    const calls: string[] = []
    const options: AuditOptions = {
      fix: true,
      verbose: true,
      projectRoot: 'project-root',
    }
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const modules: AuditModule[] = [
      {
        name: 'first',
        async run(receivedOptions) {
          calls.push(`first:${receivedOptions.projectRoot}:${receivedOptions.fix}`)
          return {
            module: 'first',
            status: 'pass',
            issues: [],
            summary: 'ok',
            duration: 1,
          }
        },
      },
      {
        name: 'second',
        async run(receivedOptions) {
          calls.push(`second:${receivedOptions.projectRoot}:${receivedOptions.verbose}`)
          return {
            module: 'second',
            status: 'fail',
            issues: [{ severity: 'error', message: 'failed' }],
            summary: 'failed',
            duration: 2,
          }
        },
      },
    ]

    await expect(runAuditModules(modules, options, true)).resolves.toMatchObject({
      results: [
        { module: 'first', status: 'pass' },
        { module: 'second', status: 'fail' },
      ],
      totalIssues: 1,
      passCount: 1,
      warnCount: 0,
      failCount: 1,
    })
    expect(calls).toEqual(['first:project-root:true', 'second:project-root:true'])
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('first'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('second'))
  })
})
