import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer as createNetServer } from 'node:net'

import { buildSpawnCommand, getBunExecutable, getBunRuntimeArgs } from './command-runner.js'

const PREVIEW_READY_POLL_INTERVAL_MS = 500
const LOCAL_API_BRIDGE_IMAGE = 'alpine/socat:latest'
const LOCAL_API_BRIDGE_NETWORK = 'hmrchan-backend_hmrchan'
const DEFAULT_COMMAND_TIMEOUT_MS = 20_000
const CLEANUP_COMMAND_TIMEOUT_MS = 5_000
const PREVIEW_PORT_CLEANUP_SETTLE_MS = 750
const LOCAL_API_BRIDGE_SERVICES = Object.freeze({
  gateway: {
    envKey: 'API_BASE_URL',
    container: 'hmrchan-caddy',
    preferredPort: 19080,
    targetPort: 80,
  },
  identity: {
    envKey: 'VITE_IDENTITY_API_BASE_URL',
    container: 'hmrchan-identity-api',
    preferredPort: 19081,
    targetPort: 8000,
  },
  community: {
    envKey: 'VITE_COMMUNITY_API_BASE_URL',
    container: 'hmrchan-community-api',
    preferredPort: 19082,
    targetPort: 8000,
  },
  content: {
    envKey: 'VITE_CONTENT_API_BASE_URL',
    container: 'hmrchan-content-api',
    preferredPort: 19083,
    targetPort: 8000,
  },
})
const WRANGLER_RUNTIME_BINDING_KEYS = Object.freeze([
  'API_BASE_URL',
  'BACKEND_INTERNAL_ORIGIN',
  'BACKEND_INTERNAL_AUTH_SHARED_SECRET',
  'ENABLE_INTERNAL_API_GATEWAY',
  'GOOGLE_AUTH_ENABLED',
  'REHEARSAL_TURNSTILE_BYPASS_TOKEN',
  'VPC_API_ORIGIN',
  'VPC_IDENTITY_API_ORIGIN',
  'VPC_COMMUNITY_API_ORIGIN',
  'VPC_CONTENT_API_ORIGIN',
])
const LOCAL_PAGES_PREVIEW_SCRIPT = 'scripts/local-pages-preview.ts'

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function splitLines(chunk) {
  return chunk
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
}

function pushOutput(buffer, source, chunk, maxOutputLines) {
  for (const line of splitLines(chunk)) {
    buffer.push(`[${new Date().toISOString()}] ${source}: ${line}`)
    if (buffer.length > maxOutputLines) {
      buffer.shift()
    }
  }
}

function getWranglerBindingArgs(env) {
  const args = []
  for (const key of WRANGLER_RUNTIME_BINDING_KEYS) {
    if (!hasTrimmedEnvValue(env, key)) {
      continue
    }
    args.push('-b', `${key}=${env[key].trim()}`)
  }
  return args
}

function shouldUseWranglerPagesRuntime(env) {
  return env?.LOCAL_AUDIT_USE_WRANGLER_PAGES === 'true'
}

export async function findAvailablePort(preferredPort = 0, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createNetServer()
    server.unref()
    server.once('error', reject)
    server.listen(preferredPort, host, () => {
      const address = server.address()
      const actualPort =
        typeof address === 'object' && address && typeof address.port === 'number'
          ? address.port
          : preferredPort
      server.close((error) => {
        if (error) reject(error)
        else resolve(actualPort)
      })
    })
  })
}

export async function findAvailablePortFromCandidates(
  candidatePorts = [],
  { allowRandomFallback = true, host = '127.0.0.1' } = {}
) {
  for (const candidatePort of candidatePorts) {
    const port = Number(candidatePort)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      continue
    }

    try {
      return await findAvailablePort(port, host)
    } catch {
      // Try the next known-safe local origin before falling back.
    }
  }

  if (allowRandomFallback) {
    return findAvailablePort(0, host)
  }

  throw new Error(
    `No local audit preview port is available from candidates: ${candidatePorts.join(', ')}`
  )
}

