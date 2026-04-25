const UUID_V4_SOURCE =
  String.raw`\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b`
const UUID_V7_SOURCE =
  String.raw`^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
const UUID_LIKE_SOURCE =
  String.raw`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`

export const UUID_V4_RE = new RegExp(UUID_V4_SOURCE, 'i')
export const UUID_V7_RE = new RegExp(UUID_V7_SOURCE, 'i')
export const UUID_V4_GLOBAL_RE = new RegExp(UUID_V4_SOURCE, 'gi')
export const NUMERIC_PUBLIC_ID_RE = /^\d+$/

const PUBLIC_ID_KEYS = new Set([
  'id',
  'post_id',
  'author_id',
  'user_id',
  'discussion_id',
  'comment_id',
  'original_author_id',
])

const PUBLIC_ID_MAP_KEYS = new Set([
  'authorDetails',
  'authorPostsById',
  'postDetails',
  'discussionComments',
])

const PUBLIC_ROUTE_RE =
  /\/(?:post|author|users|discussion|community\/discussions)\/([^/?#'"`\s]+)/g
const PUBLIC_ID_PROPERTY_RE = new RegExp(
  String.raw`\b(${[...PUBLIC_ID_KEYS].join('|')})\s*:\s*['"]([^'"]+)['"]`,
  'gi'
)
const PUBLIC_ID_MAP_KEY_RE = new RegExp(String.raw`['"](${UUID_LIKE_SOURCE}|\d+)['"]\s*:`, 'gi')

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function classifyPublicId(value) {
  const normalized = String(value).trim()
  if (!normalized) return null
  if (UUID_V7_RE.test(normalized)) return null
  if (UUID_V4_RE.test(normalized)) return 'retired-v4'
  if (NUMERIC_PUBLIC_ID_RE.test(normalized)) return 'numeric'
  if (new RegExp(`^${UUID_LIKE_SOURCE}$`, 'i').test(normalized)) return 'non-v7-uuid'
  return null
}

function pushIssue(issues, location, value, reason) {
  issues.push({
    location,
    value: String(value),
    reason,
  })
}

function scanRouteString(issues, location, value) {
  if (typeof value !== 'string') return
  for (const match of value.matchAll(PUBLIC_ROUTE_RE)) {
    const reason = classifyPublicId(match[1])
    if (reason) {
      pushIssue(issues, `${location} route ${match[0]}`, match[1], reason)
    }
  }
}

function scanSnapshotDataValue(value, issues, location, parentKey = '') {
  if (typeof value === 'string') {
    scanRouteString(issues, location, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSnapshotDataValue(item, issues, `${location}[${index}]`))
    return
  }

  if (!isPlainObject(value)) return

  for (const [key, nestedValue] of Object.entries(value)) {
    if (PUBLIC_ID_MAP_KEYS.has(parentKey)) {
      const reason = classifyPublicId(key)
      if (reason) {
        pushIssue(issues, `${location}.${key} map key`, key, reason)
      }
    }

    const nextLocation = `${location}.${key}`
    if (PUBLIC_ID_KEYS.has(key) && (typeof nestedValue === 'string' || typeof nestedValue === 'number')) {
      const reason = classifyPublicId(nestedValue)
      if (reason) {
        pushIssue(issues, nextLocation, nestedValue, reason)
      }
    }
    scanSnapshotDataValue(nestedValue, issues, nextLocation, key)
  }
}

export function findPublicSnapshotIdContractIssues(data) {
  const issues = []
  scanSnapshotDataValue(data, issues, 'snapshot')
  return issues
}

export function findPublicSnapshotIdContractIssuesFromText(source) {
  const issues = []
  for (const match of source.matchAll(PUBLIC_ID_PROPERTY_RE)) {
    const reason = classifyPublicId(match[2])
    if (reason) {
      pushIssue(issues, `module property ${match[1]}`, match[2], reason)
    }
  }

  for (const match of source.matchAll(PUBLIC_ROUTE_RE)) {
    const reason = classifyPublicId(match[1])
    if (reason) {
      pushIssue(issues, `module route ${match[0]}`, match[1], reason)
    }
  }

  for (const match of source.matchAll(PUBLIC_ID_MAP_KEY_RE)) {
    const reason = classifyPublicId(match[1])
    if (reason) {
      pushIssue(issues, `module map key ${match[1]}`, match[1], reason)
    }
  }

  return dedupeIssues(issues)
}

export function hasRetiredPublicIdInText(source) {
  return UUID_V4_RE.test(source)
}

export function hasNumericPublicDetailRouteInText(source) {
  return Array.from(source.matchAll(PUBLIC_ROUTE_RE)).some((match) =>
    NUMERIC_PUBLIC_ID_RE.test(match[1])
  )
}

export function summarizePublicSnapshotContractIssues(issues, limit = 5) {
  return issues
    .slice(0, limit)
    .map((issue) => `${issue.value} at ${issue.location} (${issue.reason})`)
    .join(', ')
}

export function assertPublicSnapshotIdContract(data, options = {}) {
  const issues = findPublicSnapshotIdContractIssues(data)
  if (issues.length === 0) return

  const sourceName = options.sourceName ?? 'public snapshots'
  const summary = summarizePublicSnapshotContractIssues(issues)
  throw new Error(
    `${sourceName} contain non-UUIDv7 public IDs and cannot be written after UUIDv7 cutover: ${summary}`
  )
}

function dedupeIssues(issues) {
  const seen = new Set()
  return issues.filter((issue) => {
    const key = `${issue.location}\0${issue.value}\0${issue.reason}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
