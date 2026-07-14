import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ACCOUNT_SPECS = Object.freeze([
  Object.freeze({
    role: 'primary',
    usernameKey: 'PRIMARY_USERNAME',
    passwordKey: 'PRIMARY_PASSWORD',
    required: true,
  }),
  Object.freeze({
    role: 'peer',
    usernameKey: 'PEER_USERNAME',
    passwordKey: 'PEER_PASSWORD',
    required: false,
  }),
  Object.freeze({
    role: 'admin',
    usernameKey: 'ADMIN_USERNAME',
    passwordKey: 'ADMIN_PASSWORD',
    required: false,
  }),
  Object.freeze({
    role: 'locked',
    usernameKey: 'LOCKED_USERNAME',
    passwordKey: 'LOCKED_PASSWORD',
    required: false,
  }),
  Object.freeze({
    role: 'disabled',
    usernameKey: 'DISABLED_USERNAME',
    passwordKey: 'DISABLED_PASSWORD',
    required: false,
  }),
])

const FUNCTIONAL_CHAIN_BATCH_SPECS = Object.freeze([
  Object.freeze({
    id: 'comments-readiness',
    area: 'comments',
    label: 'Comments readiness',
    requiredAccounts: Object.freeze(['primary']),
    routeSurfaces: Object.freeze(['/posts/:id', '/community/discussions/:id']),
    facadePaths: Object.freeze(['/posts/:id/comments', '/discussions/:id/comments']),
    maxChecks: 3,
    evidence: Object.freeze([
      'comment list anchor remains mounted',
      'empty comment thread remains inspectable',
      'public comment endpoints use anonymous reads',
    ]),
  }),
  Object.freeze({
    id: 'favorites-profile-index',
    area: 'favorites',
    label: 'Favorites profile index',
    requiredAccounts: Object.freeze(['primary']),
    routeSurfaces: Object.freeze(['/profile/favorites']),
    facadePaths: Object.freeze(['/favorites/summary', '/favorites', '/favorites/check/:postId']),
    maxChecks: 3,
    evidence: Object.freeze([
      'favorites profile tab is reachable',
      'favorites summary and list endpoints stay authenticated',
      'favorite check does not expose anonymous cache state',
    ]),
  }),
  Object.freeze({
    id: 'notifications-inbox',
    area: 'notifications',
    label: 'Notifications inbox',
    requiredAccounts: Object.freeze(['primary']),
    routeSurfaces: Object.freeze(['/profile/inbox', '/settings']),
    facadePaths: Object.freeze(['/inbox/summary', '/inbox', '/notifications']),
    maxChecks: 3,
    evidence: Object.freeze([
      'inbox profile tab is reachable',
      'settings notification entry points to inbox',
      'inbox and notification endpoints stay authenticated',
    ]),
  }),
  Object.freeze({
    id: 'dual-user-session-isolation',
    area: 'dual-user',
    label: 'Dual-user session isolation',
    requiredAccounts: Object.freeze(['primary', 'peer']),
    routeSurfaces: Object.freeze(['/profile', '/profile/inbox']),
    facadePaths: Object.freeze(['/auth/session:resolve', '/favorites', '/inbox']),
    maxChecks: 4,
    evidence: Object.freeze([
      'primary session resolves before peer login',
      'peer session does not overwrite primary cookie material',
      'private favorites and inbox reads remain account-scoped',
    ]),
  }),
])

function readTrimmed(env, key) {
  return typeof env[key] === 'string' ? env[key].trim() : ''
}

function cloneBatchSpec(spec) {
  return {
    ...spec,
    requiredAccounts: [...spec.requiredAccounts],
    routeSurfaces: [...spec.routeSurfaces],
    facadePaths: [...spec.facadePaths],
    evidence: [...spec.evidence],
  }
}

export function resolveFunctionalChainAccounts(env = process.env) {
  return ACCOUNT_SPECS.map((spec) => {
    const username = readTrimmed(env, spec.usernameKey)
    const password = typeof env[spec.passwordKey] === 'string' ? env[spec.passwordKey] : ''
    const configured = Boolean(username && password)
    const missing = [username ? null : spec.usernameKey, password ? null : spec.passwordKey].filter(
      Boolean
    )

    return {
      ...spec,
      username,
      password,
      configured,
      missing,
      skipReason: configured ? null : `${missing.join('/')} not set`,
    }
  })
}

export function validateFunctionalChainAccounts(accounts) {
  const primary = accounts.find((account) => account.role === 'primary')
  if (!primary?.configured) {
    return primary?.skipReason ?? 'PRIMARY_USERNAME/PRIMARY_PASSWORD not set'
  }
  return null
}

