import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildValidationSummary,
  classifyValidationChanges,
  getValidationStagePlan,
  resolveValidationArtifactDir,
} from '../../../scripts/lib/validate-release.js'
import {
  ARTIFACT_PRESENT_VALUE,
  ARTIFACT_REDACTED_VALUE,
  sanitizeValidationArtifact,
} from '../../../scripts/lib/validation-artifact-sanitizer.js'

describe('validate release helpers', () => {
  it('runs maintainability, text style, and frontend pattern checks in release static gates', () => {
    const script = readFileSync(path.join(process.cwd(), 'scripts/validate-release.mjs'), 'utf8')
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
    const localStaticStage = script.match(
      /async function runStaticGateStage[\s\S]*?const commandResults/
    )?.[0]
    const hookStaticStage = script.match(
      /async function runHookStaticGateStage[\s\S]*?const commandResults/
    )?.[0]
    const complexityCommand = "['bun', 'run', 'check:complexity-budget']"
    const textStyleCommand = "['bun', 'run', 'audit:repo', '--only=text-style']"
    const frontendPatternCommand = "['bun', 'run', 'audit:repo', '--only=frontend-patterns']"

    expect(packageJson.scripts['test:unit']).not.toContain('--passWithNoTests')
    expect(localStaticStage).toContain(complexityCommand)
    expect(localStaticStage).toContain(textStyleCommand)
    expect(localStaticStage).toContain(frontendPatternCommand)
    expect(hookStaticStage).toContain(complexityCommand)
    expect(hookStaticStage).toContain(textStyleCommand)
    expect(hookStaticStage).toContain(frontendPatternCommand)
    expect(localStaticStage?.indexOf("['bun', 'run', 'test:unit']")).toBeLessThan(
      localStaticStage?.indexOf(complexityCommand) ?? -1
    )
    expect(localStaticStage?.indexOf(complexityCommand)).toBeLessThan(
      localStaticStage?.indexOf(textStyleCommand) ?? -1
    )
    expect(localStaticStage?.indexOf(textStyleCommand)).toBeLessThan(
      localStaticStage?.indexOf(frontendPatternCommand) ?? -1
    )
    expect(localStaticStage?.indexOf(frontendPatternCommand)).toBeLessThan(
      localStaticStage?.indexOf("['bun', 'run', 'build']") ?? -1
    )
  })

  it('includes worktree files in release change evidence', () => {
    const script = readFileSync(path.join(process.cwd(), 'scripts/validate-release.mjs'), 'utf8')
    const resolver = script.match(/function resolveChangedFiles[\s\S]*?^}/m)?.[0]

    expect(resolver).toContain("readGitOutput(['diff', '--name-only', diffRange])")
    expect(resolver).toContain("readGitOutput(['diff', '--name-only', '--staged'])")
    expect(resolver).toContain("readGitOutput(['diff', '--name-only'])")
    expect(resolver).toContain("readGitOutput(['ls-files', '--others', '--exclude-standard'])")
    expect(resolver).toContain('new Set')
  })

  it('builds the expected stage plan for each validation mode', () => {
    const hookPlan = getValidationStagePlan('hook')
    const prepushPlan = getValidationStagePlan('prepush')
    const prepushFullPlan = getValidationStagePlan('prepush-full')
    const localPlan = getValidationStagePlan('local')
    const candidatePlan = getValidationStagePlan('candidate')
    const productionPlan = getValidationStagePlan('production')

    expect(hookPlan.filter((stage) => stage.selected).map((stage) => stage.id)).toEqual([
      'stage-0-contract-self-check',
      'stage-1-hook-static',
    ])
    expect(prepushPlan.filter((stage) => stage.selected).map((stage) => stage.id)).toEqual([
      'stage-0-contract-self-check',
      'stage-1-hook-static',
    ])
    expect(prepushFullPlan.filter((stage) => stage.selected).map((stage) => stage.id)).toEqual([
      'stage-0-contract-self-check',
      'stage-1-local-static',
    ])
    expect(localPlan.filter((stage) => stage.selected).map((stage) => stage.id)).toEqual([
      'stage-0-contract-self-check',
      'stage-1-local-static',
      'stage-2-local-browser',
    ])
    expect(candidatePlan.filter((stage) => stage.selected).map((stage) => stage.id)).toEqual([
      'stage-0-contract-self-check',
      'stage-1-local-static',
      'stage-2-local-browser',
      'stage-3-controlled-site',
      'stage-4-production-preflight',
    ])
    expect(productionPlan.filter((stage) => stage.selected).map((stage) => stage.id)).toEqual([
      'stage-0-contract-self-check',
      'stage-1-local-static',
      'stage-2-local-browser',
      'stage-3-controlled-site',
      'stage-4-production-preflight',
      'stage-5-production-regression',
    ])
  })

  it('classifies changed files into release focus areas', () => {
    const summary = classifyValidationChanges([
      'src/views/HomePage.vue',
      'src/api/authService.ts',
      'workers/internal-api/index.ts',
      'scripts/lib/release-route-contract.js',
    ])

    expect(summary.labels).toEqual(
      expect.arrayContaining(['route-ui', 'auth-data-flow', 'edge-infra', 'validation-contract'])
    )
    expect(summary.hasRouteUiChanges).toBe(true)
    expect(summary.hasAuthDataFlowChanges).toBe(true)
    expect(summary.hasEdgeChanges).toBe(true)
    expect(summary.hasValidationContractChanges).toBe(true)
  })

  it('marks hook, prepush-full, and production validation as passed when selected stages pass', () => {
    const hookStages = [
      {
        id: 'stage-0-contract-self-check',
        order: 0,
        name: '合同自检',
        selected: true,
        status: 'passed',
        reason: null,
      },
      {
        id: 'stage-1-hook-static',
        order: 1,
        name: 'Hook 中负载静态门禁',
        selected: true,
        status: 'passed',
        reason: null,
      },
    ]
    const fullStaticStages = [
      hookStages[0],
      {
        id: 'stage-1-local-static',
        order: 2,
        name: '完整本地静态门禁',
        selected: true,
        status: 'passed',
        reason: null,
      },
    ]

    const hookSummary = buildValidationSummary({
      mode: 'hook',
      artifactDir: '/tmp/validation-hook',
      git: {
        branch: 'feature/demo',
        commitSha: 'abc123',
        diffRange: 'origin/main...HEAD',
      },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: null,
      },
      changeSummary: classifyValidationChanges([]),
      stages: hookStages,
    })
    const prepushFullSummary = buildValidationSummary({
      mode: 'prepush-full',
      artifactDir: '/tmp/validation-prepush-full',
      git: {
        branch: 'feature/demo',
        commitSha: 'abc123',
        diffRange: 'origin/main...HEAD',
      },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: null,
      },
      changeSummary: classifyValidationChanges([]),
      stages: fullStaticStages,
    })
    const candidateSummary = buildValidationSummary({
      mode: 'candidate',
      artifactDir: '/tmp/validation-candidate',
      git: {
        branch: 'feature/demo',
        commitSha: 'abc123',
        diffRange: 'origin/main...HEAD',
      },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: 'https://controlled.example.com',
      },
      changeSummary: classifyValidationChanges([]),
      stages: fullStaticStages,
    })
    const productionSummary = buildValidationSummary({
      mode: 'production',
      artifactDir: '/tmp/validation-production',
      git: {
        branch: 'main',
        commitSha: 'def456',
        diffRange: 'HEAD~1..HEAD',
      },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: 'https://controlled.example.com',
      },
      changeSummary: classifyValidationChanges([]),
      stages: fullStaticStages,
    })

    expect(hookSummary.status).toBe('passed')
    expect(hookSummary.blockingReason).toBeNull()
    expect(prepushFullSummary.status).toBe('passed')
    expect(prepushFullSummary.blockingReason).toBeNull()
    expect(candidateSummary.status).toBe('incomplete')
    expect(candidateSummary.blockingReason).toContain('Production deep regression')
    expect(productionSummary.status).toBe('passed')
    expect(productionSummary.blockingReason).toBeNull()
  })

  it('fails validation when a selected stage fails or is skipped unexpectedly', () => {
    const failedSummary = buildValidationSummary({
      mode: 'production',
      artifactDir: '/tmp/validation',
      git: { branch: 'main', commitSha: 'sha', diffRange: 'HEAD~1..HEAD' },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: 'https://controlled.example.com',
      },
      changeSummary: classifyValidationChanges([]),
      stages: [
        {
          id: 'stage-3-controlled-site',
          order: 3,
          name: '受控站点门禁',
          selected: true,
          status: 'failed',
          reason: 'controlled site failed',
        },
      ],
    })

    expect(failedSummary.status).toBe('failed')
    expect(failedSummary.blockingStageId).toBe('stage-3-controlled-site')
  })

  it('resolves the default artifact directory under output/validation', () => {
    const artifactDir = resolveValidationArtifactDir({
      artifactDir: '',
      timestamp: '20260420-010203',
    })

    expect(artifactDir.replace(/\\/g, '/')).toContain('/output/validation/20260420-010203')
  })

  it('marks unresolved running stages as blocking failures', () => {
    const summary = buildValidationSummary({
      mode: 'local',
      artifactDir: '/tmp/validation',
      git: { branch: 'main', commitSha: 'sha', diffRange: 'HEAD~1..HEAD' },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: null,
      },
      changeSummary: classifyValidationChanges([]),
      stages: [
        {
          id: 'stage-2-local-browser',
          order: 2,
          name: '本地浏览器门禁',
          selected: true,
          status: 'running',
          reason: null,
        },
      ],
    })

    expect(summary.status).toBe('failed')
    expect(summary.blockingStageId).toBe('stage-2-local-browser')
    expect(summary.blockingReason).toContain('did not complete')
  })

  it('redacts sensitive values from release validation artifacts', () => {
    const summary = buildValidationSummary({
      mode: 'hook',
      artifactDir: '/tmp/validation',
      git: { branch: 'main', commitSha: 'sha', diffRange: 'HEAD~1..HEAD' },
      targets: {
        baseUrl: 'https://momichan.xyz',
        controlledBaseUrl: null,
      },
      changeSummary: classifyValidationChanges([]),
      stages: [
        {
          id: 'stage-0-contract-self-check',
          order: 0,
          name: '合同自检',
          selected: true,
          status: 'passed',
          reason: null,
          details: {
            productionContractPreview: {
              env: {
                VITE_PUBLIC_LABEL: 'visible-public-value',
                API_TOKEN: 'real-token-value',
                primary_password: 'real-password-value',
                COOKIE: 'real-cookie-value',
              },
              nested: {
                apiKey: 'real-api-key',
                children: [{ refreshToken: 'real-refresh-token' }],
              },
            },
          },
        },
      ],
    })

    const sanitized = sanitizeValidationArtifact(summary) as typeof summary
    const serialized = JSON.stringify(sanitized)
    const envPreview = sanitized.stages[0]?.details.productionContractPreview.env

    expect(serialized).not.toContain('real-token-value')
    expect(serialized).not.toContain('real-password-value')
    expect(serialized).not.toContain('real-cookie-value')
    expect(serialized).not.toContain('real-api-key')
    expect(serialized).not.toContain('real-refresh-token')
    expect(envPreview.VITE_PUBLIC_LABEL).toMatchObject({
      present: true,
      sensitive: false,
      value: ARTIFACT_PRESENT_VALUE,
    })
    expect(envPreview.API_TOKEN).toMatchObject({
      present: true,
      sensitive: true,
      value: ARTIFACT_REDACTED_VALUE,
    })
    expect(sanitized.stages[0]?.details.productionContractPreview.nested.apiKey).toBe(
      ARTIFACT_REDACTED_VALUE
    )
    expect(
      sanitized.stages[0]?.details.productionContractPreview.nested.children[0].refreshToken
    ).toBe(ARTIFACT_REDACTED_VALUE)
  })
})
