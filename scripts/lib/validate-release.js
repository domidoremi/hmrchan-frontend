import path from 'node:path'

export const VALIDATION_MODES = Object.freeze([
  'hook',
  'prepush',
  'prepush-full',
  'local',
  'candidate',
  'production',
])

const VALIDATION_STAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'stage-0-contract-self-check',
    order: 0,
    name: '合同自检',
    requiredModes: Object.freeze([
      'hook',
      'prepush',
      'prepush-full',
      'local',
      'candidate',
      'production',
    ]),
  }),
  Object.freeze({
    id: 'stage-1-hook-static',
    order: 1,
    name: 'Hook 中负载静态门禁',
    requiredModes: Object.freeze(['hook', 'prepush']),
  }),
  Object.freeze({
    id: 'stage-1-local-static',
    order: 2,
    name: '完整本地静态门禁',
    requiredModes: Object.freeze(['prepush-full', 'local', 'candidate', 'production']),
  }),
  Object.freeze({
    id: 'stage-2-local-browser',
    order: 3,
    name: '本地浏览器门禁',
    requiredModes: Object.freeze(['local', 'candidate', 'production']),
  }),
  Object.freeze({
    id: 'stage-3-controlled-site',
    order: 4,
    name: '受控站点门禁',
    requiredModes: Object.freeze(['candidate', 'production']),
  }),
  Object.freeze({
    id: 'stage-4-production-preflight',
    order: 5,
    name: '生产预检',
    requiredModes: Object.freeze(['candidate', 'production']),
  }),
  Object.freeze({
    id: 'stage-5-production-regression',
    order: 6,
    name: '生产深回归',
    requiredModes: Object.freeze(['production']),
  }),
])

const CHANGE_FOCUS_RULES = Object.freeze([
  Object.freeze({
    id: 'route-ui',
    label: 'Route/UI/readiness',
    description: 'Route shell, rendering, SEO, and readiness coverage need attention.',
    matches: (filePath) =>
      filePath.startsWith('src/views/') ||
      filePath.startsWith('src/components/') ||
      filePath.startsWith('src/router/'),
  }),
  Object.freeze({
    id: 'auth-data-flow',
    label: 'Auth/session/data flow',
    description: 'Session truth source, auth state, and API client behavior changed.',
    matches: (filePath) =>
      filePath.startsWith('src/api/') ||
      filePath.startsWith('src/stores/') ||
      filePath.startsWith('src/services/'),
  }),
  Object.freeze({
    id: 'edge-infra',
    label: 'Edge/BFF/gateway',
    description: 'Edge proxy, BFF, gateway, or deployment topology changed.',
    matches: (filePath) =>
      filePath.startsWith('src/edge/') ||
      filePath.startsWith('functions/') ||
      filePath.startsWith('workers/') ||
      filePath === 'wrangler.toml',
  }),
  Object.freeze({
    id: 'validation-contract',
    label: 'Validation contract',
    description: 'Validation contract, release runner, or policy definitions changed.',
    matches: (filePath) =>
      [
        'scripts/lib/release-route-contract.js',
        'scripts/lib/auth-bootstrap.js',
        'scripts/lib/production-contract-env.js',
        'scripts/lib/validate-release.js',
        'scripts/validate-release.mjs',
        'scripts/release-evidence.mjs',
        'VALIDATION.md',
      ].includes(filePath),
  }),
])

function normalizeFilePath(filePath) {
  return String(filePath ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
}

function samplePaths(paths, max = 8) {
  return paths.slice(0, max)
}

export function isValidationMode(value) {
  return VALIDATION_MODES.includes(value)
}

export function getValidationStageDefinitions() {
  return VALIDATION_STAGE_DEFINITIONS.map((stage) => ({ ...stage }))
}

export function getValidationStagePlan(mode) {
  return VALIDATION_STAGE_DEFINITIONS.map((stage) => ({
    ...stage,
    selected: stage.requiredModes.includes(mode),
    skippedByMode: !stage.requiredModes.includes(mode),
  }))
}

export function resolveValidationArtifactDir({ artifactDir, timestamp }) {
  if (typeof artifactDir === 'string' && artifactDir.trim().length > 0) {
    return path.resolve(artifactDir.trim())
  }

  return path.resolve(process.cwd(), 'output', 'validation', timestamp)
}

export function buildValidationStageArtifactDir(rootArtifactDir, stageId) {
  return path.join(rootArtifactDir, 'stages', stageId)
}

export function classifyValidationChanges(changedFiles) {
  const normalizedFiles = [
    ...new Set((changedFiles ?? []).map(normalizeFilePath).filter(Boolean)),
  ].sort()
  const matchedAreas = CHANGE_FOCUS_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    description: rule.description,
    matchedPaths: normalizedFiles.filter((filePath) => rule.matches(filePath)),
  })).filter((area) => area.matchedPaths.length > 0)

  return {
    changedFiles: normalizedFiles,
    changedFileCount: normalizedFiles.length,
    focusAreas: matchedAreas.map((area) => ({
      id: area.id,
      label: area.label,
      description: area.description,
      matchedPaths: samplePaths(area.matchedPaths),
      matchedCount: area.matchedPaths.length,
    })),
    labels: matchedAreas.map((area) => area.id),
    hasValidationContractChanges: matchedAreas.some((area) => area.id === 'validation-contract'),
    hasEdgeChanges: matchedAreas.some((area) => area.id === 'edge-infra'),
    hasAuthDataFlowChanges: matchedAreas.some((area) => area.id === 'auth-data-flow'),
    hasRouteUiChanges: matchedAreas.some((area) => area.id === 'route-ui'),
  }
}