export function getFunctionalChainBatchSpecs() {
  return FUNCTIONAL_CHAIN_BATCH_SPECS.map(cloneBatchSpec)
}

export function resolveFunctionalChainBatchPlan(selection = '') {
  const specs = getFunctionalChainBatchSpecs()
  const requestedIds = String(selection)
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
  if (requestedIds.length === 0 || requestedIds.includes('all')) {
    return {
      batches: specs,
      unknownIds: [],
    }
  }

  const byId = new Map(specs.map((spec) => [spec.id, spec]))
  return {
    batches: requestedIds.map((id) => byId.get(id)).filter((spec) => spec !== undefined),
    unknownIds: requestedIds.filter((id) => !byId.has(id)),
  }
}

/**
 * @param {{
 *   artifactDir: string,
 *   baseUrl?: string | null,
 *   accounts?: ReturnType<typeof resolveFunctionalChainAccounts>,
 *   batches?: ReturnType<typeof getFunctionalChainBatchSpecs>
 * }} options
 */
export function createFunctionalChainSummary({
  artifactDir,
  baseUrl = null,
  accounts = [],
  batches = getFunctionalChainBatchSpecs(),
}) {
  return {
    artifactDir,
    baseUrl,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'running',
    lastFailedCheck: null,
    checks: [],
    accounts: accounts.map((account) => ({
      role: account.role,
      usernamePresent: Boolean(account.username),
      passwordPresent: Boolean(account.password),
      configured: Boolean(account.configured),
      required: Boolean(account.required),
    })),
    batches: batches.map(cloneBatchSpec),
  }
}

export function appendFunctionalChainCheck(summary, check) {
  summary.checks.push({
    detail: null,
    ...check,
    finishedAt: check.finishedAt ?? new Date().toISOString(),
  })
  if (check.status === 'failed' || check.status === 'environment-blocked') {
    summary.lastFailedCheck = check.name
  }
}

export function finalizeFunctionalChainSummary(summary) {
  summary.finishedAt = new Date().toISOString()
  if (summary.checks.some((check) => check.status === 'failed')) {
    summary.status = 'failed'
    return summary
  }
  if (summary.checks.some((check) => check.status === 'environment-blocked')) {
    summary.status = 'environment-blocked'
    return summary
  }
  summary.status = 'passed'
  return summary
}

function countChecks(checks, status) {
  return checks.filter((check) => check.status === status).length
}

export function buildFunctionalChainMarkdownSummary(summary) {
  const checks = summary.checks
  const lines = [
    '## Functional Chain Local Matrix Summary',
    '',
    `- Status: ${summary.status}`,
    `- Base URL: \`${summary.baseUrl ?? 'unknown'}\``,
    `- Artifact dir: \`${summary.artifactDir}\``,
    `- Checks: ${countChecks(checks, 'passed')}/${checks.length} passed, ${countChecks(
      checks,
      'failed'
    )} failed, ${countChecks(checks, 'skipped')} skipped, ${countChecks(
      checks,
      'environment-blocked'
    )} environment-blocked`,
    `- Last failed check: ${summary.lastFailedCheck ?? 'none'}`,
    '',
    '### Accounts',
    '',
    '| Role | Username | Password | Required |',
    '| --- | --- | --- | --- |',
  ]

  for (const account of summary.accounts) {
    lines.push(
      `| ${account.role} | ${account.usernamePresent ? 'present' : 'missing'} | ${
        account.passwordPresent ? 'present' : 'missing'
      } | ${account.required ? 'yes' : 'no'} |`
    )
  }

  lines.push(
    '',
    '### Planned Batches',
    '',
    '| Batch | Area | Max checks | Required accounts | Route surfaces |',
    '| --- | --- | --- | --- | --- |'
  )

  for (const batch of summary.batches ?? []) {
    lines.push(
      `| ${batch.id} | ${batch.area} | ${batch.maxChecks} | ${batch.requiredAccounts.join(
        ', '
      )} | ${batch.routeSurfaces.join(', ')} |`
    )
  }

  lines.push(
    '',
    '### Checks',
    '',
    '| Check | Status | Account | Detail |',
    '| --- | --- | --- | --- |'
  )

  for (const check of checks) {
    lines.push(
      `| ${check.name} | ${check.status} | ${check.accountRole ?? '-'} | ${check.detail ?? '-'} |`
    )
  }

  lines.push('')
  return lines.join('\n')
}

export async function writeFunctionalChainArtifacts(summary) {
  await mkdir(summary.artifactDir, { recursive: true })
  await writeFile(
    join(summary.artifactDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`
  )
  await writeFile(
    join(summary.artifactDir, 'summary.md'),
    `${buildFunctionalChainMarkdownSummary(summary)}\n`
  )
}

export function isUuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '')
  )
}
