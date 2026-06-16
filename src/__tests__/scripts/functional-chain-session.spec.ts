import { describe, expect, it } from 'vitest'

import {
  assertAuthenticatedUuidSession,
  assertUnauthenticatedSession,
  buildCookieHeaderFromCookieRecords,
  buildCookieHeaderFromSetCookieHeaders,
  buildOriginCsrfMaterial,
  getBffSessionSetCookieHeaders,
  hasSessionSetCookie,
  parseBffSessionCookieForBrowser,
  readSessionUserId,
} from '../../../scripts/lib/functional-chain-session.js'

const BASE_URL = 'https://next.momichan.com'
const USER_ID = '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1'

describe('functional chain session helpers', () => {
  it('extracts and parses BFF session cookies for browser replay', () => {
    const headers = {
      getSetCookie: () => [
        '__Host-momi_bff_at=access-token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=60',
        '__Host-momi_bff_rt=refresh-token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=120',
      ],
    }
    const cookies = getBffSessionSetCookieHeaders(headers)
    const parsed = parseBffSessionCookieForBrowser(BASE_URL, cookies[0]!, 1_000)

    expect(cookies).toHaveLength(2)
    expect(hasSessionSetCookie(cookies)).toBe(true)
    expect(parsed).toMatchObject({
      name: '__Host-momi_bff_at',
      value: 'access-token',
      url: BASE_URL,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      expires: 61,
    })
  })

  it('splits combined Set-Cookie fallback headers for BFF session cookies', () => {
    const headers = {
      get: (name: string) =>
        name.toLowerCase() === 'set-cookie'
          ? '__Host-momi_bff_at=access-token; Path=/; Max-Age=60, __Host-momi_bff_rt=refresh-token; Path=/; Max-Age=120'
          : null,
    }

    expect(getBffSessionSetCookieHeaders(headers)).toEqual([
      '__Host-momi_bff_at=access-token; Path=/; Max-Age=60',
      '__Host-momi_bff_rt=refresh-token; Path=/; Max-Age=120',
    ])
  })

  it('drops cleared or unrelated cookies from session replay material', () => {
    const headers = ['__Host-momi_bff_at=; Path=/; Max-Age=0', 'theme=dark; Path=/; Max-Age=60']

    expect(hasSessionSetCookie(headers)).toBe(false)
    expect(buildCookieHeaderFromSetCookieHeaders(headers, BASE_URL, 'peer')).toBe(
      '__Host-momi_origin_csrf=functional-chain-csrf-peer'
    )
  })

  it('builds role-scoped CSRF and cookie headers for dual-user isolation probes', () => {
    const localCsrf = buildOriginCsrfMaterial('http://127.0.0.1:4173', 'primary-probe')
    const peerCookieHeader = buildCookieHeaderFromCookieRecords(BASE_URL, 'peer', [
      { name: '__Host-momi_bff_at', value: 'peer-access' },
      { name: '__Host-momi_bff_rt', value: 'peer-refresh' },
      { name: 'momi_origin_csrf', value: 'primary-token' },
    ])

    expect(localCsrf).toEqual({
      cookieName: 'momi_origin_csrf',
      cookieHeader: 'momi_origin_csrf=functional-chain-csrf-primary-probe',
      token: 'functional-chain-csrf-primary-probe',
    })
    expect(peerCookieHeader).toBe(
      '__Host-momi_bff_at=peer-access; __Host-momi_bff_rt=peer-refresh; __Host-momi_origin_csrf=functional-chain-csrf-peer'
    )
    expect(peerCookieHeader).not.toContain('primary-token')
  })

  it('asserts authenticated and unauthenticated session probes without leaking identity state', () => {
    const authenticatedProbe = {
      status: 200,
      body: {
        authenticated: true,
        user: { id: USER_ID },
      },
    }
    const nestedUnauthenticatedProbe = {
      status: 200,
      body: {
        data: {
          authenticated: false,
        },
      },
    }

    expect(readSessionUserId(authenticatedProbe)).toBe(USER_ID)
    expect(() => assertAuthenticatedUuidSession(authenticatedProbe, 'peer')).not.toThrow()
    expect(() =>
      assertUnauthenticatedSession(nestedUnauthenticatedProbe, 'primary probe')
    ).not.toThrow()
    expect(() =>
      assertAuthenticatedUuidSession({ status: 200, body: { authenticated: true } }, 'missing')
    ).toThrow('user.id is not a UUID string')
  })
})
