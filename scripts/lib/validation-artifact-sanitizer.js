export const ARTIFACT_REDACTED_VALUE = '[redacted]'
export const ARTIFACT_PRESENT_VALUE = '[present]'

const ENV_CONTAINER_KEYS = new Set(['env', 'baseEnv', 'processEnv', 'environment', 'environmentVariables'])
const SENSITIVE_KEY_PATTERN =
  /(^|[_.-])(access|api[-_]?key|api[-_]?token|auth|authorization|bearer|cert|cookie|credential|jwt|key|pass|password|private|refresh|secret|session|token)([_.-]|$)/i

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isSensitiveArtifactKey(key) {
  const normalizedKey = String(key ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  return SENSITIVE_KEY_PATTERN.test(normalizedKey)
}

function looksLikeEnvironmentMap(value) {
  if (!isRecord(value)) return false

  const entries = Object.entries(value)
  if (entries.length < 3) return false

  const envLikeKeys = entries.filter(([key]) => /^[A-Z][A-Z0-9_]*$/.test(key)).length
  return envLikeKeys / entries.length >= 0.6
}

function sanitizeEnvironmentMap(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      {
        present: item !== undefined && item !== null && String(item).length > 0,
        sensitive: isSensitiveArtifactKey(key),
        source: 'runtime-env',
        value: isSensitiveArtifactKey(key) ? ARTIFACT_REDACTED_VALUE : ARTIFACT_PRESENT_VALUE,
      },
    ])
  )
}

function sanitizeValue(value, keyPath, seen) {
  const currentKey = keyPath.at(-1) ?? ''

  if (isSensitiveArtifactKey(currentKey)) {
    return ARTIFACT_REDACTED_VALUE
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, [...keyPath, String(index)], seen))
  }

  if (!isRecord(value)) {
    return value
  }

  if (seen.has(value)) {
    return '[circular]'
  }
  seen.add(value)

  if (ENV_CONTAINER_KEYS.has(currentKey) || looksLikeEnvironmentMap(value)) {
    return sanitizeEnvironmentMap(value)
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sanitizeValue(item, [...keyPath, key], seen)])
  )
}

export function sanitizeValidationArtifact(payload) {
  return sanitizeValue(payload, [], new WeakSet())
}
