import { afterEach, describe, expect, it, vi } from 'vitest'

import { getScreenResolution, getTimezone } from '@/utils/device'

describe('device utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats the current screen dimensions for client security payloads', () => {
    Object.defineProperty(window, 'screen', {
      configurable: true,
      value: { height: 844, width: 390 },
    })

    expect(getScreenResolution()).toBe('390x844')
  })

  it('reads the browser timezone from Intl resolved options', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'Asia/Taipei' }),
    } as Intl.DateTimeFormat)

    expect(getTimezone()).toBe('Asia/Taipei')
  })
})
