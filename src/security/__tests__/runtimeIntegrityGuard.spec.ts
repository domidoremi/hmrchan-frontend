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

  it.each([
    'https://static.cloudflareinsights.com/beacon.min.js',
    'https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092',
  ])('accepts the deployed Cloudflare beacon with nonce and integrity: %s', async (src) => {
    document.head.innerHTML = `<script src="${src}" nonce="release-nonce" integrity="sha384-beacon"></script>`
    const { initRuntimeIntegrityGuard } = await loadGuardModule()
    const { getRiskMode } = await import('../runtimeState')
    const teardown = initRuntimeIntegrityGuard()
    expect(getRiskMode()).toBe('normal')
    expect(reporter.reportClientEvent).not.toHaveBeenCalled()
    teardown()
  })

  it.each([
    '<script src="https://static.cloudflareinsights.com/beacon.min.js" nonce="release-nonce"></script>',
    '<script src="https://static.cloudflareinsights.com/beacon.min.js" integrity="sha384-beacon"></script>',
    '<script src="https://other.example/beacon.min.js" nonce="release-nonce" integrity="sha384-beacon"></script>',
    '<script src="https://static.cloudflareinsights.com.other.example/beacon.min.js" nonce="release-nonce" integrity="sha384-beacon"></script>',
    '<script src="https://static.cloudflareinsights.com/other.js" nonce="release-nonce" integrity="sha384-beacon"></script>',
    '<script src="http://static.cloudflareinsights.com/beacon.min.js" nonce="release-nonce" integrity="sha384-beacon"></script>',
    '<link rel="modulepreload" href="https://static.cloudflareinsights.com/beacon.min.js" nonce="release-nonce" integrity="sha384-beacon">',
  ])('rejects executable assets outside the beacon policy: %s', async (markup) => {
    document.head.innerHTML = markup
    const { initRuntimeIntegrityGuard } = await loadGuardModule()
    const { getRiskMode } = await import('../runtimeState')
    const teardown = initRuntimeIntegrityGuard()
    expect(getRiskMode()).toBe('degraded')
    teardown()
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
