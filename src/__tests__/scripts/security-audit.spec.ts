import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import securityAudit from '../../../scripts/audit/security'

const REQUIRED_GITIGNORE = [
  'node_modules/',
  'dist/',
  'output/',
  '.wrangler/',
  '.env',
  '.env.local',
  '.env.*.local',
  '.agents/',
  '.claude/',
  '.codex/',
  'CLAUDE.md',
  'docs/',
  'host/',
  'scripts/lib/__tests__/',
  'postman/',
  '.postman/',
].join('\n')

async function createAuditFixture(gitignore: string): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-security-audit-'))
  await mkdir(join(projectRoot, 'src'), { recursive: true })
  await writeFile(join(projectRoot, 'src', 'index.ts'), 'export const ok = true\n')
  await writeFile(
    join(projectRoot, 'vite.config.ts'),
    [
      'export default {',
      '  define: {',
      '    __VUE_PROD_DEVTOOLS__: false,',
      '    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,',
      '  },',
      '}',
      '',
    ].join('\n')
  )
  await writeFile(join(projectRoot, '.gitignore'), `${gitignore}\n`)
  return projectRoot
}

async function runSecurityAudit(projectRoot: string) {
  return securityAudit.run({
    fix: false,
    verbose: false,
    projectRoot,
  })
}

describe('security audit gitignore boundary', () => {
  it('passes when environment, generated output, and local workspace boundaries are ignored', async () => {
    const projectRoot = await createAuditFixture(REQUIRED_GITIGNORE)

    try {
      const result = await runSecurityAudit(projectRoot)

      expect(result.status).toBe('pass')
      expect(result.issues).toEqual([])
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails when local documentation and API client workspaces are not ignored', async () => {
    const projectRoot = await createAuditFixture(
      REQUIRED_GITIGNORE.split('\n')
        .filter((line) => !['docs/', 'postman/', '.postman/'].includes(line))
        .join('\n')
    )

    try {
      const result = await runSecurityAudit(projectRoot)

      expect(result.status).toBe('fail')
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'gitignore-local-boundary',
            message: expect.stringContaining('docs/'),
          }),
          expect.objectContaining({
            rule: 'gitignore-local-boundary',
            message: expect.stringContaining('postman/'),
          }),
          expect.objectContaining({
            rule: 'gitignore-local-boundary',
            message: expect.stringContaining('.postman/'),
          }),
        ])
      )
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })
})
