#!/usr/bin/env node

import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

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
import { validateFrontendContractAudit } from './lib/frontend-contract-audit.js'
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
import { CommandRunError, runCommand } from './lib/command-runner.js'

const STATIC_GATE_COMMAND_TIMEOUT_MS = Number(
  process.env.VALIDATION_STATIC_COMMAND_TIMEOUT_MS ?? 10 * 60 * 1000
)
const BROWSER_GATE_COMMAND_TIMEOUT_MS = Number(
  process.env.VALIDATION_BROWSER_COMMAND_TIMEOUT_MS ?? 3 * 60 * 1000
)

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
    mode: 'local',
    help: false,
    artifactDir: process.env.ARTIFACT_DIR?.trim() || '',
    quiet: process.env.VALIDATION_QUIET === '1',
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
    if (arg === '--quiet') {
      options.quiet = true
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
  bun run validate:release --mode hook
  bun run validate:release --mode prepush
  bun run validate:release --mode prepush-full
  bun run validate:release --mode local
  bun run validate:release --mode candidate
  bun run validate:release --mode production

Options:
  --mode <hook|prepush|prepush-full|local|candidate|production>
  --artifact-dir <path>
  --quiet              capture child command output to artifacts and print stage summaries only
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

function resolveTrackingDiffRange() {
  const upstream = readGitOutput(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
  if (!upstream) {
    return ''
  }

  return `${upstream}...HEAD`
}

function resolveRemoteBranchDiffRange(branch) {
  if (!branch || branch === 'HEAD') {
    return ''
  }

  const remoteBranch = `origin/${branch}`
  const remoteBranchRef = readGitOutput(['rev-parse', '--verify', `${remoteBranch}^{commit}`])
  if (!remoteBranchRef) {
    return ''
  }

  return `${remoteBranch}...HEAD`
}

function resolveOriginHeadDiffRange() {
  const originHead = readGitOutput([
    'symbolic-ref',
    '--quiet',
    '--short',
    'refs/remotes/origin/HEAD',
  ])
  if (!originHead) {
    return ''
  }

  return `${originHead}...HEAD`
}

function resolveGitDiffRange(branch) {
  const explicitRange = process.env.VALIDATION_GIT_RANGE?.trim()
  if (explicitRange) {
    return explicitRange
  }

  const currentBranch = branch || readGitOutput(['rev-parse', '--abbrev-ref', 'HEAD'], 'HEAD')
  const resolvedRange =
    resolveTrackingDiffRange() ||
    resolveRemoteBranchDiffRange(currentBranch) ||
    resolveOriginHeadDiffRange()

  return resolvedRange || 'HEAD~1..HEAD'
}

function resolveChangedFiles(diffRange) {
  const outputs = [
    resolveCommittedChangedFiles(diffRange).join('\n'),
    resolveLocalChangedFiles().join('\n'),
  ]

  return [
    ...new Set(
      outputs
        .flatMap((output) => output.split(/\r?\n/))
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  ].sort()
}

function resolveCommittedChangedFiles(diffRange) {
  const output = readGitOutput(['diff', '--name-only', diffRange])
  if (!output) {
    return []
  }
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function resolveLocalChangedFiles() {
  const outputs = [
    readGitOutput(['diff', '--name-only']),
    readGitOutput(['diff', '--cached', '--name-only']),
    readGitOutput(['ls-files', '--others', '--exclude-standard']),
  ]

  return [
    ...new Set(
      outputs
        .flatMap((output) => output.split(/\r?\n/))
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  ].sort()
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
    committedChangedFiles: resolveCommittedChangedFiles(diffRange),
    localChangedFiles: resolveLocalChangedFiles(),
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

function slugifyCommand(command) {
  return command
    .join('-')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function buildCommandArtifactDir(stageRecord, command, index) {
  return path.join(
    stageRecord.artifactDir,
    'commands',
    `${String(index + 1).padStart(2, '0')}-${slugifyCommand(command)}`
  )
}

async function runStageCommands(stageRecord, commands, env, options = {}) {
  const results = []
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index]
    const artifactDir = buildCommandArtifactDir(stageRecord, command, index)
    if (options.quiet) {
      console.log(`  → ${command.join(' ')} (artifacts: ${artifactDir})`)
    }
    try {
      const result = await runCommand(command, {
        env,
        timeoutMs: options.timeoutMs,
        artifactDir,
        stdio: options.quiet ? 'pipe' : 'inherit',
      })
      results.push({
        command: command.join(' '),
        status: result.status,
        artifactDir,
      })
    } catch (error) {
      const result = {
        command: command.join(' '),
        status: error instanceof CommandRunError ? error.status : 'failed',
        reason: error instanceof Error ? error.message : String(error),
        artifactDir,
        timedOut: error instanceof CommandRunError ? error.timedOut : false,
        exitCode: error instanceof CommandRunError ? error.exitCode : null,
        signal: error instanceof CommandRunError ? error.signal : null,
      }
      results.push(result)
      const stageError = new Error(result.reason)
      stageError.commandResult = result
      stageError.commandResults = results
      throw stageError
    }
  }
  return results
}

function buildStageRecord(stage, artifactDir, target = null) {
  return {
    id: stage.id,
    order: stage.order,
    name: stage.name,
    selected: stage.selected,
    status: stage.selected ? 'pending' : 'skipped',
    reason: stage.selected ? null : `Runs only for ${stage.requiredModes.join('/')}`,
    artifactDir,
    target,
    startedAt: null,
    completedAt: null,
    durationMs: 0,
    commands: [],
    details: {},
  }
}

function buildValidationStageRecords({
  stagePlan,
  artifactDir,
  target,
  controlledTarget = null,
  quiet = false,
}) {
  return stagePlan.map((stage) => ({
    ...buildStageRecord(
      stage,
      buildValidationStageArtifactDir(artifactDir, stage.id),
      stage.id === 'stage-3-controlled-site' ? controlledTarget : target
    ),
    quiet,
  }))
}

function finalizeStage(stageRecord, patch) {
  const completedAt = new Date().toISOString()
  return {
    ...stageRecord,
    ...patch,
    completedAt,
    durationMs:
      stageRecord.startedAt == null
        ? 0
        : new Date(completedAt).getTime() - new Date(stageRecord.startedAt).getTime(),
  }
}

async function runContractSelfCheckStage(stageRecord) {
  const routeIssues = validateReleaseRouteContract()
  const authBootstrapIssues = validateAuthBootstrapContract()
  const productionEnvIssues = validateProductionContractEnvPolicy()
  const frontendContractIssues = validateFrontendContractAudit(process.cwd())
  const issues = [
    ...routeIssues,
    ...authBootstrapIssues,
    ...productionEnvIssues,
    ...frontendContractIssues,
  ]
  const details = {
    routeOverview: getReleaseRouteContractOverview(),
    authBootstrapProbes: getAuthBootstrapProbeDefinitions(),
    productionEnvPolicy: getProductionContractEnvPolicy(),
    productionContractPreview: resolveProductionContractEnv(process.env),
    frontendContractAudit: frontendContractIssues,
    issues,
  }

  await writeJson(path.join(stageRecord.artifactDir, 'stage.json'), details)

  const blockingIssues = issues.filter((issue) => issue.severity !== 'warning')
  if (blockingIssues.length > 0) {
    return finalizeStage(stageRecord, {
      status: 'failed',
      reason: blockingIssues.map((issue) => issue.message).join(' | '),
      details,
    })
  }

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason:
      issues.length > 0
        ? 'Route contract, auth bootstrap probes, and production env policy validated with non-blocking warnings.'
        : 'Route contract, auth bootstrap probes, and production env policy validated.',
    details,
  })
}

async function runStaticGateStage(stageRecord) {
  const env = { ...process.env }
  const commands = [
    ['bun', 'run', 'format:check'],
    ['bun', 'run', 'audit:light'],
    ['bun', 'run', 'type-check'],
    ['bun', 'run', 'lint:strict'],
    ['bun', 'run', 'test:unit'],
    ['bun', 'run', 'build'],
    ['bun', 'run', 'build:security-check'],
  ]

  const commandResults = await runStageCommands(stageRecord, commands, env, {
    timeoutMs: STATIC_GATE_COMMAND_TIMEOUT_MS,
    quiet: stageRecord.quiet,
  })

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Static release gates passed.',
    commands: commandResults,
  })
}

async function resolveHookScriptTests(cwd = process.cwd()) {
  const hookTestDirs = ['src/__tests__/scripts', 'src/sw/__tests__']
  const testPaths = []

  for (const relativeDir of hookTestDirs) {
    let entries
    try {
      entries = await readdir(path.resolve(cwd, relativeDir), { withFileTypes: true })
    } catch {
      continue
    }

    testPaths.push(
      ...entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
        .map((entry) => path.posix.join(relativeDir, entry.name))
    )
  }

  return testPaths.sort((left, right) => left.localeCompare(right))
}

async function runHookStaticGateStage(stageRecord) {
  const env = { ...process.env }
  const hookScriptTests = await resolveHookScriptTests()
  const commands = [
    ['bun', 'run', 'format:check'],
    ['bun', 'run', 'audit:light'],
    ['bun', 'run', 'type-check'],
    ['bun', 'run', 'lint:strict'],
    ...(hookScriptTests.length > 0
      ? [['node', 'scripts/run-vitest.mjs', 'run', ...hookScriptTests, '--reporter=default']]
      : []),
  ]

  const commandResults = await runStageCommands(stageRecord, commands, env, {
    timeoutMs: STATIC_GATE_COMMAND_TIMEOUT_MS,
    quiet: stageRecord.quiet,
  })

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Hook static gates passed without build, full unit suite, Docker, or browser gates.',
    commands: commandResults,
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

  const commandResults = await runStageCommands(stageRecord, commands, env, {
    timeoutMs: BROWSER_GATE_COMMAND_TIMEOUT_MS,
    quiet: stageRecord.quiet,
  })

  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Local browser smoke and frontend health passed.',
    commands: commandResults,
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

  const commandResults = await runStageCommands(stageRecord, commands, env, {
    timeoutMs: BROWSER_GATE_COMMAND_TIMEOUT_MS,
    quiet: stageRecord.quiet,
  })

  await writeJson(path.join(stageRecord.artifactDir, 'stage.json'), details)
  return finalizeStage(stageRecord, {
    status: 'passed',
    reason: 'Controlled site auth bootstrap probe, route smoke, and frontend health passed.',
    commands: commandResults,
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
  await runCommand(command, {
    env,
    artifactDir: buildCommandArtifactDir(stageRecord, command, 0),
    stdio: stageRecord.quiet ? 'pipe' : 'inherit',
  })

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
  await runCommand(command, {
    env,
    artifactDir: buildCommandArtifactDir(stageRecord, command, 0),
    stdio: stageRecord.quiet ? 'pipe' : 'inherit',
  })

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

function finalizeBlockedStages(stageRecords) {
  const failedStage = stageRecords.find((stage) => stage.selected && stage.status === 'failed')
  if (!failedStage) return stageRecords

  return stageRecords.map((stage) => {
    if (!stage.selected || stage.status !== 'pending') return stage
    return {
      ...stage,
      status: 'skipped',
      reason: `Blocked by ${failedStage.id}`,
    }
  })
}

function buildSummaryFromState({
  options,
  artifactDir,
  git,
  baseUrl,
  controlledBaseUrl,
  changeSummary,
  stageRecords,
}) {
  return buildValidationSummary({
    mode: options.mode,
    artifactDir,
    git: {
      branch: git.branch,
      commitSha: git.commitSha,
      diffRange: git.diffRange,
      changedFiles: git.changedFiles,
      committedChangedFiles: git.committedChangedFiles,
      localChangedFiles: git.localChangedFiles,
    },
    targets: {
      baseUrl,
      controlledBaseUrl,
    },
    changeSummary,
    stages: finalizeBlockedStages(stageRecords),
  })
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

  const stageRecords = buildValidationStageRecords({
    stagePlan,
    artifactDir,
    target: baseUrl,
    controlledTarget: controlledBaseUrl,
    quiet: options.quiet,
  })

  let summary = null
  let writingSummary = false
  const writeCurrentSummary = async (reason = null) => {
    if (writingSummary) return
    writingSummary = true
    try {
      if (reason) {
        const runningStageIndex = stageRecords.findIndex((stage) => stage.status === 'running')
        if (runningStageIndex >= 0) {
          stageRecords[runningStageIndex] = finalizeStage(stageRecords[runningStageIndex], {
            status: 'failed',
            reason,
          })
        }
      }
      summary = buildSummaryFromState({
        options,
        artifactDir,
        git,
        baseUrl,
        controlledBaseUrl,
        changeSummary,
        stageRecords,
      })
      await writeValidationArtifacts(summary)
      console.log(`\nValidation summary written to ${path.join(artifactDir, 'summary.md')}`)
      console.log(`Validation status: ${summary.status}`)
    } finally {
      writingSummary = false
    }
  }
  const handleTermination = (signal) => {
    void writeCurrentSummary(`Release validation runner received ${signal}`).finally(() => {
      process.exit(1)
    })
  }
  process.once('SIGINT', handleTermination)
  process.once('SIGTERM', handleTermination)

  try {
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
          case 'stage-1-hook-static':
            stageRecords[index] = await runHookStaticGateStage(stageRecords[index])
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
                reason:
                  'CONTROLLED_BASE_URL is required for candidate and production validation modes.',
              })
              break
            }
            stageRecords[index] = await runControlledSiteGateStage(
              stageRecords[index],
              controlledBaseUrl
            )
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
          commands: error?.commandResults ?? stageRecords[index].commands,
          details: {
            ...stageRecords[index].details,
            failedCommand: error?.commandResult ?? null,
          },
        })
      }

      console.log(`  ${stageRecords[index].status}: ${stageRecords[index].reason ?? 'completed'}`)

      if (stageRecords[index].status === 'failed') {
        break
      }
    }
  } finally {
    process.off('SIGINT', handleTermination)
    process.off('SIGTERM', handleTermination)
    await writeCurrentSummary()
    if (summary?.status === 'failed') {
      process.exitCode = 1
    }
  }
}

function isDirectCliRun() {
  const entryFile = process.argv[1]
  if (!entryFile) {
    return false
  }

  return import.meta.url === pathToFileURL(path.resolve(entryFile)).href
}

export {
  readGitOutput,
  resolveChangedFiles,
  resolveCommittedChangedFiles,
  resolveGitContext,
  resolveGitDiffRange,
  resolveLocalChangedFiles,
  resolveOriginHeadDiffRange,
  resolveRemoteBranchDiffRange,
  resolveHookScriptTests,
  resolveTrackingDiffRange,
  buildValidationStageRecords,
  getValidationStagePlan,
}

if (isDirectCliRun()) {
  main().catch((error) => {
    console.error('Release validation runner crashed:', error)
    process.exit(1)
  })
}
