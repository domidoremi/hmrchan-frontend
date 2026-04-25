import { describe, expect, it } from 'vitest'

import {
  buildValidationSummary,
  classifyValidationChanges,
  getValidationStagePlan,
  resolveValidationArtifactDir,
} from '../../../scripts/lib/validate-release.js'

describe('validate release helpers', () => {
  it('builds the expected stage plan for each validation mode', () => {
    const localPlan = getValidationStagePlan('local')
    const candidatePlan = getValidationStagePlan('candidate')
    const productionPlan = getValidationStagePlan('production')

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

  it('marks non-production validation as incomplete and production validation as passed', () => {
    const commonStages = [
      {
        id: 'stage-0-contract-self-check',
        order: 0,
        name: '合同自检',
        selected: true,
        status: 'passed',
        reason: null,
      },
      {
        id: 'stage-1-local-static',
        order: 1,
        name: '本地静态门禁',
        selected: true,
        status: 'passed',
        reason: null,
      },
    ]

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
      stages: commonStages,
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
      stages: commonStages,
    })

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
})
