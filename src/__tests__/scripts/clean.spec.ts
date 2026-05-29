import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

describe('clean script', () => {
  it('dry-run includes ignored local instruction drift and preserves tracked AGENTS.md', () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'hmrchan-clean-'))
    mkdirSync(path.join(projectRoot, 'dist'), { recursive: true })
    writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# local drift\n', 'utf8')
    writeFileSync(path.join(projectRoot, 'AGENTS.md'), '# tracked policy\n', 'utf8')

    const result = spawnSync(process.execPath, [path.resolve('scripts/clean.mjs'), '--dry-run'], {
      cwd: projectRoot,
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('would remove CLAUDE.md')
    expect(result.stdout).toContain('would remove dist')
    expect(result.stdout).not.toContain('AGENTS.md')
    expect(result.stderr).toBe('')
  })
})