function findUnexpectedSkip(stages) {
  return stages.find((stage) => stage.selected && stage.status === 'skipped')
}

function findFailedStage(stages) {
  return stages.find((stage) => stage.selected && stage.status === 'failed')
}

function findUnresolvedSelectedStage(stages) {
  return stages.find(
    (stage) => stage.selected && !['passed', 'failed', 'skipped'].includes(stage.status)
  )
}

function formatFileList(paths, emptyLine) {
  return paths?.length > 0 ? paths.map((filePath) => `- ${filePath}`) : [`- ${emptyLine}`]
}

export function buildValidationSummary({ mode, artifactDir, git, targets, changeSummary, stages }) {
  const failedStage = findFailedStage(stages)
  const unexpectedSkip = findUnexpectedSkip(stages)
  const unresolvedStage = findUnresolvedSelectedStage(stages)
  const selectedStages = stages.filter((stage) => stage.selected)
  const completedStages = selectedStages.filter((stage) => stage.status === 'passed')
  let status = 'incomplete'

  if (failedStage || unexpectedSkip || unresolvedStage) {
    status = 'failed'
  } else if (['hook', 'prepush', 'prepush-full', 'production'].includes(mode)) {
    status = 'passed'
  }

  const blockingStage = failedStage ?? unexpectedSkip ?? unresolvedStage ?? null
  let blockingReason = null

  if (blockingStage) {
    if (blockingStage.reason) {
      blockingReason = blockingStage.reason
    } else if (blockingStage.status === 'running' || blockingStage.status === 'pending') {
      blockingReason = 'Selected release stage did not complete.'
    } else if (blockingStage.status === 'skipped') {
      blockingReason = 'Selected release stage was skipped unexpectedly.'
    } else {
      blockingReason = 'Selected release stage failed.'
    }
  } else if (!['hook', 'prepush', 'prepush-full', 'production'].includes(mode)) {
    blockingReason = 'Production deep regression did not run in this validation mode.'
  }

  return {
    kind: 'release-validation',
    generatedAt: new Date().toISOString(),
    mode,
    status,
    artifactDir,
    git,
    targets,
    changeSummary,
    stageCount: stages.length,
    selectedStageCount: selectedStages.length,
    completedStageCount: completedStages.length,
    blockingStageId: blockingStage?.id ?? null,
    blockingReason,
    stages,
  }
}

export function buildValidationMarkdownSummary(summary) {
  const stageRows = summary.stages.map(
    (stage) =>
      `| ${stage.order} | ${stage.name} | ${stage.selected ? 'yes' : 'no'} | ${stage.status} | ${stage.target ?? '-'} | ${stage.reason ?? '-'} | ${stage.artifactDir ?? '-'} |`
  )

  const focusAreaLines =
    summary.changeSummary.focusAreas.length > 0
      ? summary.changeSummary.focusAreas.flatMap((area) => [
          `### ${area.label}`,
          '',
          `- 说明: ${area.description}`,
          `- 命中文件数: ${area.matchedCount}`,
          ...area.matchedPaths.map((filePath) => `- ${filePath}`),
          '',
        ])
      : ['- No change-focused risk areas detected from the git range or local worktree.', '']

  const changedFileLines =
    summary.changeSummary.changedFiles.length > 0
      ? summary.changeSummary.changedFiles.map((filePath) => `- ${filePath}`)
      : formatFileList(
          [],
          'No changed files detected; validation ran against the current HEAD and worktree snapshot.'
        )

  const committedChangedFileLines = formatFileList(
    summary.git.committedChangedFiles,
    'No committed changes detected in the resolved git range.'
  )
  const localChangedFileLines = formatFileList(
    summary.git.localChangedFiles,
    'No staged, unstaged, or untracked worktree changes detected.'
  )

  return [
    '# Release Validation Summary',
    '',
    `- Status: ${summary.status}`,
    `- Mode: ${summary.mode}`,
    `- Generated At: ${summary.generatedAt}`,
    `- Artifact Dir: ${summary.artifactDir}`,
    `- Git Branch: ${summary.git.branch ?? 'unknown'}`,
    `- Git Commit: ${summary.git.commitSha ?? 'unknown'}`,
    `- Git Range: ${summary.git.diffRange ?? 'unknown'}`,
    `- BASE_URL: ${summary.targets.baseUrl ?? 'n/a'}`,
    `- CONTROLLED_BASE_URL: ${summary.targets.controlledBaseUrl ?? 'n/a'}`,
    `- Blocking Stage: ${summary.blockingStageId ?? 'none'}`,
    `- Blocking Reason: ${summary.blockingReason ?? 'none'}`,
    '',
    '## Stage Results',
    '',
    '| Order | Stage | Selected | Status | Target | Reason | Artifact |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...stageRows,
    '',
    '## Change Focus',
    '',
    ...focusAreaLines,
    '## Changed Files',
    '',
    ...changedFileLines,
    '',
    '### Committed Range',
    '',
    ...committedChangedFileLines,
    '',
    '### Local Worktree',
    '',
    ...localChangedFileLines,
    '',
  ].join('\n')
}
