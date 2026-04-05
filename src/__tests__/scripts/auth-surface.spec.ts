import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { searchTrackedFiles } from '../../../scripts/audit/auth-surface'

const legacyCopy = ['统一', '登录'].join('')
const legacyHost = ['auth', '.momichan.xyz'].join('')
const legacyBrand = ['Auth', 'entik'].join('')

describe('auth-surface audit', () => {
  it('falls back to node-based scanning when rg is unavailable', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'auth-surface-audit-'))
    mkdirSync(join(projectRoot, 'src'), { recursive: true })
    writeFileSync(
      join(projectRoot, 'src', 'copy.ts'),
      `export const legacy = "${legacyCopy}";\nexport const host = "${legacyHost}";\n`,
      'utf8'
    )
    mkdirSync(join(projectRoot, 'dist'), { recursive: true })
    writeFileSync(join(projectRoot, 'dist', 'ignored.txt'), legacyBrand, 'utf8')
    mkdirSync(join(projectRoot, 'docs', 'backend-handoff'), { recursive: true })
    writeFileSync(
      join(projectRoot, 'docs', 'backend-handoff', 'handoff.md'),
      `- 已退役术语：${legacyBrand}`,
      'utf8'
    )

    const fallbackOutput = await searchTrackedFiles(
      projectRoot,
      [legacyCopy, legacyHost, legacyBrand],
      async () => {
        throw new Error('Executable not found in $PATH: "rg"')
      }
    )

    expect(fallbackOutput).toContain(`src/copy.ts:1:export const legacy = "${legacyCopy}";`)
    expect(fallbackOutput).toContain(`src/copy.ts:2:export const host = "${legacyHost}";`)
    expect(fallbackOutput).not.toContain('dist/ignored.txt')
    expect(fallbackOutput).not.toContain('docs/backend-handoff/handoff.md')
  })
})
