import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})
