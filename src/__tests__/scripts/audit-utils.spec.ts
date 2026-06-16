import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { AuditIssue } from '../../../scripts/audit/types'
import {
  runLocalNodeTool,
  summarizeCommandIssues,
  summarizeIssueSeverities,
} from '../../../scripts/audit/utils'

function issue(severity: AuditIssue['severity']): AuditIssue {
  return {
    severity,
    message: `${severity} issue`,
  }
}

describe('audit utils', () => {
  it('marks an empty issue list as pass', () => {
    expect(summarizeIssueSeverities([])).toEqual({
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      status: 'pass',
    })
  })

  it('keeps info-only issues as pass while counting them', () => {
    expect(summarizeIssueSeverities([issue('info')])).toEqual({
      errorCount: 0,
      warningCount: 0,
      infoCount: 1,
      status: 'pass',
    })
  })

  it('marks warnings as warn when no errors exist', () => {
    expect(summarizeIssueSeverities([issue('warning'), issue('info')])).toEqual({
      errorCount: 0,
      warningCount: 1,
      infoCount: 1,
      status: 'warn',
    })
  })

  it('marks errors as fail before warnings', () => {
    expect(summarizeIssueSeverities([issue('warning'), issue('error')])).toEqual({
      errorCount: 1,
      warningCount: 1,
      infoCount: 0,
      status: 'fail',
    })
  })

  it('passes custom env values into resolved local node tools', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'audit-utils-local-tool-'))
    const packageRoot = join(projectRoot, 'node_modules', 'vite')

    try {
      mkdirSync(packageRoot, { recursive: true })
      writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({
          bin: {
            vite: 'fake-vite.cjs',
          },
        }),
        'utf8'
      )
      writeFileSync(
        join(packageRoot, 'fake-vite.cjs'),
        "process.stdout.write(process.env.AUDIT_UTILS_SENTINEL ?? '')\n",
        'utf8'
      )

      const result = await runLocalNodeTool('vite', [], projectRoot, {
        env: {
          AUDIT_UTILS_SENTINEL: 'passed-through',
        },
      })

      expect(result).toMatchObject({
        exitCode: 0,
        stdout: 'passed-through',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails command summaries when exit code is non-zero even without issues', () => {
    expect(summarizeCommandIssues([], 1, 'ok', 'failed')).toEqual({
      status: 'fail',
      summary: 'failed',
    })
  })
})
