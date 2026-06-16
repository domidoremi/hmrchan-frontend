import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import buildAudit from '../../../scripts/audit/build'
import { LOCAL_AUDIT_CONTRACT_VERSION } from '../../../scripts/lib/audit-env.js'

function writeFakeVite(projectRoot: string): void {
  const packageRoot = join(projectRoot, 'node_modules', 'vite')
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
    [
      "const { mkdirSync, writeFileSync } = require('node:fs')",
      "const { join } = require('node:path')",
      `if (process.env.VITE_CLIENT_CONTRACT_VERSION !== '${LOCAL_AUDIT_CONTRACT_VERSION}') {`,
      "  console.error('missing local audit contract fallback')",
      '  process.exit(3)',
      '}',
      "if (process.env.LOCAL_AUDIT_BUILD !== 'true') {",
      "  console.error('missing local audit build marker')",
      '  process.exit(4)',
      '}',
      "mkdirSync(join(process.cwd(), 'dist', 'assets'), { recursive: true })",
      "writeFileSync(join(process.cwd(), 'dist', 'index.html'), '<!doctype html>')",
      "writeFileSync(join(process.cwd(), 'dist', 'assets', 'app.js'), 'console.log(\"ok\")')",
      "writeFileSync(join(process.cwd(), 'dist', 'assets', 'style.css'), 'body{}')",
      '',
    ].join('\n'),
    'utf8'
  )
}

describe('build audit', () => {
  it('runs vite with the local audit contract fallback env', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'build-audit-'))

    try {
      writeFakeVite(projectRoot)

      await expect(
        buildAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'build',
        status: 'pass',
        issues: [],
        summary: 'Build succeeded with no issues',
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
