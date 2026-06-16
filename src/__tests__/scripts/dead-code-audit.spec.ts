import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import deadCodeAudit from '../../../scripts/audit/dead-code'
import { LOCAL_AUDIT_CONTRACT_VERSION } from '../../../scripts/lib/audit-env.js'

function writeFakeKnip(
  projectRoot: string,
  exitCode: number,
  stdout: string,
  stderr = '',
  requireContractFallback = false
): void {
  const packageRoot = join(projectRoot, 'node_modules', 'knip')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      bin: {
        knip: 'fake-knip.cjs',
      },
    }),
    'utf8'
  )
  writeFileSync(
    join(packageRoot, 'fake-knip.cjs'),
    [
      ...(requireContractFallback
        ? [
            `if (process.env.VITE_CLIENT_CONTRACT_VERSION !== '${LOCAL_AUDIT_CONTRACT_VERSION}') {`,
            "  console.error('missing local audit contract fallback')",
            '  process.exit(3)',
            '}',
          ]
        : []),
      `process.stdout.write(${JSON.stringify(stdout)})`,
      `process.stderr.write(${JSON.stringify(stderr)})`,
      `process.exit(${exitCode})`,
      '',
    ].join('\n'),
    'utf8'
  )
}

describe('dead-code audit', () => {
  it('treats a clean knip json run as pass', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'dead-code-audit-pass-'))

    try {
      writeFakeKnip(projectRoot, 0, '{}')

      await expect(
        deadCodeAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'dead-code',
        status: 'pass',
        summary: 'No dead code issues found',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when knip exits non-zero without parsed issues', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'dead-code-audit-exit-'))

    try {
      writeFakeKnip(projectRoot, 1, '{}', 'knip crashed')

      await expect(
        deadCodeAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'dead-code',
        status: 'fail',
        summary: 'Found 1 error(s), 0 warning(s), and 0 info(s)',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('preserves warning status for parsed unused files', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'dead-code-audit-warning-'))

    try {
      writeFakeKnip(projectRoot, 1, JSON.stringify({ files: ['src/unused.ts'] }))

      await expect(
        deadCodeAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'dead-code',
        status: 'warn',
        summary: 'Found 0 error(s), 1 warning(s), and 0 info(s)',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('parses grouped knip issues from the current json schema', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'dead-code-audit-grouped-'))

    try {
      writeFakeKnip(
        projectRoot,
        1,
        JSON.stringify({
          issues: [
            {
              file: 'src/unused.ts',
              files: [{ name: 'src/unused.ts' }],
            },
          ],
        })
      )

      await expect(
        deadCodeAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'dead-code',
        status: 'warn',
        summary: 'Found 0 error(s), 1 warning(s), and 0 info(s)',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('runs knip with the local audit contract fallback env', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'dead-code-audit-env-'))

    try {
      writeFakeKnip(projectRoot, 0, '{}', '', true)

      await expect(
        deadCodeAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'dead-code',
        status: 'pass',
        summary: 'No dead code issues found',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
