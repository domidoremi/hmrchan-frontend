import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import typeCheckAudit from '../../../scripts/audit/type-check'
import { runLocalNodeTool, summarizeCommandIssues } from '../../../scripts/audit/utils'

function writeFakeViteTs(projectRoot: string, exitCode: number, stdout = '', stderr = ''): void {
  const packageRoot = join(projectRoot, 'node_modules', 'vue-tsc')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      bin: {
        'vue-tsc': 'fake-vue-tsc.cjs',
      },
    }),
    'utf8'
  )
  writeFileSync(
    join(packageRoot, 'fake-vue-tsc.cjs'),
    [
      `process.stdout.write(${JSON.stringify(stdout)})`,
      `process.stderr.write(${JSON.stringify(stderr)})`,
      `process.exit(${exitCode})`,
      '',
    ].join('\n'),
    'utf8'
  )
}

describe('type-check audit', () => {
  it('treats a clean vue-tsc run as pass', () => {
    expect(summarizeCommandIssues([], 0, 'ok', 'bad')).toEqual({
      status: 'pass',
      summary: 'ok',
    })
  })

  it('keeps fail when vue-tsc exits non-zero without parsed errors', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'type-check-audit-'))

    try {
      writeFakeViteTs(projectRoot, 1)

      await expect(
        typeCheckAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'type-check',
        status: 'fail',
        summary: 'Found 0 type error(s)',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('uses the local node tool helper for vue-tsc', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'type-check-helper-'))

    try {
      writeFakeViteTs(projectRoot, 0, 'hello')

      const result = await runLocalNodeTool('vue-tsc', ['--noEmit'], projectRoot)

      expect(result).toMatchObject({
        exitCode: 0,
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
