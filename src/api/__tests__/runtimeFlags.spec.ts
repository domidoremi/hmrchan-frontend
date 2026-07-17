import { afterEach, describe, expect, it, vi } from 'vitest'

import { shouldUseApiFallback, shouldUseScheduleApi } from '@/api/runtimeFlags'

describe('runtimeFlags', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(['true', '1', 'yes', 'on'])('forces fallback content when force flag is %s', (value) => {
    vi.stubEnv('VITE_HMRCHAN_FORCE_FALLBACK', value)
    vi.stubEnv('VITE_HMRCHAN_ENABLE_API', 'true')

    expect(shouldUseApiFallback()).toBe(true)
  })

  it.each(['false', '0', 'no', 'off'])('uses fallback content when API flag is %s', (value) => {
    vi.stubEnv('VITE_HMRCHAN_FORCE_FALLBACK', 'false')
    vi.stubEnv('VITE_HMRCHAN_ENABLE_API', value)

    expect(shouldUseApiFallback()).toBe(true)
  })

  it('keeps API content enabled when flags are unset or explicitly enabled', () => {
    expect(shouldUseApiFallback()).toBe(false)

    vi.stubEnv('VITE_HMRCHAN_FORCE_FALLBACK', 'false')
    vi.stubEnv('VITE_HMRCHAN_ENABLE_API', 'true')

    expect(shouldUseApiFallback()).toBe(false)
  })

  it('ignores unknown flag values', () => {
    vi.stubEnv('VITE_HMRCHAN_FORCE_FALLBACK', 'sometimes')
    vi.stubEnv('VITE_HMRCHAN_ENABLE_API', 'maybe')

    expect(shouldUseApiFallback()).toBe(false)
  })

  it('disables schedule requests independently while keeping the rest of the API enabled', () => {
    vi.stubEnv('VITE_HMRCHAN_FORCE_FALLBACK', 'false')
    vi.stubEnv('VITE_HMRCHAN_ENABLE_API', 'true')
    vi.stubEnv('VITE_ENABLE_SCHEDULE_API', 'false')

    expect(shouldUseApiFallback()).toBe(false)
    expect(shouldUseScheduleApi()).toBe(false)
  })

  it('enables schedule requests by default when the API is available', () => {
    expect(shouldUseScheduleApi()).toBe(true)

    vi.stubEnv('VITE_ENABLE_SCHEDULE_API', 'true')
    expect(shouldUseScheduleApi()).toBe(true)
  })
})
