import { describe, expect, it } from 'vitest'

import { markClientInitDisabled, shouldEnableClientInit } from '../clientInit'

describe('client init gate', () => {
  it('enables client init unless the audit environment explicitly disables it', () => {
    expect(shouldEnableClientInit({})).toBe(true)
    expect(shouldEnableClientInit({ VITE_ENABLE_CLIENT_INIT: '' })).toBe(true)
    expect(shouldEnableClientInit({ VITE_ENABLE_CLIENT_INIT: 'true' })).toBe(true)
    expect(shouldEnableClientInit({ VITE_ENABLE_CLIENT_INIT: 'TRUE' })).toBe(true)
    expect(shouldEnableClientInit({ VITE_ENABLE_CLIENT_INIT: ' false ' })).toBe(false)
  })

  it('marks the document when client init is intentionally skipped', () => {
    const root = document.createElement('html')
    markClientInitDisabled({ documentElement: root })

    expect(root.dataset.clientInit).toBe('disabled')
  })
})
