#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFileSync, spawn } from 'node:child_process'

import { createLocalAuditEnv } from './lib/audit-env.js'
import {
  buildAuthBootstrapProbeSummary,
  findFatalAuthBootstrapProbe,
  formatFatalAuthBootstrapProbe,
  getAuthBootstrapProbeDefinitions,
  probeAuthBootstrapEndpoints,
  validateAuthBootstrapContract,
} from './lib/auth-bootstrap.js'
import {
  getProductionContractEnvPolicy,
  resolveProductionContractEnv,
  validateProductionContractEnvPolicy,
} from './lib/production-contract-env.js'
import {
  getReleaseRouteContractOverview,
  validateReleaseRouteContract,
} from './lib/release-route-contract.js'
import {
  buildValidationMarkdownSummary,
  buildValidationStageArtifactDir,
  buildValidationSummary,
  classifyValidationChanges,
  getValidationStagePlan,
  isValidationMode,
  resolveValidationArtifactDir,
} from './lib/validate-release.js'

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function parseArgs(argv) {
  const options = {
    mode: 'candidate',
    help: false,
    artifactDir: process.env.ARTIFACT_DIR?.trim() || '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--mode') {
      const value = argv[index + 1]
      if (!value) {
        throw new Error('Missing value for --mode')
      }
      options.mode = value
      index += 1
      continue
    }
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length)
      continue
    }
    if (arg === '--artifact-dir') {
      const value = argv[index + 1]
      if (!value) {
        throw new Error('Missing value for --artifact-dir')
      }
      options.artifactDir = value
      index += 1
      continue
    }
    if (arg.startsWith('--artifact-dir=')) {
      options.artifactDir = arg.slice('--artifact-dir='.length)
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!isValidationMode(options.mode)) {
    throw new Error(`Unsupported validation mode: ${options.mode}`)
  }

  return options
}

function printHelp() {
  console.log(`Release validation runner

Usage:
  bun run validate:release
  bun run validate:release --mode local
  bun run validate:release --mode candidate
  bun run validate:release --mode production

Options:
  --mode <local|candidate|production>
  --artifact-dir <path>
  --help
`)
}

function readGitOutput(args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return fallback
  }
}

function resolveGitDiffRange(branch) {
  const explicitRange = process.env.VALIDATION_GIT_RANGE?.trim()
  if (explicitRange) {
    return explicitRange
  }

  const upstreamDiff = readGitOutput(['diff', '--name-only', 'origin/main...HEAD'])
  if (upstreamDiff.length > 0) {
    return 'origin/main...HEAD'
  }

  const currentBranch = branch || readGitOutput(['rev-parse', '--abbrev-ref', 'HEAD'], 'HEAD')
  if (currentBranch === 'main' || currentBranch === 'master') {
    return 'HEAD~1..HEAD'
  }

  return 'HEAD~1..HEAD'
}

function resolveChangedFiles(diffRange) {
  const output = readGitOutput(['diff', '--name-only', diffRange])
  if (!output) {
    return []
  }
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function resolveGitContext() {
  const branch = readGitOutput(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown')
  const commitSha = readGitOutput(['rev-parse', 'HEAD'], 'unknown')
  const diffRange = resolveGitDiffRange(branch)
  return {
    branch,
    commitSha,
    diffRange,
    changedFiles: resolveChangedFiles(diffRange),
  }
}

function resolveContractVersion() {
  const explicit =
    process.env.VITE_CLIENT_CONTRACT_VERSION?.trim() ||
    process.env.CLIENT_CONTRACT_VERSION?.trim() ||
    ''
  if (explicit) {
    return explicit
  }

  return resolveProductionContractEnv(process.env).value
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function runCommand(command, env) {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command
    const child = spawn(bin, args, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      shell: false,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
  })
}

function buildStageRecord(stage, artifactDir, target = null) {
  return {
    id: stage.id,
    order: stage.order,
    name: stage.name,
    selected: stage.selected,
    status: stage.selected ? 'pending' : 'skipped',
    reason: stage.selected ? null : `Not required for ${stage.requiredModes.join('/')}`,
    artifactDir,
    target,
    startedAt: null,
    completedAt: null,
    durationMs: 0,
    commands: [],
    details: {},
  }
}

function finalizeStage(stageRecord, patch) {
  const completedAt = new Date().toISOString()
  return {
    ...stageRecord,
    ...patch,
    completedAt,
    durationMs:
      stageRecord.startedAt == null ? 0 : new Date(completedAt).getTime() - new Date(stageRecord.startedAt).getTime(),
  }
}

async function runContractSelfCheckStage(stageRecord) {
  const routeIssues = validateReleaseRouteContract()
  const authBootstrapIssues = validateAuthBootstrapContract()
  const productionEnvIssues = validateProductionContractEnvPolicy()
  const issues = [...routeIssues, ...authBootstrapIssues, ...productionEnvIssues]
  const details = {
    routeOverview: getReleaseRouteContractOverview(),
    authBootstrapProbes: getAuthBootstrapProbeDefinitions(),
    productionEnvPolicy: getProductionContractEnvPolicy(),
    productionContractPreview: resolveProductionContractEnv(process.env),
    issues,
  }

  await writeJson(path.join(stageRecord.artifactDir, 'stage.json'), details)

  if (issues.length > 0) {
    return finalizeStage(stageRecord, {
      status: 'failed',
      reason: issues.map((issue) => issue.message).join(' | '),
      details,
    })
  }

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Route contract, auth bootstrap probes, and production env policy validated.',
    details,
  })
}

