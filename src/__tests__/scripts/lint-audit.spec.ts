import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import lintAudit from '../../../scripts/audit/lint'

function writeFakeEslint(projectRoot: string, exitCode: number, stdout: string, stderr = ''): void {
  const packageRoot = join(projectRoot, 'node_modules', 'eslint')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      bin: {
        eslint: 'fake-eslint.cjs',
      },
    }),
    'utf8'
  )
  writeFileSync(
    join(packageRoot, 'fake-eslint.cjs'),
    [
      `process.stdout.write(${JSON.stringify(stdout)})`,
      `process.stderr.write(${JSON.stringify(stderr)})`,
      `process.exit(${exitCode})`,
      '',
    ].join('\n'),
    'utf8'
  )
}

describe('lint audit', () => {
  it('treats a clean eslint json run as pass', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lint-audit-pass-'))

    try {
      writeFakeEslint(projectRoot, 0, '[]')

      await expect(
        lintAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'lint',
        status: 'pass',
        summary: 'No lint issues found',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when eslint exits non-zero even if json has no messages', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lint-audit-exit-'))

    try {
      writeFakeEslint(projectRoot, 1, '[]')

      await expect(
        lintAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'lint',
        status: 'fail',
        summary: 'ESLint exited with code 1',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
