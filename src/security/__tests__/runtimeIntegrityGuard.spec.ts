import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reporter = vi.hoisted(() => ({
  reportClientEvent: vi.fn(),
}))

vi.mock('@/utils/clientReporter', () => ({
  reportClientEvent: reporter.reportClientEvent,
}))

async function loadGuardModule(): Promise<typeof import('../runtimeIntegrityGuard')> {
  vi.resetModules()
  return import('../runtimeIntegrityGuard')
}

describe('runtime integrity guard', () => {
  beforeEach(() => {
    vi.stubEnv('PROD', true)
    reporter.reportClientEvent.mockReset()
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  afterEach(async () => {
    const { resetRiskMode } = await import('../runtimeState')
    resetRiskMode()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('does not degrade when only stylesheet links lack integrity', async () => {
    document.head.innerHTML = `
      <script src="/assets/index.js" integrity="sha384-script"></script>
      <link rel="stylesheet" href="/assets/index.css">
    `

    const { initRuntimeIntegrityGuard } = await loadGuardModule()
    const { getRiskMode } = await import('../runtimeState')

    initRuntimeIntegrityGuard()

    expect(getRiskMode()).toBe('normal')
    expect(reporter.reportClientEvent).not.toHaveBeenCalled()
  })

  it('degrades when executable same-origin assets lack integrity', async () => {
    document.head.innerHTML = `
      <script src="/assets/index.js"></script>
      <link rel="modulepreload" href="/assets/profile.js">
    `

    const { initRuntimeIntegrityGuard } = await loadGuardModule()
    const { getRiskMode } = await import('../runtimeState')

    initRuntimeIntegrityGuard()

    expect(getRiskMode()).toBe('degraded')
    expect(reporter.reportClientEvent).toHaveBeenCalledWith(
      'security.runtime_integrity.degraded',
      expect.objectContaining({
        reason: 'missing-integrity',
        assetCount: 2,
      }),
      expect.objectContaining({
        category: 'security',
        severity: 'warn',
      })
    )
  })
})
