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

async function importReleaseEvidenceModule() {
  vi.resetModules()
  return import('../../../scripts/release-evidence.mjs')
}

function makeValidationSummary(
  mode: string,
  stages = [{ id: 'stage-0-hook-static', selected: true, status: 'passed' }]
) {
  return buildValidationSummary({
    mode,
    artifactDir: 'output/validation/test-run',
    git: {
      branch: 'production/next',
      commitSha: 'e96e270812ff2f48a9f4efb4d9db1dbd565032c2',
      diffRange: 'origin/production/next...HEAD',
      committedChangedFiles: [],
      localChangedFiles: [],
    },
    targets: {
      baseUrl: 'https://momichan.com',
      controlledBaseUrl: null,
    },
    changeSummary: {
      changedFiles: [],
      changedFileCount: 0,
      focusAreas: [],
      labels: [],
      hasValidationContractChanges: false,
      hasEdgeChanges: false,
      hasPwaRuntimeChanges: false,
      hasI18nSeoChanges: false,
      hasAuthDataFlowChanges: false,
      hasRouteUiChanges: false,
      hasDeliveryToolingChanges: false,
    },
    stages,
  })
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

describe('validate release command budgets', () => {
  it('allows the full frontend health matrix to exceed three minutes', async () => {
    const { DEFAULT_BROWSER_GATE_COMMAND_TIMEOUT_MS } = await importValidateReleaseModule()

    expect(DEFAULT_BROWSER_GATE_COMMAND_TIMEOUT_MS).toBe(6 * 60 * 1000)
  })
})

describe('release evidence command policy', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    execFileSyncMock.mockReset()
  })

  it('fails fast when candidate evidence lacks a controlled site target', async () => {
    const { resolveReleaseEvidenceCommand, runReleaseEvidence } =
      await importReleaseEvidenceModule()
    const spawnProcess = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      expect(resolveReleaseEvidenceCommand({ CONTROLLED_BASE_URL: '' })).toEqual(
        expect.objectContaining({
          ok: false,
          code: 'missing-controlled-base-url',
          command: null,
        })
      )
      expect(runReleaseEvidence({ env: {}, spawnProcess })).toBe(1)
      expect(spawnProcess).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CONTROLLED_BASE_URL is required')
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('runs candidate validation when controlled site evidence is configured', async () => {
    const { resolveReleaseEvidenceCommand, runReleaseEvidence } =
      await importReleaseEvidenceModule()
    const child = {
      on: vi.fn().mockReturnThis(),
    }
    const spawnProcess = vi.fn(() => child)
    const env = { CONTROLLED_BASE_URL: 'https://controlled.example.com' }

    expect(resolveReleaseEvidenceCommand(env)).toEqual(
      expect.objectContaining({
        ok: true,
        command: ['node', 'scripts/validate-release.mjs', '--mode', 'candidate'],
      })
    )
    expect(
      runReleaseEvidence({
        env,
        cwd: '/workspace/frontend',
        spawnProcess: spawnProcess as unknown as (typeof import('node:child_process'))['spawn'],
      })
    ).toBe(0)
    expect(spawnProcess).toHaveBeenCalledWith(
      'node',
      ['scripts/validate-release.mjs', '--mode', 'candidate'],
      expect.objectContaining({
        cwd: '/workspace/frontend',
        env,
        stdio: 'inherit',
        shell: false,
      })
    )
    expect(child.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(child.on).toHaveBeenCalledWith('close', expect.any(Function))
  })
})

describe('validate release stage summaries', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    execFileSyncMock.mockReset()
  })

  it('marks complete local gate modes as passed when selected stages pass', () => {
    for (const mode of ['hook', 'prepush', 'prepush-full', 'local', 'production']) {
      const summary = makeValidationSummary(mode)

      expect(summary.status).toBe('passed')
      expect(summary.blockingStageId).toBeNull()
      expect(summary.blockingReason).toBeNull()
      expect(summary.selectedStageCount).toBe(1)
      expect(summary.completedStageCount).toBe(1)
    }
  })

  it('keeps candidate mode incomplete until controlled-site evidence runs', () => {
    const summary = makeValidationSummary('candidate')

    expect(summary.status).toBe('incomplete')
    expect(summary.blockingStageId).toBeNull()
    expect(summary.blockingReason).toBe(
      'Production deep regression did not run in this validation mode.'
    )
  })

  it('marks selected failed, skipped, and unresolved stages as failed with blocking evidence', () => {
    const blockingCases = [
      {
        stage: {
          id: 'stage-failed',
          selected: true,
          status: 'failed',
          reason: 'Command exited 1.',
        },
        blockingReason: 'Command exited 1.',
      },
      {
        stage: { id: 'stage-skipped', selected: true, status: 'skipped' },
        blockingReason: 'Selected release stage was skipped unexpectedly.',
      },
      {
        stage: { id: 'stage-pending', selected: true, status: 'pending' },
        blockingReason: 'Selected release stage did not complete.',
      },
    ]

    for (const { stage, blockingReason } of blockingCases) {
      const summary = makeValidationSummary('production', [stage])

      expect(summary.status).toBe('failed')
      expect(summary.blockingStageId).toBe(stage.id)
      expect(summary.blockingReason).toBe(blockingReason)
      expect(summary.completedStageCount).toBe(0)
    }
  })

  it('marks skipped stages with the modes that execute the stage', async () => {
    const { buildValidationStageRecords, getValidationStagePlan } =
      await importValidateReleaseModule()

    const records = buildValidationStageRecords({
      stagePlan: getValidationStagePlan('hook'),
      artifactDir: 'output/validation/test-run',
      target: 'https://momichan.com',
    })
    const localStaticStage = records.find(
      (stage: { id: string }) => stage.id === 'stage-1-local-static'
    )

    expect(localStaticStage?.selected).toBe(false)
    expect(localStaticStage?.status).toBe('skipped')
    expect(localStaticStage?.reason).toBe('Runs only for prepush-full/local/candidate/production')
  })

  it('summarizes validation env artifacts without writing secret values', async () => {
    const { buildProductionContractPreviewArtifact } = await importValidateReleaseModule()
    const preview = buildProductionContractPreviewArtifact({
      injected: false,
      source: 'explicit',
      value: 'contract-secret-sha',
      env: {
        CLOUDFLARE_API_TOKEN: 'cf-token-secret',
        PRIMARY_PASSWORD: 'password-secret',
        VITE_ENABLE_DEBUG: 'false',
      },
      sanitized: {
        env: {
          CLOUDFLARE_API_TOKEN: 'cf-token-secret',
          PRIMARY_PASSWORD: 'password-secret',
          VITE_ENABLE_DEBUG: 'false',
        },
        strippedKeys: ['VITE_API_BASE_URL'],
        forcedKeys: ['VITE_ENABLE_DEBUG'],
      },
    })
    const serialized = JSON.stringify(preview)

    expect(serialized).not.toContain('cf-token-secret')
    expect(serialized).not.toContain('password-secret')
    expect(serialized).not.toContain('contract-secret-sha')
    expect(preview.value).toEqual({
      present: true,
      length: 'contract-secret-sha'.length,
    })
    expect(preview.env.sensitiveKeys).toEqual(['CLOUDFLARE_API_TOKEN', 'PRIMARY_PASSWORD'])
    expect(preview.env.values['CLOUDFLARE_API_TOKEN']).toEqual({
      present: true,
      length: 'cf-token-secret'.length,
      risk: 'sensitive',
    })
    expect(preview.env.values['VITE_ENABLE_DEBUG']).toEqual({
      present: true,
      length: 'false'.length,
      risk: 'standard',
    })
    expect(preview.sanitized.strippedKeys).toEqual(['VITE_API_BASE_URL'])
    expect(preview.sanitized.forcedKeys).toEqual(['VITE_ENABLE_DEBUG'])
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
        baseUrl: 'https://momichan.com',
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

  it('classifies service worker, manifest, and install assets as PWA runtime changes', () => {
    const changeSummary = classifyValidationChanges([
      'src/sw/index.ts',
      'src/sw/publicCachePolicy.ts',
      'src/sw/__tests__/publicCachePolicy.spec.ts',
      'src/utils/cache/config.ts',
      'src/utils/cache/publicContentCache.ts',
      'src/utils/cache/serviceWorkerRegistration.ts',
      'public/manifest.json',
      'public/icons/sitting-192.webp',
      'public/icons/apple-touch-icon-180x180.png',
      'public/favicon.ico',
      'build/vite/swCacheVersion.ts',
      'build/vite/plugins/serviceWorkerBuild.ts',
    ])

    expect(changeSummary.labels).toContain('pwa-runtime')
    expect(changeSummary.hasPwaRuntimeChanges).toBe(true)
    expect(changeSummary.focusAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'pwa-runtime',
          matchedCount: 12,
          matchedPaths: [
            'build/vite/plugins/serviceWorkerBuild.ts',
            'build/vite/swCacheVersion.ts',
            'public/favicon.ico',
            'public/icons/apple-touch-icon-180x180.png',
            'public/icons/sitting-192.webp',
            'public/manifest.json',
            'src/sw/__tests__/publicCachePolicy.spec.ts',
            'src/sw/index.ts',
          ],
        }),
      ])
    )
  })

  it('classifies locale contract and static SEO document changes', () => {
    const changeSummary = classifyValidationChanges([
      'src/i18n/index.ts',
      'src/i18n/locales.ts',
      'index.html',
      'public/offline.html',
      'public/sitemap.xml',
    ])

    expect(changeSummary.labels).toContain('i18n-seo')
    expect(changeSummary.hasI18nSeoChanges).toBe(true)
    expect(changeSummary.focusAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'i18n-seo',
          matchedCount: 5,
          matchedPaths: [
            'index.html',
            'public/offline.html',
            'public/sitemap.xml',
            'src/i18n/index.ts',
            'src/i18n/locales.ts',
          ],
        }),
      ])
    )
  })

  it('runs full static unit validation with a single Vitest worker', async () => {
    const { buildStaticGateCommands } = await importValidateReleaseModule()

    expect(buildStaticGateCommands()).toContainEqual([
      'bun',
      'run',
      'test:unit',
      '--',
      '--maxWorkers=1',
    ])
  })

  it('runs hook governance specs with a single Vitest worker', async () => {
    const { buildHookStaticGateCommands } = await importValidateReleaseModule()

    expect(
      buildHookStaticGateCommands([
        'src/__tests__/scripts/pwa-audit.spec.ts',
        'src/sw/__tests__/publicCachePolicy.spec.ts',
      ])
    ).toContainEqual([
      'node',
      'scripts/run-vitest.mjs',
      'run',
      'src/__tests__/scripts/pwa-audit.spec.ts',
      'src/sw/__tests__/publicCachePolicy.spec.ts',
      '--reporter=default',
      '--maxWorkers=1',
    ])
  })

  it('discovers all lightweight governance specs for the hook static gate', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'hmr-hook-script-tests-'))
    const scriptsTestDir = join(projectRoot, 'src', '__tests__', 'scripts')
    const swTestDir = join(projectRoot, 'src', 'sw', '__tests__')
    const publicCacheTestDir = join(projectRoot, 'src', 'utils', 'cache', '__tests__')
    await Promise.all([
      mkdir(scriptsTestDir, { recursive: true }),
      mkdir(swTestDir, { recursive: true }),
      mkdir(publicCacheTestDir, { recursive: true }),
    ])
    await Promise.all([
      writeFile(join(scriptsTestDir, 'i18n-audit.spec.ts'), ''),
      writeFile(join(scriptsTestDir, 'pwa-audit.spec.ts'), ''),
      writeFile(join(scriptsTestDir, 'security-audit.spec.ts'), ''),
      writeFile(join(scriptsTestDir, 'validate-release.spec.ts'), ''),
      writeFile(join(scriptsTestDir, 'README.md'), ''),
      writeFile(join(swTestDir, 'index.spec.ts'), ''),
      writeFile(join(swTestDir, 'publicCachePolicy.spec.ts'), ''),
      writeFile(join(publicCacheTestDir, 'publicContentCache.spec.ts'), ''),
    ])

    try {
      const { resolveHookScriptTests } = await importValidateReleaseModule()

      expect(await resolveHookScriptTests(projectRoot)).toEqual([
        'src/__tests__/scripts/i18n-audit.spec.ts',
        'src/__tests__/scripts/pwa-audit.spec.ts',
        'src/__tests__/scripts/security-audit.spec.ts',
        'src/__tests__/scripts/validate-release.spec.ts',
        'src/sw/__tests__/index.spec.ts',
        'src/sw/__tests__/publicCachePolicy.spec.ts',
        'src/utils/cache/__tests__/publicContentCache.spec.ts',
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