export async function runBunTask(task, { env = process.env, stdio = 'inherit' } = {}) {
  await new Promise((resolve, reject) => {
    const command = buildSpawnCommand(
      getBunExecutable({ env }),
      getBunRuntimeArgs({
        env,
        includeRunSubcommand: true,
        runArgs: [task],
      })
    )
    const child = spawn(command.command, command.args, {
      stdio,
      shell: command.shell,
      env,
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`bun run ${task} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

function runDetachedCleanupCommand(command, args, { env = process.env } = {}) {
  try {
    const child = spawn(command, args, {
      stdio: 'ignore',
      shell: false,
      env,
      detached: true,
    })
    child.unref?.()
  } catch {
    // Best-effort cleanup must never block validation teardown.
  }
}

export async function runCommandCapture(command, args, { env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env,
    })

    const stdout = []
    const stderr = []
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, DEFAULT_COMMAND_TIMEOUT_MS)
    child.stdout?.on('data', (chunk) => stdout.push(chunk.toString()))
    child.stderr?.on('data', (chunk) => stderr.push(chunk.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) {
        reject(
          new Error(
            `${command} ${args.join(' ')} timed out after ${DEFAULT_COMMAND_TIMEOUT_MS}ms. ` +
              'Local audit Docker dependencies are unavailable or unresponsive.'
          )
        )
        return
      }

      if (code === 0) {
        resolve(stdout.join('').trim())
        return
      }

      const stderrText = stderr.join('').trim()
      const dockerUnavailable =
        command === 'docker' &&
        /dockerDesktopLinuxEngine|Cannot connect to the Docker daemon|failed to connect to the docker API|The system cannot find the file specified/i.test(
          stderrText
        )

      reject(
        new Error(
          dockerUnavailable
            ? `Docker daemon is unavailable, so the local audit API bridge cannot start. Start Docker Desktop or set LOCAL_AUDIT_AUTO_API_BRIDGE=false / provide explicit API origins before rerunning. Original error: ${stderrText}`
            : `${command} ${args.join(' ')} exited with code ${code}: ${stderrText}`
        )
      )
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function shouldAutoGrantLocalClientTrust(env) {
  if (env?.LOCAL_AUDIT_AUTO_CLIENT_TRUST === 'false') return false
  return shouldAutoStartLocalApiBridge(env)
}

function shouldClearLocalAuditRateLimits(env) {
  if (env?.LOCAL_AUDIT_CLEAR_RATE_LIMITS === 'false') return false
  return env?.LOCAL_AUDIT_CLEAR_RATE_LIMITS === 'true' || shouldAutoStartLocalApiBridge(env)
}

async function scanRedisKeys({ redisContainer, redisPassword, redisDb, pattern }) {
  const output = await runCommandCapture('docker', [
    'exec',
    redisContainer,
    'redis-cli',
    '-a',
    redisPassword,
    '-n',
    String(redisDb),
    '--scan',
    '--pattern',
    pattern,
  ]).catch(() => '')

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

async function deleteRedisKeys({ redisContainer, redisPassword, redisDb, keys, batchSize = 100 }) {
  let deleted = 0
  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize)
    if (batch.length === 0) continue

    const output = await runCommandCapture('docker', [
      'exec',
      redisContainer,
      'redis-cli',
      '-a',
      redisPassword,
      '-n',
      String(redisDb),
      'DEL',
      ...batch,
    ]).catch(() => '0')
    const parsed = Number.parseInt(output.trim(), 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      deleted += parsed
    }
  }
  return deleted
}

export async function clearLocalAuditRateLimitState(
  env = process.env,
  {
    redisContainer = env.LOCAL_AUDIT_REDIS_CONTAINER || 'hmrchan-redis',
    redisPassword = env.LOCAL_AUDIT_REDIS_PASSWORD || 'hmrchan_local_dev',
    redisDb = env.LOCAL_AUDIT_REDIS_DB || '2',
    patterns = ['ratelimit:*'],
  } = {}
) {
  if (!shouldClearLocalAuditRateLimits(env)) {
    return 0
  }

  const keys = [
    ...new Set(
      (
        await Promise.all(
          patterns.map((pattern) =>
            scanRedisKeys({
              redisContainer,
              redisPassword,
              redisDb,
              pattern,
            })
          )
        )
      ).flat()
    ),
  ]

  if (keys.length === 0) {
    return 0
  }

  return deleteRedisKeys({
    redisContainer,
    redisPassword,
    redisDb,
    keys,
  })
}

export async function grantLocalAuditClientTrust(
  env = process.env,
  {
    redisContainer = env.LOCAL_AUDIT_REDIS_CONTAINER || 'hmrchan-redis',
    redisPassword = env.LOCAL_AUDIT_REDIS_PASSWORD || 'hmrchan_local_dev',
    redisDb = env.LOCAL_AUDIT_REDIS_DB || '2',
    ttlSeconds = parsePositiveInteger(env.LOCAL_AUDIT_CLIENT_TRUST_TTL_SECONDS, 21600),
    attempts = 8,
    delayMs = 250,
  } = {}
) {
  if (!shouldAutoGrantLocalClientTrust(env)) {
    return 0
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const output = await runCommandCapture('docker', [
      'exec',
      redisContainer,
      'redis-cli',
      '-a',
      redisPassword,
      '-n',
      String(redisDb),
      '--scan',
      '--pattern',
      'visitor:*',
    ]).catch(() => '')
    const keys = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('visitor:'))

    if (keys.length > 0) {
      await Promise.all(
        keys.map((key) =>
          runCommandCapture('docker', [
            'exec',
            redisContainer,
            'redis-cli',
            '-a',
            redisPassword,
            '-n',
            String(redisDb),
            'SET',
            key,
            'basic',
            'EX',
            String(ttlSeconds),
          ]).catch(() => undefined)
        )
      )
      return keys.length
    }

    await wait(delayMs)
  }

  return 0
}

function normalizeHeaderMap(headers = {}) {
  const normalized = {}
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key !== 'string') continue
    normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  }
  return normalized
}

function parseVisitorKey(key) {
  const prefix = 'visitor:'
  if (!key.startsWith(prefix)) return null
  const body = key.slice(prefix.length)
  const separator = body.lastIndexOf(':')
  if (separator <= 0 || separator >= body.length - 1) return null
  return {
    ip: body.slice(0, separator),
    fingerprint: body.slice(separator + 1),
  }
}

function buildTurnstileTrustKeyFromParts(parts) {
  const raw = parts.join('|')
  return `turnstile:trust:${createHash('sha256').update(raw).digest('hex')}`
}

function headerCandidates(headers, key) {
  const candidates = new Set()
  const add = (value) => {
    const normalized = String(value ?? '').trim()
    if (normalized) candidates.add(normalized)
  }
  add(headers[key])
  for (const value of String(headers[`x-local-audit-candidates-${key}`] ?? '').split('\n')) {
    add(value)
  }
  for (const value of defaultHeaderCandidates(headers, key)) {
    add(value)
  }
  candidates.add('')
  return [...candidates]
}

function chromiumMajorVersion(userAgent) {
  const match = String(userAgent ?? '').match(/(?:Chrome|Chromium)\/(\d+)/)
  return match?.[1] ?? ''
}

function defaultHeaderCandidates(headers, key) {
  if (key === 'user-agent') {
    return [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    ]
  }

  if (key === 'accept-language') {
    return ['en-US,en;q=0.9', 'zh-CN,zh;q=0.9', 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7']
  }

  if (key === 'sec-ch-ua-platform') {
    return ['"Windows"', '"Windows NT"']
  }

  if (key === 'sec-ch-ua') {
    const major = chromiumMajorVersion(headers['user-agent'])
    if (!major) return []
    return [
      `"Chromium";v="${major}", "Not:A-Brand";v="24", "Google Chrome";v="${major}"`,
      `"Google Chrome";v="${major}", "Not:A-Brand";v="24", "Chromium";v="${major}"`,
      `"Not:A-Brand";v="24", "Chromium";v="${major}", "Google Chrome";v="${major}"`,
      `"Chromium";v="${major}", "Not A(Brand";v="24", "Google Chrome";v="${major}"`,
      `"Google Chrome";v="${major}", "Not A(Brand";v="24", "Chromium";v="${major}"`,
      `"Not A(Brand";v="24", "Chromium";v="${major}", "Google Chrome";v="${major}"`,
    ]
  }

  return []
}

function buildTurnstileTrustKeys(state, headers) {
  const keys = new Set()
  for (const ua of headerCandidates(headers, 'user-agent')) {
    for (const chUA of headerCandidates(headers, 'sec-ch-ua')) {
      for (const chPlatform of headerCandidates(headers, 'sec-ch-ua-platform')) {
        for (const acceptLang of headerCandidates(headers, 'accept-language')) {
          keys.add(
            buildTurnstileTrustKeyFromParts([
              state.ip,
              ua,
              chUA,
              chPlatform,
              acceptLang,
              state.fingerprint,
            ])
          )
        }
      }
    }
  }
  return [...keys]
}

export async function grantLocalAuditTurnstileTrust(
  env = process.env,
  requestHeaders = {},
  {
    redisContainer = env.LOCAL_AUDIT_REDIS_CONTAINER || 'hmrchan-redis',
    redisPassword = env.LOCAL_AUDIT_REDIS_PASSWORD || 'hmrchan_local_dev',
    redisDb = env.LOCAL_AUDIT_REDIS_DB || '2',
    ttlSeconds = parsePositiveInteger(env.LOCAL_AUDIT_CLIENT_TRUST_TTL_SECONDS, 21600),
  } = {}
) {
  if (!shouldAutoGrantLocalClientTrust(env)) {
    return 0
  }

  const headers = normalizeHeaderMap(requestHeaders)
  const requestedFingerprint = headers['x-client-fingerprint']?.trim() ?? ''
  const output = await runCommandCapture('docker', [
    'exec',
    redisContainer,
    'redis-cli',
    '-a',
    redisPassword,
    '-n',
    String(redisDb),
    '--scan',
    '--pattern',
    'visitor:*',
  ]).catch(() => '')

  const visitorStates = output
    .split(/\r?\n/)
    .map((line) => parseVisitorKey(line.trim()))
    .filter(Boolean)
    .filter((state) => !requestedFingerprint || state.fingerprint === requestedFingerprint)

  const trustKeys = [
    ...new Set(visitorStates.flatMap((state) => buildTurnstileTrustKeys(state, headers))),
  ]
  if (trustKeys.length === 0) {
    return 0
  }

  await Promise.all(
    trustKeys.map((key) =>
      runCommandCapture('docker', [
        'exec',
        redisContainer,
        'redis-cli',
        '-a',
        redisPassword,
        '-n',
        String(redisDb),
        'SET',
        key,
        '1',
        'EX',
        String(ttlSeconds),
      ]).catch(() => undefined)
    )
  )
  return trustKeys.length
}

export async function terminateProcessTree(pid) {
  if (!pid) return

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: false,
      })
      const timer = setTimeout(resolve, CLEANUP_COMMAND_TIMEOUT_MS)
      const finish = () => {
        clearTimeout(timer)
        resolve()
      }
      killer.on('close', finish)
      killer.on('error', finish)
    })
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // ignore
  }
}

export async function isProcessRunning(pid) {
  if (!pid) return false

  if (process.platform === 'win32') {
    const output = await runCommandCapture('tasklist', [
      '/FI',
      `PID eq ${pid}`,
      '/FO',
      'CSV',
      '/NH',
    ])
    return output.includes(`"${pid}"`)
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function waitForProcessExit(child, timeoutMs = 10_000) {
  if (!child || child.exitCode !== null || child.killed) {
    return
  }

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    const finish = () => {
      clearTimeout(timer)
      resolve()
    }

    child.once('close', finish)
    child.once('error', finish)
  })
}

export async function waitForPidExit(pid, timeoutMs = 10_000, pollIntervalMs = 250) {
  if (!pid) return true

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await isProcessRunning(pid))) {
      return true
    }
    await wait(pollIntervalMs)
  }

  return !(await isProcessRunning(pid))
}

export function parseListeningProcessIdsFromNetstat(output, port) {
  if (!port) return []

  const portSuffix = `:${port}`
  const pids = new Set()
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/)
    if (fields.length < 5 || !/^TCP$/i.test(fields[0]) || !/^LISTENING$/i.test(fields[3])) {
      continue
    }

    const localAddress = fields[1]
    const pid = Number.parseInt(fields[4], 10)
    if (
      Number.isInteger(pid) &&
      pid > 0 &&
      (localAddress.endsWith(portSuffix) || localAddress.endsWith(`]${portSuffix}`))
    ) {
      pids.add(pid)
    }
  }

  return [...pids]
}

export async function findProcessIdsListeningOnPort(port) {
  if (!port || process.platform !== 'win32') return []

  const output = await runCommandCapture('netstat', ['-ano', '-p', 'tcp']).catch(() => '')
  return parseListeningProcessIdsFromNetstat(output, port)
}

export async function terminateProcessesListeningOnPort(port) {
  const pids = await findProcessIdsListeningOnPort(port)
  for (const pid of pids) {
    if (pid === process.pid) continue
    await terminateProcessTree(pid)
    await waitForPidExit(pid, 5_000)
  }
}

function hasTrimmedEnvValue(env, key) {
  return typeof env?.[key] === 'string' && env[key].trim().length > 0
}

function hasConfiguredLocalApiOrigins(env) {
  return (
    hasTrimmedEnvValue(env, 'BACKEND_INTERNAL_ORIGIN') &&
    hasTrimmedEnvValue(env, LOCAL_API_BRIDGE_SERVICES.identity.envKey) &&
    hasTrimmedEnvValue(env, LOCAL_API_BRIDGE_SERVICES.community.envKey) &&
    hasTrimmedEnvValue(env, LOCAL_API_BRIDGE_SERVICES.content.envKey)
  )
}

function buildConfiguredLocalApiOriginPatch(env) {
  const identityOrigin = env?.[LOCAL_API_BRIDGE_SERVICES.identity.envKey]?.trim()
  const communityOrigin = env?.[LOCAL_API_BRIDGE_SERVICES.community.envKey]?.trim()
  const contentOrigin = env?.[LOCAL_API_BRIDGE_SERVICES.content.envKey]?.trim()
  const publicOrigin = env?.API_BASE_URL?.trim() || identityOrigin
  const internalOrigin = env?.BACKEND_INTERNAL_ORIGIN?.trim() || identityOrigin

  return {
    API_BASE_URL: publicOrigin,
    VITE_API_BASE_URL: publicOrigin,
    BACKEND_INTERNAL_ORIGIN: internalOrigin,
    VPC_API_ORIGIN: publicOrigin,
    VPC_IDENTITY_API_ORIGIN: identityOrigin,
    VPC_COMMUNITY_API_ORIGIN: communityOrigin,
    VPC_CONTENT_API_ORIGIN: contentOrigin,
    ENABLE_INTERNAL_API_GATEWAY: 'true',
  }
}

function shouldAutoStartLocalApiBridge(env) {
  const forceBridge = env?.LOCAL_AUDIT_AUTO_API_BRIDGE === 'true'

  if (env?.LOCAL_AUDIT_AUTO_API_BRIDGE === 'false') return false
  if (env?.VITE_DISABLE_PREVIEW_PROXY === 'true') return false
  if (
    !forceBridge &&
    hasTrimmedEnvValue(env, 'VITE_API_BASE_URL') &&
    hasTrimmedEnvValue(env, 'API_BASE_URL') &&
    hasTrimmedEnvValue(env, 'BACKEND_INTERNAL_ORIGIN')
  ) {
    return false
  }
  if (
    !forceBridge &&
    hasTrimmedEnvValue(env, 'API_BASE_URL') &&
    hasTrimmedEnvValue(env, LOCAL_API_BRIDGE_SERVICES.identity.envKey) &&
    hasTrimmedEnvValue(env, LOCAL_API_BRIDGE_SERVICES.community.envKey) &&
    hasTrimmedEnvValue(env, LOCAL_API_BRIDGE_SERVICES.content.envKey)
  ) {
    return false
  }

  return (
    forceBridge ||
    hasTrimmedEnvValue(env, 'PRIMARY_USERNAME') ||
    hasTrimmedEnvValue(env, 'E2E_AUTH_LOGIN')
  )
}

export class LocalApiBridgeManager {
  constructor({
    env = process.env,
    host = '127.0.0.1',
    network = process.env['LOCAL_AUDIT_DOCKER_NETWORK'] || LOCAL_API_BRIDGE_NETWORK,
    image = process.env['LOCAL_AUDIT_SOCAT_IMAGE'] || LOCAL_API_BRIDGE_IMAGE,
    startupTimeoutMs = 20_000,
  } = {}) {
    this.env = env
    this.host = host
    this.network = network
    this.image = image
    this.startupTimeoutMs = startupTimeoutMs
    this.bridges = []
  }

  get envPatch() {
    const patch = {}
    for (const bridge of this.bridges) {
      patch[bridge.envKey] = bridge.baseUrl
      if (bridge.name === 'gateway') {
        patch.API_BASE_URL = bridge.baseUrl
        patch.VITE_API_BASE_URL = bridge.baseUrl
        patch.VPC_API_ORIGIN = bridge.baseUrl
      }
      if (bridge.name === 'identity') {
        patch.BACKEND_INTERNAL_ORIGIN = bridge.baseUrl
        patch.VPC_IDENTITY_API_ORIGIN = bridge.baseUrl
      }
      if (bridge.name === 'community') {
        patch.VPC_COMMUNITY_API_ORIGIN = bridge.baseUrl
      }
      if (bridge.name === 'content') {
        patch.VPC_CONTENT_API_ORIGIN = bridge.baseUrl
      }
    }
    if (
      patch.VPC_IDENTITY_API_ORIGIN &&
      patch.VPC_COMMUNITY_API_ORIGIN &&
      patch.VPC_CONTENT_API_ORIGIN
    ) {
      patch.ENABLE_INTERNAL_API_GATEWAY = 'true'
    }
    return patch
  }

  formatDiagnosticsLines() {
    if (this.bridges.length === 0) {
      return ['local API bridge: not started']
    }

    return [
      `local API bridge network: ${this.network}`,
      ...this.bridges.map(
        (bridge) =>
          `local API bridge ${bridge.name}: ${bridge.baseUrl} -> ${bridge.container}:8000 (${bridge.containerName})`
      ),
    ]
  }

  async waitForBridge(baseUrl) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < this.startupTimeoutMs) {
      try {
        const response = await fetch(`${baseUrl}/health/ready`, {
          redirect: 'manual',
        })
        if (response.status >= 200 && response.status < 500) {
          return
        }
      } catch {
        // Keep polling until the socat container is ready.
      }

      await wait(PREVIEW_READY_POLL_INTERVAL_MS)
    }

    throw new Error(`Local API bridge did not become ready at ${baseUrl}`)
  }

  async startBridge(name, definition) {
    const port = await findAvailablePort(definition.preferredPort).catch(() => findAvailablePort(0))
    const containerName = `hmrchan-audit-${name}-${process.pid}-${port}`
    const baseUrl = `http://${this.host}:${port}`

    await runCommandCapture('docker', [
      'run',
      '-d',
      '--rm',
      '--name',
      containerName,
      '--network',
      this.network,
      '-p',
      `${this.host}:${port}:${port}`,
      this.image,
      `TCP-LISTEN:${port},fork,reuseaddr`,
      `TCP:${definition.container}:${definition.targetPort ?? 8000}`,
    ])

    const bridge = {
      name,
      container: definition.container,
      containerName,
      envKey: definition.envKey,
      port,
      baseUrl,
    }
    this.bridges.push(bridge)

    await this.waitForBridge(baseUrl)
    return bridge
  }

  async start() {
    if (this.bridges.length > 0) {
      return this
    }

    try {
      await runCommandCapture('docker', ['info'], { env: this.env })
      for (const [name, definition] of Object.entries(LOCAL_API_BRIDGE_SERVICES)) {
        await this.startBridge(name, definition)
      }
      return this
    } catch (error) {
      await this.stop()
      throw error
    }
  }

  async stop() {
    const bridges = [...this.bridges].reverse()
    this.bridges = []

    for (const bridge of bridges) {
      runDetachedCleanupCommand('docker', ['rm', '-f', bridge.containerName], { env: this.env })
    }
    await wait(250)
  }
}

export class PreviewShellManager {
  constructor({
    env = process.env,
    preferredPort = 0,
    host = '127.0.0.1',
    healthPath = '/',
    startupTimeoutMs = 45_000,
    maxOutputLines = 120,
    logOutput = false,
    candidatePorts = [],
    allowRandomPortFallback = true,
    serverMode = 'vite',
    localApiBridgeFactory = (env) => new LocalApiBridgeManager({ env }),
    serverSpawner = spawn,
  } = {}) {
    this.env = env
    this.effectiveEnv = env
    this.preferredPort = preferredPort
    this.candidatePorts = candidatePorts
    this.allowRandomPortFallback = allowRandomPortFallback
    this.host = host
    this.healthPath = healthPath
    this.startupTimeoutMs = startupTimeoutMs
    this.maxOutputLines = maxOutputLines
    this.logOutput = logOutput
    this.serverMode = serverMode
    this.localApiBridgeFactory = localApiBridgeFactory
    this.serverSpawner = serverSpawner
    this.runtimeHealthPath = null
    this.port = null
    this.child = null
    this.outputLines = []
    this.startedAt = null
    this.exitInfo = null
    this.stopRequested = false
    this.localApiBridge = null
  }

  get baseUrl() {
    if (!this.port) return null
    return `http://${this.host}:${this.port}`
  }

  async ensurePort() {
    if (!this.port) {
      if (this.candidatePorts.length > 0) {
        this.port = await findAvailablePortFromCandidates(this.candidatePorts, {
          allowRandomFallback: this.allowRandomPortFallback,
          host: this.host,
        })
      } else {
        this.port = await findAvailablePort(this.preferredPort, this.host)
      }
    }
  }

  appendOutput(source, chunk) {
    pushOutput(this.outputLines, source, chunk, this.maxOutputLines)
    if (this.logOutput) {
      const target = source === 'stderr' ? process.stderr : process.stdout
      target.write(chunk)
    }
  }

  async probe(path = this.runtimeHealthPath ?? this.healthPath, timeoutMs = 4_000) {
    if (!this.baseUrl) {
      return {
        ok: false,
        status: null,
        error: 'preview-shell has not started',
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(new URL(path, this.baseUrl).toString(), {
        redirect: 'manual',
        signal: controller.signal,
      })

      return {
        ok: response.status >= 200 && response.status < 500,
        status: response.status,
        error: null,
      }
    } catch (error) {
      return {
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : String(error),
      }
    } finally {
      clearTimeout(timer)
    }
  }

  async isHealthy(path = this.runtimeHealthPath ?? this.healthPath) {
    if (this.exitInfo) return false
    const probe = await this.probe(path)
    return probe.ok
  }

  formatDiagnosticsLines() {
    const lines = [
      `preview baseUrl: ${this.baseUrl ?? 'n/a'}`,
      `preview port: ${this.port ?? 'n/a'}`,
      `preview mode: ${this.serverMode}`,
      `preview healthPath: ${this.runtimeHealthPath ?? this.healthPath}`,
      `preview running: ${this.child && this.child.exitCode === null ? 'yes' : 'no'}`,
    ]

    if (this.startedAt) {
      lines.push(`preview startedAt: ${this.startedAt}`)
    }
    if (this.exitInfo) {
      lines.push(
        `preview exited: code=${this.exitInfo.code ?? 'unknown'} signal=${this.exitInfo.signal ?? 'none'}`
      )
      if (this.exitInfo.at) {
        lines.push(`preview exitedAt: ${this.exitInfo.at}`)
      }
    }

    if (this.outputLines.length > 0) {
      lines.push('preview recent output:')
      lines.push(...this.outputLines)
    }

    if (this.localApiBridge) {
      lines.push(...this.localApiBridge.formatDiagnosticsLines())
    }

    return lines
  }

  async start() {
    if (this.child && this.child.exitCode === null) {
      return this
    }

    await this.ensurePort()
    this.stopRequested = false
    this.exitInfo = null
    this.startedAt = new Date().toISOString()

    this.effectiveEnv = this.env
    if (shouldAutoStartLocalApiBridge(this.env)) {
      try {
        this.localApiBridge = this.localApiBridgeFactory(this.env)
        await this.localApiBridge.start()
        this.effectiveEnv = {
          ...this.env,
          ...this.localApiBridge.envPatch,
        }
      } catch (error) {
        const canUseConfiguredOrigins = hasConfiguredLocalApiOrigins(this.env)
        if (!canUseConfiguredOrigins) {
          throw error
        }

        this.localApiBridge = null
        this.effectiveEnv = {
          ...this.env,
          ...buildConfiguredLocalApiOriginPatch(this.env),
        }
        const message = error instanceof Error ? error.message : String(error)
        this.outputLines.push(
          `[${new Date().toISOString()}] stderr: Local API bridge unavailable, falling back to configured origins: ${message}`
        )
      }
    }

    const useWranglerPagesRuntime =
      this.serverMode === 'pages' && shouldUseWranglerPagesRuntime(this.effectiveEnv)
    const serverArgs =
      this.serverMode === 'pages'
        ? useWranglerPagesRuntime
          ? [
              'x',
              'wrangler',
              'pages',
              'dev',
              'dist',
              '--port',
              String(this.port),
              '--ip',
              this.host,
              ...getWranglerBindingArgs(this.effectiveEnv),
            ]
          : getBunRuntimeArgs({
              env: this.effectiveEnv,
              includeRunSubcommand: true,
              runArgs: [
                LOCAL_PAGES_PREVIEW_SCRIPT,
                '--port',
                String(this.port),
                '--host',
                this.host,
              ],
            })
        : getBunRuntimeArgs({
            env: this.effectiveEnv,
            includeRunSubcommand: true,
            runArgs: ['preview', '--port', String(this.port)],
          })
    this.runtimeHealthPath =
      this.serverMode === 'pages' && !useWranglerPagesRuntime ? '/health/ready' : null

    let spawnError = null
    const command = buildSpawnCommand(getBunExecutable({ env: this.effectiveEnv }), serverArgs)
    const server = this.serverSpawner(command.command, command.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: command.shell,
      env: this.effectiveEnv,
    })

    this.child = server

    server.stdout?.on('data', (chunk) => this.appendOutput('stdout', chunk))
    server.stderr?.on('data', (chunk) => this.appendOutput('stderr', chunk))
    server.on('close', (code, signal) => {
      this.exitInfo = {
        code,
        signal,
        at: new Date().toISOString(),
        requested: this.stopRequested,
      }
    })
    server.on('error', (error) => {
      spawnError = error
      this.exitInfo = {
        code: null,
        signal: null,
        at: new Date().toISOString(),
        requested: this.stopRequested,
        error: error instanceof Error ? error.message : String(error),
      }
    })

    const startedAt = Date.now()
    while (Date.now() - startedAt < this.startupTimeoutMs) {
      if (spawnError) {
        await this.stop()
        throw spawnError
      }

      if (server.exitCode !== null) {
        await this.stop()
        throw new Error(
          `Preview server exited before becoming ready (code ${server.exitCode ?? 'unknown'})`
        )
      }

      const probe = await this.probe()
      if (probe.ok) {
        return this
      }

      await wait(PREVIEW_READY_POLL_INTERVAL_MS)
    }

    await this.stop()
    throw new Error(`Preview server startup timeout on port ${this.port}`)
  }

  async stop() {
    const child = this.child
    this.child = null
    const bridge = this.localApiBridge
    this.localApiBridge = null
    if (!child) {
      await bridge?.stop()
      return
    }

    this.stopRequested = true
    child.stdout?.destroy?.()
    child.stderr?.destroy?.()
    await terminateProcessTree(child.pid)
    await waitForProcessExit(child, 2_000)
    child.unref?.()
    if (child.pid && (await isProcessRunning(child.pid))) {
      await terminateProcessTree(child.pid)
      await waitForPidExit(child.pid, 5_000)
    }
    await terminateProcessesListeningOnPort(this.port)
    await wait(PREVIEW_PORT_CLEANUP_SETTLE_MS)
    await terminateProcessesListeningOnPort(this.port)
    await bridge?.stop()
  }

  async restart() {
    await this.stop()
    return this.start()
  }
}
