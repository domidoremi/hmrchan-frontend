import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  buildValidationMarkdownSummary,
  buildValidationSummary,
  classifyValidationChanges,
} from '../../../scripts/lib/validate-release.js'

const execFileSyncMock = vi.hoisted(() => vi.fn())

vi.mock('node:child_process', () => ({
  default: {
    execFileSync: execFileSyncMock,
    spawn: vi.fn(),
  },
  execFileSync: execFileSyncMock,
  spawn: vi.fn(),
}))

async function importValidateReleaseModule() {
  vi.resetModules()
  return import('../../../scripts/validate-release.mjs')
}

function mockGitOutput(resolver: (args: string[]) => string) {
  execFileSyncMock.mockImplementation((command: string, args: string[]) => {
    expect(command).toBe('git')
    return resolver(args)
  })
}

describe('validate release git range resolution', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    execFileSyncMock.mockReset()
  })

  it('uses the explicit validation range without probing git refs', async () => {
    vi.stubEnv('VALIDATION_GIT_RANGE', 'custom-base...HEAD')
    const { resolveGitDiffRange } = await importValidateReleaseModule()

    expect(resolveGitDiffRange('production/next')).toBe('custom-base...HEAD')
    expect(execFileSyncMock).not.toHaveBeenCalled()
  })

  it('uses the current branch upstream before default branch history', async () => {
    mockGitOutput((args) => {
      if (args.join(' ') === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') {
        return 'origin/production/next\n'
      }
      throw new Error(`Unexpected git command: ${args.join(' ')}`)
    })
    const { resolveGitDiffRange } = await importValidateReleaseModule()

    expect(resolveGitDiffRange('production/next')).toBe('origin/production/next...HEAD')
    expect(execFileSyncMock).toHaveBeenCalledTimes(1)
  })

  it('uses a same-named origin branch when no tracking branch is configured', async () => {
    mockGitOutput((args) => {
      const command = args.join(' ')
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') {
        throw new Error('No upstream configured')
      }
      if (command === 'rev-parse --verify origin/production/next^{commit}') {
        return 'af793dae8bac697b94f2384e612ddbca1a037935\n'
      }
      throw new Error(`Unexpected git command: ${command}`)
    })
    const { resolveGitDiffRange } = await importValidateReleaseModule()

    expect(resolveGitDiffRange('production/next')).toBe('origin/production/next...HEAD')
  })

  it('uses origin HEAD when branch-specific refs are unavailable', async () => {
    mockGitOutput((args) => {
      const command = args.join(' ')
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') {
        throw new Error('No upstream configured')
      }
      if (command === 'rev-parse --verify origin/feature/local-only^{commit}') {
        throw new Error('No branch ref')
      }
      if (command === 'symbolic-ref --quiet --short refs/remotes/origin/HEAD') {
        return 'origin/main\n'
      }
      throw new Error(`Unexpected git command: ${command}`)
    })
    const { resolveGitDiffRange } = await importValidateReleaseModule()

    expect(resolveGitDiffRange('feature/local-only')).toBe('origin/main...HEAD')
  })

  it('falls back to the last commit range when remote refs are unavailable', async () => {
    mockGitOutput(() => {
      throw new Error('Git ref unavailable')
    })
    const { resolveGitDiffRange } = await importValidateReleaseModule()

    expect(resolveGitDiffRange('feature/local-only')).toBe('HEAD~1..HEAD')
  })

  it('combines committed range, unstaged, staged, and untracked changed files', async () => {
    mockGitOutput((args) => {
      const command = args.join(' ')
      if (command === 'diff --name-only origin/production/next...HEAD') {
        return 'scripts/validate-release.mjs\nsrc/views/HomePage.vue\n'
      }
      if (command === 'diff --name-only') {
        return 'src/views/HomePage.vue\nsrc/api/client.ts\n'
      }
      if (command === 'diff --cached --name-only') {
        return 'src/stores/auth.ts\n'
      }
      if (command === 'ls-files --others --exclude-standard') {
        return 'src/__tests__/scripts/validate-release.spec.ts\n'
      }
      throw new Error(`Unexpected git command: ${command}`)
    })
    const { resolveChangedFiles } = await importValidateReleaseModule()

    expect(resolveChangedFiles('origin/production/next...HEAD')).toEqual([
      'scripts/validate-release.mjs',
      'src/__tests__/scripts/validate-release.spec.ts',
      'src/api/client.ts',
      'src/stores/auth.ts',
      'src/views/HomePage.vue',
    ])
  })

  it('separates committed range and local worktree changed files', async () => {
    mockGitOutput((args) => {
      const command = args.join(' ')
      if (command === 'diff --name-only origin/production/next...HEAD') {
        return 'scripts/validate-release.mjs\n'
      }
      if (command === 'diff --name-only') {
        return 'src/api/client.ts\n'
      }
      if (command === 'diff --cached --name-only') {
        return 'src/stores/auth.ts\n'
      }
      if (command === 'ls-files --others --exclude-standard') {
        return 'src/__tests__/scripts/validate-release.spec.ts\n'
      }
      throw new Error(`Unexpected git command: ${command}`)
    })
    const { resolveCommittedChangedFiles, resolveLocalChangedFiles } =
      await importValidateReleaseModule()

    expect(resolveCommittedChangedFiles('origin/production/next...HEAD')).toEqual([
      'scripts/validate-release.mjs',
    ])
    expect(resolveLocalChangedFiles()).toEqual([
      'src/__tests__/scripts/validate-release.spec.ts',
      'src/api/client.ts',
      'src/stores/auth.ts',
    ])
  })
})

