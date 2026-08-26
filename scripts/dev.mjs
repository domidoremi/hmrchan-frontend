#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createConnection } from 'node:net'

import {
  assertDevOriginIsSafe,
  buildViteArgs,
  parseDevServerArgs,
} from './lib/dev-server-guard.mjs'
import { LocalApiBridgeManager } from './lib/preview-shell.js'

const LOCAL_API_BRIDGE_TIMEOUT_MS = 20_000
const LOCAL_API_ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
]

function readEnvFileValue(filePath, key) {
  if (!existsSync(filePath)) return null

  let contents
  try {
    contents = readFileSync(filePath, 'utf8')
  } catch {
    return null
  }

  const line = contents.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, 'm'))?.[1]
  if (!line) return null

  return line.replace(/^['"]|['"]$/g, '').trim() || null
}

function resolveConfiguredApiTarget() {
  if (typeof process.env.VITE_API_BASE_URL === 'string' && process.env.VITE_API_BASE_URL.trim()) {
    return process.env.VITE_API_BASE_URL.trim()
  }

  for (const file of LOCAL_API_ENV_FILES) {
    const value = readEnvFileValue(file, 'VITE_API_BASE_URL')
    if (value) return value
  }

  return 'http://127.0.0.1:8000'
}

function resolveConfiguredFlag(key, fallback = null) {
  if (typeof process.env[key] === 'string' && process.env[key].trim()) {
    return process.env[key].trim()
  }

  for (const file of LOCAL_API_ENV_FILES) {
    const value = readEnvFileValue(file, key)
    if (value) return value
  }

  return fallback
}

function isLoopbackApiTarget(target) {
  try {
    const url = new URL(target)
    return (
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1') &&
      (url.port === '' || url.port === '8000')
    )
  } catch {
    return false
  }
}

function isTcpReachable(target, timeoutMs = 500) {
  return new Promise((resolve) => {
    let settled = false
    let socket
    const finish = (reachable) => {
      if (settled) return
      settled = true
      socket?.destroy()
      resolve(reachable)
    }

    try {
      const url = new URL(target)
      socket = createConnection({
        host: url.hostname,
        port: Number(url.port || 80),
      })
      socket.setTimeout(timeoutMs)
      socket.once('connect', () => finish(true))
      socket.once('timeout', () => finish(false))
      socket.once('error', () => finish(false))
    } catch {
      finish(false)
    }
  })
}

async function prepareDevEnvironment() {
  const configuredTarget = resolveConfiguredApiTarget()
  const autoBridge = resolveConfiguredFlag('LOCAL_API_AUTO_BRIDGE', 'true') !== 'false'
  if (!autoBridge || !isLoopbackApiTarget(configuredTarget)) {
    return { env: process.env, bridge: null }
  }

  if (await isTcpReachable(configuredTarget)) {
    return { env: process.env, bridge: null }
  }

  const bridge = new LocalApiBridgeManager({
    env: process.env,
    startupTimeoutMs: LOCAL_API_BRIDGE_TIMEOUT_MS,
  })
  try {
    await bridge.start()
    const env = {
      ...process.env,
      ...bridge.envPatch,
    }
    console.log(`local API bridge: ${env.VITE_API_BASE_URL} (Docker backend)`)
    return { env, bridge }
  } catch (error) {
    await bridge.stop()
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `local API bridge unavailable; keeping ${configuredTarget} as the dev proxy target. ${message}`
    )
    return { env: process.env, bridge: null }
  }
}

async function runNodeScript(scriptPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${scriptPath} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const passthroughArgs = process.argv.slice(2)
  const options = parseDevServerArgs(passthroughArgs)

  if (options.strictPort) {
    await assertDevOriginIsSafe({
      port: options.port,
    })
  }

  await runNodeScript('scripts/patch-lucide.mjs')

  const { env, bridge } = await prepareDevEnvironment()

  const viteArgs = buildViteArgs(passthroughArgs, {
    host: options.host,
    strictPort: options.strictPort,
  })

  if (options.strictPort) {
    console.log(`dev server target: http://${options.host}:${options.port}/`)
  } else {
    console.log(
      `dev server target starts at http://${options.host}:${options.port}/ and will use the next available port automatically`
    )
  }

  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...viteArgs], {
    stdio: 'inherit',
    shell: false,
    env,
  })

  child.on('exit', async (code, signal) => {
    await bridge?.stop()
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    void bridge?.stop()
    console.error(error)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
