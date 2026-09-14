import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('application type-check release gate', () => {
  it.each([
    { status: 0, diagnostic: '', expected: 0 },
    { status: 2, diagnostic: 'src/example.ts(1,1): error TS2322: Invalid type', expected: 2 },
    { status: 1, diagnostic: 'Compiler failed to start', expected: 1 },
  ])('preserves compiler exit status $status', ({ status, diagnostic, expected }) => {
    const root = mkdtempSync(path.join(tmpdir(), 'hmrchan-type-gate-'))
    try {
      mkdirSync(path.join(root, 'scripts'))
      mkdirSync(path.join(root, 'node_modules/vue-tsc/bin'), { recursive: true })
      copyFileSync(
        path.resolve('scripts/check-app-type-budget.mjs'),
        path.join(root, 'scripts/check-app-type-budget.mjs')
      )
      writeFileSync(
        path.join(root, 'node_modules/vue-tsc/bin/vue-tsc.js'),
        `console.error(${JSON.stringify(diagnostic)}); process.exit(${status})`
      )
      const result = spawnSync(process.execPath, ['scripts/check-app-type-budget.mjs'], {
        cwd: root,
        encoding: 'utf8',
      })
      expect(result.status).toBe(expected)
      if (diagnostic) expect(result.stderr).toContain(diagnostic)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