describe('validate release stage summaries', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    execFileSyncMock.mockReset()
  })

  it('marks skipped stages with the modes that execute the stage', async () => {
    const { buildValidationStageRecords, getValidationStagePlan } =
      await importValidateReleaseModule()

    const records = buildValidationStageRecords({
      stagePlan: getValidationStagePlan('hook'),
      artifactDir: 'output/validation/test-run',
      target: 'https://momichan.xyz',
    })
    const localStaticStage = records.find((stage) => stage.id === 'stage-1-local-static')

    expect(localStaticStage?.selected).toBe(false)
    expect(localStaticStage?.status).toBe('skipped')
    expect(localStaticStage?.reason).toBe('Runs only for prepush-full/local/candidate/production')
  })

  it('renders committed and local worktree changed file sections', async () => {
    const summary = buildValidationSummary({
      mode: 'hook',
      artifactDir: 'output/validation/test-run',
      git: {
        branch: 'production/next',
        commitSha: 'e96e270812ff2f48a9f4efb4d9db1dbd565032c2',
        diffRange: 'origin/production/next...HEAD',
        committedChangedFiles: ['scripts/validate-release.mjs'],
        localChangedFiles: ['src/__tests__/scripts/validate-release.spec.ts'],
      },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: null,
      },
      changeSummary: {
        changedFiles: [
          'scripts/validate-release.mjs',
          'src/__tests__/scripts/validate-release.spec.ts',
        ],
        changedFileCount: 2,
        focusAreas: [],
        labels: [],
        hasValidationContractChanges: false,
        hasEdgeChanges: false,
        hasAuthDataFlowChanges: false,
        hasRouteUiChanges: false,
      },
      stages: [],
    })
    const markdown = buildValidationMarkdownSummary(summary)

    expect(markdown).toContain('### Committed Range')
    expect(markdown).toContain('- scripts/validate-release.mjs')
    expect(markdown).toContain('### Local Worktree')
    expect(markdown).toContain('- src/__tests__/scripts/validate-release.spec.ts')
  })

  it('classifies hooks and package policy as delivery tooling changes', () => {
    const changeSummary = classifyValidationChanges([
      '.husky/commit-msg',
      'package.json',
      'eslint.config.ts',
      'bun.lock',
    ])

    expect(changeSummary.labels).toContain('delivery-tooling')
    expect(changeSummary.hasDeliveryToolingChanges).toBe(true)
    expect(changeSummary.focusAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'delivery-tooling',
          matchedCount: 4,
          matchedPaths: ['.husky/commit-msg', 'bun.lock', 'eslint.config.ts', 'package.json'],
        }),
      ])
    )
  })

  it('classifies release runner tests as validation contract changes', () => {
    const changeSummary = classifyValidationChanges([
      'src/__tests__/scripts/auth-bootstrap.spec.ts',
      'src/__tests__/scripts/security-audit.spec.ts',
      'src/__tests__/scripts/validate-release.spec.ts',
    ])

    expect(changeSummary.labels).toContain('validation-contract')
    expect(changeSummary.hasValidationContractChanges).toBe(true)
    expect(changeSummary.focusAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'validation-contract',
          matchedCount: 3,
          matchedPaths: [
            'src/__tests__/scripts/auth-bootstrap.spec.ts',
            'src/__tests__/scripts/security-audit.spec.ts',
            'src/__tests__/scripts/validate-release.spec.ts',
          ],
        }),
      ])
    )
  })

  it('classifies env files and delivery scripts as delivery tooling changes', () => {
    const changeSummary = classifyValidationChanges([
      '.env.example',
      '.env.development',
      'scripts/build.mjs',
      'scripts/check-build-security.mjs',
      'scripts/audit/security.ts',
    ])

    expect(changeSummary.labels).toContain('delivery-tooling')
    expect(changeSummary.hasDeliveryToolingChanges).toBe(true)
    expect(changeSummary.focusAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'delivery-tooling',
          matchedCount: 5,
          matchedPaths: [
            '.env.development',
            '.env.example',
            'scripts/audit/security.ts',
            'scripts/build.mjs',
            'scripts/check-build-security.mjs',
          ],
        }),
      ])
    )
  })

  it('classifies Cloudflare Pages routing config as edge infrastructure changes', () => {
    const changeSummary = classifyValidationChanges(['public/_headers', 'public/_routes.json'])

    expect(changeSummary.labels).toContain('edge-infra')
    expect(changeSummary.hasEdgeChanges).toBe(true)
    expect(changeSummary.focusAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edge-infra',
          matchedCount: 2,
          matchedPaths: ['public/_headers', 'public/_routes.json'],
        }),
      ])
    )
  })

  it('discovers all script governance specs for the hook static gate', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-hook-script-tests-'))
    const scriptsTestDir = join(projectRoot, 'src', '__tests__', 'scripts')
    await mkdir(scriptsTestDir, { recursive: true })
    await Promise.all([
      writeFile(join(scriptsTestDir, 'security-audit.spec.ts'), ''),
      writeFile(join(scriptsTestDir, 'validate-release.spec.ts'), ''),
      writeFile(join(scriptsTestDir, 'README.md'), ''),
    ])

    try {
      const { resolveHookScriptTests } = await importValidateReleaseModule()

      expect(await resolveHookScriptTests(projectRoot)).toEqual([
        'src/__tests__/scripts/security-audit.spec.ts',
        'src/__tests__/scripts/validate-release.spec.ts',
      ])
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  it('returns no hook script specs when the script test directory is absent', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-hook-script-tests-missing-'))

    try {
      const { resolveHookScriptTests } = await importValidateReleaseModule()

      expect(await resolveHookScriptTests(projectRoot)).toEqual([])
    } finally {
      await rm(projectRoot, { recursive: true, force: true })
    }
  })
})