async function runStaticGateStage(stageRecord) {
  const env = { ...process.env }
  const commands = [
    ['bun', 'run', 'format:check'],
    ['bun', 'run', 'type-check'],
    ['bun', 'run', 'lint:strict'],
    ['bun', 'run', 'test:unit'],
    ['bun', 'run', 'build'],
    ['bun', 'run', 'build:security-check'],
  ]

  for (const command of commands) {
    await runCommand(command, env)
  }

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Static release gates passed.',
    commands: commands.map((command) => command.join(' ')),
  })
}

async function runLocalBrowserGateStage(stageRecord) {
  const e2eArtifactDir = path.join(stageRecord.artifactDir, 'e2e')
  const healthArtifactDir = path.join(stageRecord.artifactDir, 'frontend-health')
  const env = createLocalAuditEnv(process.env, {
    includeContractFallback: true,
    overrides: {
      E2E_REQUIRE_AUTH: process.env.E2E_REQUIRE_AUTH ?? 'true',
      E2E_ARTIFACT_DIR: e2eArtifactDir,
      FRONTEND_HEALTH_ARTIFACT_DIR: healthArtifactDir,
      FRONTEND_HEALTH_REQUIRE_AUTH: process.env.FRONTEND_HEALTH_REQUIRE_AUTH ?? 'true',
    },
  })
  const commands = [
    ['bun', 'run', 'test:e2e'],
    ['bun', 'run', 'check:frontend'],
  ]

  for (const command of commands) {
    await runCommand(command, env)
  }

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Local browser smoke and frontend health passed.',
    commands: commands.map((command) => command.join(' ')),
    details: {
      e2eArtifactDir,
      frontendHealthArtifactDir: healthArtifactDir,
    },
  })
}

async function runControlledSiteGateStage(stageRecord, controlledBaseUrl) {
  const contractVersion = resolveContractVersion()
  const probes = await probeAuthBootstrapEndpoints(controlledBaseUrl, {
    contractVersion,
  })
  const fatalProbe = findFatalAuthBootstrapProbe(probes)
  const e2eArtifactDir = path.join(stageRecord.artifactDir, 'e2e')
  const healthArtifactDir = path.join(stageRecord.artifactDir, 'frontend-health')
  const details = {
    contractVersion: contractVersion || null,
    probes: probes.map((probe) => ({
      ...probe,
      summary: buildAuthBootstrapProbeSummary(probe),
    })),
    fatalProbe: fatalProbe
      ? {
          ...fatalProbe,
          summary: buildAuthBootstrapProbeSummary(fatalProbe),
        }
      : null,
    e2eArtifactDir,
    frontendHealthArtifactDir: healthArtifactDir,
  }

  if (fatalProbe) {
    await writeJson(path.join(stageRecord.artifactDir, 'stage.json'), details)
    return finalizeStage(stageRecord, {
      status: 'failed',
      reason: formatFatalAuthBootstrapProbe(fatalProbe),
      details,
    })
  }

  const env = {
    ...process.env,
    E2E_BASE_URL: controlledBaseUrl,
    E2E_ARTIFACT_DIR: e2eArtifactDir,
    E2E_REQUIRE_AUTH: 'true',
    LOCAL_AUDIT_AUTO_API_BRIDGE: 'false',
    FRONTEND_HEALTH_BASE_URL: controlledBaseUrl,
    FRONTEND_HEALTH_AUTOSTART: 'false',
    FRONTEND_HEALTH_ARTIFACT_DIR: healthArtifactDir,
    FRONTEND_HEALTH_REQUIRE_AUTH: 'true',
  }
  const commands = [
    ['bun', 'run', 'test:e2e'],
    ['bun', 'run', 'check:frontend'],
  ]

  for (const command of commands) {
    await runCommand(command, env)
  }

  await writeJson(path.join(stageRecord.artifactDir, 'stage.json'), details)
  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Controlled site auth bootstrap probe, route smoke, and frontend health passed.',
    commands: commands.map((command) => command.join(' ')),
    details,
  })
}

async function runProductionPreflightStage(stageRecord, baseUrl) {
  const env = {
    ...process.env,
    BASE_URL: baseUrl,
    ARTIFACT_DIR: stageRecord.artifactDir,
    SECONDARY_EMAIL_MODE: process.env.SECONDARY_EMAIL_MODE?.trim() || 'user-assisted',
  }
  const command = ['bun', 'run', 'test:prod:regression', '--preflight']
  await runCommand(command, env)

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Production preflight passed.',
    commands: [command.join(' ')],
  })
}

