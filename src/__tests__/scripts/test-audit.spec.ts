import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import testAudit from '../../../scripts/audit/test'

function writeFakeVitest(
  projectRoot: string,
  exitCode: number,
  stdout: string,
  stderr = '',
  reportToFile = false
): void {
  const packageRoot = join(projectRoot, 'node_modules', 'vitest')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      bin: {
        vitest: 'fake-vitest.cjs',
      },
    }),
    'utf8'
  )
  writeFileSync(
    join(packageRoot, 'fake-vitest.cjs'),
    [
      reportToFile ? "const fs = require('node:fs'); const path = require('node:path')" : '',
      reportToFile
        ? `const outputIndex = process.argv.indexOf('--outputFile'); const outputPath = process.argv[outputIndex + 1]; fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, ${JSON.stringify(stdout)}, 'utf8'); process.stdout.write('JSON report written')`
        : `process.stdout.write(${JSON.stringify(stdout)})`,
      `process.stderr.write(${JSON.stringify(stderr)})`,
      `process.exit(${exitCode})`,
      '',
    ].join('\n'),
    'utf8'
  )
}

function vitestJson(total: number, passed: number, failed: number): string {
  return JSON.stringify({
    numTotalTests: total,
    numPassedTests: passed,
    numFailedTests: failed,
    testResults: [],
  })
}

describe('test audit', () => {
  it('treats a clean vitest json run as pass', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'test-audit-pass-'))

    try {
      writeFakeVitest(projectRoot, 0, vitestJson(3, 3, 0))

      await expect(
        testAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'test',
        status: 'pass',
        summary: 'All 3 test(s) passed',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('reads and removes a Vitest 5 JSON output file', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'test-audit-file-'))

    try {
      writeFakeVitest(projectRoot, 0, vitestJson(4, 4, 0), '', true)

      await expect(
        testAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'test',
        status: 'pass',
        summary: 'All 4 test(s) passed',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when vitest exits non-zero even if json reports no failed tests', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'test-audit-exit-'))

    try {
      writeFakeVitest(projectRoot, 1, vitestJson(3, 3, 0))

      await expect(
        testAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'test',
        status: 'fail',
        summary: 'Vitest exited with code 1',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
