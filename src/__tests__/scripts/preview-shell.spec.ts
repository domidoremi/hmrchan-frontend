import { describe, expect, it } from 'vitest'
import { EventEmitter } from 'node:events'

import { PreviewShellManager } from '../../../scripts/lib/preview-shell.js'

describe('preview shell local bridge fallback', () => {
  it('pins managed preview to 127.0.0.1 by default', () => {
    const manager = new PreviewShellManager()
    expect(manager.host).toBe('127.0.0.1')
  })

  it('starts the Docker bridge for configured single-label service origins', async () => {
    const env = {
      PRIMARY_USERNAME: 'local-smoke-main',
      PRIMARY_PASSWORD: 'Smoke#20260416!',
      API_BASE_URL: 'http://caddy',
      VITE_API_BASE_URL: 'http://caddy',
      BACKEND_INTERNAL_ORIGIN: 'http://identity-api:8000',
      VITE_IDENTITY_API_BASE_URL: 'http://identity-api:8000',
      VITE_COMMUNITY_API_BASE_URL: 'http://community-api:8000',
      VITE_CONTENT_API_BASE_URL: 'http://content-api:8000',
      BUN_EXECUTABLE: 'bun',
    }
    let bridgeStarted = false

    const manager = new PreviewShellManager({
      env,
      preferredPort: 0,
      serverMode: 'pages',
      startupTimeoutMs: 10_000,
      localApiBridgeFactory: () => ({
        envPatch: {
          API_BASE_URL: 'http://127.0.0.1:19080',
          BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
        },
        async start() {
          bridgeStarted = true
        },
        async stop() {},
        formatDiagnosticsLines() {
          return []
        },
      }),
      serverSpawner: () => {
        const child = new EventEmitter() as EventEmitter & {
          pid: number
          exitCode: number | null
          killed: boolean
          stdout: EventEmitter
          stderr: EventEmitter
        }
        child.pid = 0
        child.exitCode = null
        child.killed = true
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        return child
      },
    })
    manager.probe = async () => ({ ok: true, status: 200 })

    await manager.start()

    expect(bridgeStarted).toBe(true)
    expect(manager.effectiveEnv).toMatchObject({
      API_BASE_URL: 'http://127.0.0.1:19080',
      BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
    })

    await manager.stop()
  })

  it('keeps explicitly configured loopback origins without starting a bridge', async () => {
    const env = {
      PRIMARY_USERNAME: 'local-smoke-main',
      PRIMARY_PASSWORD: 'Smoke#20260416!',
      API_BASE_URL: 'http://127.0.0.1:19080',
      VITE_API_BASE_URL: 'http://127.0.0.1:19080',
      BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
      VITE_IDENTITY_API_BASE_URL: 'http://127.0.0.1:19081',
      VITE_COMMUNITY_API_BASE_URL: 'http://127.0.0.1:19082',
      VITE_CONTENT_API_BASE_URL: 'http://127.0.0.1:19083',
      BUN_EXECUTABLE: 'bun',
    }

    const manager = new PreviewShellManager({
      env,
      preferredPort: 0,
      serverMode: 'pages',
      startupTimeoutMs: 10_000,
      localApiBridgeFactory: () => {
        throw new Error('loopback origins must not start the Docker bridge')
      },
      serverSpawner: () => {
        const child = new EventEmitter() as EventEmitter & {
          pid: number
          exitCode: number | null
          killed: boolean
          stdout: EventEmitter
          stderr: EventEmitter
        }
        child.pid = 0
        child.exitCode = null
        child.killed = true
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        return child
      },
    })
    manager.probe = async () => ({ ok: true, status: 200 })

    await manager.start()

    expect(manager.localApiBridge).toBeNull()
    expect(manager.effectiveEnv).toBe(env)

    await manager.stop()
  })

  it('falls back to configured local origins when Docker bridge bootstrap is unavailable', async () => {
    const env = {
      LOCAL_AUDIT_AUTO_API_BRIDGE: 'true',
      PRIMARY_USERNAME: 'local-smoke-main',
      PRIMARY_PASSWORD: 'Smoke#20260416!',
      BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
      VITE_IDENTITY_API_BASE_URL: 'http://127.0.0.1:19081',
      VITE_COMMUNITY_API_BASE_URL: 'http://127.0.0.1:19082',
      VITE_CONTENT_API_BASE_URL: 'http://127.0.0.1:19083',
      API_BASE_URL: 'http://127.0.0.1:19080',
      BUN_EXECUTABLE: 'bun',
    }

    const manager = new PreviewShellManager({
      env,
      preferredPort: 0,
      serverMode: 'pages',
      startupTimeoutMs: 10_000,
      localApiBridgeFactory: () => ({
        envPatch: {},
        async start() {
          throw new Error('docker info timed out after 20000ms')
        },
        async stop() {},
      }),
      serverSpawner: () => {
        const child = new EventEmitter() as EventEmitter & {
          pid: number
          exitCode: number | null
          killed: boolean
          stdout: EventEmitter
          stderr: EventEmitter
        }
        child.pid = 0
        child.exitCode = null
        child.killed = true
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        return child
      },
    })
    manager.probe = async () => ({ ok: true, status: 200 })

    await manager.start()

    expect(manager.baseUrl).toBeTruthy()
    expect(manager.effectiveEnv).toMatchObject({
      API_BASE_URL: 'http://127.0.0.1:19080',
      VITE_API_BASE_URL: 'http://127.0.0.1:19080',
      BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
      VPC_API_ORIGIN: 'http://127.0.0.1:19080',
      VPC_IDENTITY_API_ORIGIN: 'http://127.0.0.1:19081',
      VITE_IDENTITY_API_BASE_URL: 'http://127.0.0.1:19081',
      VITE_COMMUNITY_API_BASE_URL: 'http://127.0.0.1:19082',
      VITE_CONTENT_API_BASE_URL: 'http://127.0.0.1:19083',
      VPC_COMMUNITY_API_ORIGIN: 'http://127.0.0.1:19082',
      VPC_CONTENT_API_ORIGIN: 'http://127.0.0.1:19083',
      ENABLE_INTERNAL_API_GATEWAY: 'true',
    })
    expect(manager.localApiBridge).toBeNull()
    expect(manager.formatDiagnosticsLines().join('\n')).toContain(
      'Local API bridge unavailable, falling back to configured origins'
    )

    await manager.stop()
  }, 30_000)
})
