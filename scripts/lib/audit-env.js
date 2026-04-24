import fs from 'node:fs'
import path from 'node:path'

export const LOCAL_AUDIT_ENV_FILE = '.env.smoke.local'
export const LOCAL_AUDIT_CONTRACT_VERSION = 'local-audit-contract'
export const LOCAL_AUDIT_PREVIEW_PORTS = Object.freeze([4173, 5173, 3000])
const BACKEND_AUDIT_ENV_FILE_CANDIDATES = Object.freeze([
  ['..', 'hmrchan-backend', '.env'],
])
const BACKEND_ENV_FALLBACK_KEYS = Object.freeze({
  REHEARSAL_TURNSTILE_BYPASS_TOKEN: ['REHEARSAL_TURNSTILE_BYPASS_TOKEN'],
  BACKEND_INTERNAL_AUTH_SHARED_SECRET: [
    'BACKEND_INTERNAL_AUTH_SHARED_SECRET',
    'INTERNAL_API_SHARED_SECRET',
  ],
  API_BASE_URL: [
    'API_BASE_URL',
    'VITE_IDENTITY_API_BASE_URL',
    'BACKEND_INTERNAL_ORIGIN',
    'INTERNAL_IDENTITY_API_BASE_URL',
  ],
  BACKEND_INTERNAL_ORIGIN: [
    'BACKEND_INTERNAL_ORIGIN',
    'VITE_IDENTITY_API_BASE_URL',
    'INTERNAL_IDENTITY_API_BASE_URL',
  ],
  VPC_API_ORIGIN: [
    'VPC_API_ORIGIN',
    'API_BASE_URL',
    'VITE_IDENTITY_API_BASE_URL',
    'INTERNAL_IDENTITY_API_BASE_URL',
  ],
  VPC_IDENTITY_API_ORIGIN: [
    'VPC_IDENTITY_API_ORIGIN',
    'API_BASE_URL',
    'VITE_IDENTITY_API_BASE_URL',
    'INTERNAL_IDENTITY_API_BASE_URL',
  ],
  VPC_COMMUNITY_API_ORIGIN: [
    'VPC_COMMUNITY_API_ORIGIN',
    'VITE_COMMUNITY_API_BASE_URL',
  ],
  VPC_CONTENT_API_ORIGIN: ['VPC_CONTENT_API_ORIGIN', 'VITE_CONTENT_API_BASE_URL'],
})

function hasTrimmedValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function parsePortNumber(rawValue) {
  const parsed = Number.parseInt(String(rawValue).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null
}

function unquoteValue(rawValue) {
  const value = rawValue.trim()
  if (value.length < 2) return value

  const quote = value[0]
  if ((quote !== '"' && quote !== "'") || value.at(-1) !== quote) {
    return value
  }

  const inner = value.slice(1, -1)
  if (quote === "'") return inner

  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

export function parseAuditEnvFile(content) {
  const values = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line
    const separatorIndex = normalizedLine.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = normalizedLine.slice(0, separatorIndex).trim()
    if (!key) continue

    const rawValue = normalizedLine.slice(separatorIndex + 1)
    values[key] = unquoteValue(rawValue)
  }

  return values
}

export function readLocalAuditEnv({
  cwd = process.cwd(),
  fileName = LOCAL_AUDIT_ENV_FILE,
} = {}) {
  const filePath = path.resolve(cwd, fileName)
  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      exists: false,
      values: {},
    }
  }

  return {
    filePath,
    exists: true,
    values: parseAuditEnvFile(fs.readFileSync(filePath, 'utf8')),
  }
}

function readAdjacentAuditEnvFile(cwd, relativePathSegments) {
  const filePath = path.resolve(cwd, ...relativePathSegments)
  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      exists: false,
      values: {},
    }
  }

  return {
    filePath,
    exists: true,
    values: parseAuditEnvFile(fs.readFileSync(filePath, 'utf8')),
  }
}

function resolveBackendAuditEnv({ cwd = process.cwd() } = {}) {
  for (const candidate of BACKEND_AUDIT_ENV_FILE_CANDIDATES) {
    const backendEnv = readAdjacentAuditEnvFile(cwd, candidate)
    if (backendEnv.exists) {
      return backendEnv
    }
  }

  const [firstCandidate] = BACKEND_AUDIT_ENV_FILE_CANDIDATES
  return {
    filePath: path.resolve(cwd, ...firstCandidate),
    exists: false,
    values: {},
  }
}

function applyBackendAuditFallbacks(mergedEnv, { cwd = process.cwd() } = {}) {
  const backendAuditEnv = resolveBackendAuditEnv({ cwd })
  const backendValues = backendAuditEnv.values

  for (const [targetKey, candidateKeys] of Object.entries(BACKEND_ENV_FALLBACK_KEYS)) {
    if (hasTrimmedValue(mergedEnv[targetKey])) {
      continue
    }

    for (const sourceKey of candidateKeys) {
      const candidateValue =
        sourceKey in mergedEnv && hasTrimmedValue(mergedEnv[sourceKey])
          ? mergedEnv[sourceKey]
          : backendValues[sourceKey]

      if (hasTrimmedValue(candidateValue)) {
        mergedEnv[targetKey] = candidateValue
        break
      }
    }
  }

  return mergedEnv
}

export function createLocalAuditEnv(
  baseEnv = process.env,
  {
    cwd = process.cwd(),
    fileName = LOCAL_AUDIT_ENV_FILE,
    includeContractFallback = false,
    overrides = {},
  } = {}
) {
  const localAuditEnv = readLocalAuditEnv({ cwd, fileName })
  const mergedEnv = { ...localAuditEnv.values }

  for (const [key, value] of Object.entries(baseEnv)) {
    if (hasTrimmedValue(value) || !(key in mergedEnv)) {
      mergedEnv[key] = value
    }
  }

  Object.assign(mergedEnv, overrides)
  applyBackendAuditFallbacks(mergedEnv, { cwd })

  if (
    includeContractFallback &&
    !hasTrimmedValue(mergedEnv.VITE_CLIENT_CONTRACT_VERSION)
  ) {
    mergedEnv.VITE_CLIENT_CONTRACT_VERSION = LOCAL_AUDIT_CONTRACT_VERSION
  }

  return mergedEnv
}

export function applyLocalAuditEnvToProcess({
  cwd = process.cwd(),
  fileName = LOCAL_AUDIT_ENV_FILE,
} = {}) {
  const localAuditEnv = readLocalAuditEnv({ cwd, fileName })

  for (const [key, value] of Object.entries(localAuditEnv.values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  applyBackendAuditFallbacks(process.env, { cwd })

  return localAuditEnv
}

export function resolveLocalAuditPreviewPorts(
  baseEnv = process.env,
  envKeys = ['LOCAL_AUDIT_PREVIEW_PORTS']
) {
  for (const key of envKeys) {
    const rawValue = baseEnv[key]
    if (!hasTrimmedValue(rawValue)) {
      continue
    }

    const ports = rawValue
      .split(',')
      .map((value) => parsePortNumber(value))
      .filter((value) => value !== null)

    if (ports.length > 0) {
      return ports
    }
  }

  return [...LOCAL_AUDIT_PREVIEW_PORTS]
}
