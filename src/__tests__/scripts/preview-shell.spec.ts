import { describe, expect, it } from 'vitest'

import { PreviewShellManager } from '../../../scripts/lib/preview-shell.js'

describe('preview shell local bridge fallback', () => {
  it('pins managed preview to 127.0.0.1 by default', () => {
    const manager = new PreviewShellManager()
    expect(manager.host).toBe('127.0.0.1')
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
      BUN_EXECUTABLE: 'bun',
    }

    const manager = new PreviewShellManager({
      env,
      preferredPort: 0,
      serverMode: 'pages',
      startupTimeoutMs: 10_000,
    })

    await manager.start()

    expect(manager.baseUrl).toBeTruthy()
    expect(manager.effectiveEnv).toMatchObject({
      API_BASE_URL: 'http://127.0.0.1:19081',
      VITE_API_BASE_URL: 'http://127.0.0.1:19081',
      BACKEND_INTERNAL_ORIGIN: 'http://127.0.0.1:19081',
      VPC_API_ORIGIN: 'http://127.0.0.1:19081',
      VPC_IDENTITY_API_ORIGIN: 'http://127.0.0.1:19081',
      VITE_IDENTITY_API_BASE_URL: 'http://127.0.0.1:19081',
      VITE_COMMUNITY_API_BASE_URL: 'http://127.0.0.1:19082',
      VITE_CONTENT_API_BASE_URL: 'http://127.0.0.1:19083',
      VPC_COMMUNITY_API_ORIGIN: 'http://127.0.0.1:19082',
      VPC_CONTENT_API_ORIGIN: 'http://127.0.0.1:19083',
    })
    expect(manager.localApiBridge).toBeNull()
    expect(manager.formatDiagnosticsLines().join('\n')).toContain(
      'Local API bridge unavailable, falling back to configured origins'
    )

    await manager.stop()
  }, 30_000)
})