async function runProductionRegressionStage(stageRecord, baseUrl) {
  const env = {
    ...process.env,
    BASE_URL: baseUrl,
    ARTIFACT_DIR: stageRecord.artifactDir,
    SECONDARY_EMAIL_MODE: process.env.SECONDARY_EMAIL_MODE?.trim() || 'user-assisted',
  }
  const command = ['node', 'scripts/prod-regression-runner.mjs']
  await runCommand(command, env)

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Production deep regression passed.',
    commands: [command.join(' ')],
  })
}

async function writeValidationArtifacts(summary) {
  await mkdir(path.join(summary.artifactDir, 'stages'), { recursive: true })
  await writeJson(path.join(summary.artifactDir, 'summary.json'), summary)
  await writeFile(
    path.join(summary.artifactDir, 'summary.md'),
    `${buildValidationMarkdownSummary(summary)}\n`,
    'utf8'
  )

  for (const stage of summary.stages) {
    await writeJson(path.join(summary.artifactDir, 'stages', `${stage.id}.json`), stage)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const timestamp = formatTimestamp()
  const artifactDir = resolveValidationArtifactDir({
    artifactDir: options.artifactDir,
    timestamp,
  })
  await mkdir(artifactDir, { recursive: true })

  const git = resolveGitContext()
  const changeSummary = classifyValidationChanges(git.changedFiles)
  const stagePlan = getValidationStagePlan(options.mode)
  const baseUrl = (process.env.BASE_URL?.trim() || 'https://momichan.xyz').replace(/\/$/, '')
  const controlledBaseUrl = process.env.CONTROLLED_BASE_URL?.trim()?.replace(/\/$/, '') || null

  const stageRecords = stagePlan.map((stage) =>
    buildStageRecord(
      stage,
      buildValidationStageArtifactDir(artifactDir, stage.id),
      stage.id === 'stage-3-controlled-site' ? controlledBaseUrl : baseUrl
    )
  )

  for (let index = 0; index < stageRecords.length; index += 1) {
    const stageRecord = stageRecords[index]
    if (!stageRecord.selected) {
      continue
    }

    console.log(`\n=== ${stageRecord.name} (${stageRecord.id}) ===`)
    stageRecords[index] = {
      ...stageRecord,
      startedAt: new Date().toISOString(),
      status: 'running',
    }

    try {
      switch (stageRecord.id) {
        case 'stage-0-contract-self-check':
          stageRecords[index] = await runContractSelfCheckStage(stageRecords[index])
          break
        case 'stage-1-local-static':
          stageRecords[index] = await runStaticGateStage(stageRecords[index])
          break
        case 'stage-2-local-browser':
          stageRecords[index] = await runLocalBrowserGateStage(stageRecords[index])
          break
        case 'stage-3-controlled-site':
          if (!controlledBaseUrl) {
            stageRecords[index] = finalizeStage(stageRecords[index], {
              status: 'failed',
              reason: 'CONTROLLED_BASE_URL is required for candidate and production validation modes.',
            })
            break
          }
          stageRecords[index] = await runControlledSiteGateStage(stageRecords[index], controlledBaseUrl)
          break
        case 'stage-4-production-preflight':
          stageRecords[index] = await runProductionPreflightStage(stageRecords[index], baseUrl)
          break
        case 'stage-5-production-regression':
          stageRecords[index] = await runProductionRegressionStage(stageRecords[index], baseUrl)
          break
        default:
          stageRecords[index] = finalizeStage(stageRecords[index], {
            status: 'failed',
            reason: `Unhandled validation stage: ${stageRecord.id}`,
          })
          break
      }
    } catch (error) {
      stageRecords[index] = finalizeStage(stageRecords[index], {
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    if (stageRecords[index].status === 'failed') {
      break
    }
  }

  const failedStage = stageRecords.find((stage) => stage.selected && stage.status === 'failed')
  if (failedStage) {
    for (let index = 0; index < stageRecords.length; index += 1) {
      const stage = stageRecords[index]
      if (!stage.selected || stage.status !== 'pending') {
        continue
      }
      stageRecords[index] = {
        ...stage,
        status: 'skipped',
        reason: `Blocked by ${failedStage.id}`,
      }
    }
  }

  const summary = buildValidationSummary({
    mode: options.mode,
    artifactDir,
    git: {
      branch: git.branch,
      commitSha: git.commitSha,
      diffRange: git.diffRange,
    },
    targets: {
      baseUrl,
      controlledBaseUrl,
    },
    changeSummary,
    stages: stageRecords,
  })

  await writeValidationArtifacts(summary)

  console.log(`\nValidation summary written to ${path.join(artifactDir, 'summary.md')}`)
  console.log(`Validation status: ${summary.status}`)

  if (summary.status === 'failed') {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Release validation runner crashed:', error)
  process.exit(1)
})
