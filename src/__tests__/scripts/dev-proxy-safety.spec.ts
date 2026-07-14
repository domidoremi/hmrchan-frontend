import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCAL_API_PROXY_TARGET,
  assertDevProxyTargetsAllowed,
  rewriteDevProxyCookies,
} from '../../../scripts/lib/dev-proxy-safety'

describe('dev proxy safety', () => {
  it('uses a loopback default and refuses implicit production targets', () => {
    expect(DEFAULT_LOCAL_API_PROXY_TARGET).toBe('http://127.0.0.1:8000')
    expect(() => assertDevProxyTargetsAllowed(['https://api.momichan.com'], false)).toThrow(
      'Development proxy refuses production API target'
    )
    expect(() => assertDevProxyTargetsAllowed(['https://api.momichan.com'], true)).not.toThrow()
  })

  it('fails closed for invalid targets and production endpoints in any proxy slot', () => {
    expect(() => assertDevProxyTargetsAllowed(['not-a-url'], false)).toThrow()

    const targets = [
      'http://127.0.0.1:8000',
      'https://identity.api.momichan.com',
      'http://127.0.0.1:8001',
      'http://127.0.0.1:8002',
    ]
    expect(() => assertDevProxyTargetsAllowed(targets, false)).toThrow(
      'Development proxy refuses production API target'
    )
  })

  it('preserves Secure on remote cookies unless the downgrade is explicitly enabled', () => {
    const cookies = ['session=secret; Path=/; Secure; HttpOnly']

    expect(rewriteDevProxyCookies(cookies, 'https://api.momichan.com', false)).toEqual(cookies)
    expect(rewriteDevProxyCookies(cookies, 'https://api.momichan.com', true)).toEqual([
      'session=secret; Path=/; HttpOnly',
    ])
    expect(rewriteDevProxyCookies(cookies, 'http://127.0.0.1:8000', false)).toEqual([
      'session=secret; Path=/; HttpOnly',
    ])
  })
})
