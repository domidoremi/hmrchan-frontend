import { describe, expect, it } from 'vitest'
import {
  LOCAL_PREVIEW_CSRF_COOKIE_NAME,
  withLocalPreviewCsrfCookie,
} from '../../../scripts/lib/local-preview-csrf'

describe('local preview CSRF cookie parity', () => {
  it('adds the production-named secure CSRF cookie to HTML responses', () => {
    const response = withLocalPreviewCsrfCookie(
      new Request('http://127.0.0.1:4173/login'),
      new Response('<!doctype html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    )

    expect(response.headers.get('Set-Cookie')).toMatch(
      new RegExp(
        `^${LOCAL_PREVIEW_CSRF_COOKIE_NAME}=[A-Za-z0-9_-]{32}; Path=/; Secure; SameSite=Lax; Max-Age=2592000$`
      )
    )
  })

  it('does not rotate an existing cookie or add cookies to non-HTML responses', () => {
    const requestWithCookie = new Request('http://127.0.0.1:4173/login', {
      headers: { Cookie: `${LOCAL_PREVIEW_CSRF_COOKIE_NAME}=existing-token` },
    })
    const htmlResponse = new Response('<!doctype html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
    const apiResponse = Response.json({ ok: true })

    expect(withLocalPreviewCsrfCookie(requestWithCookie, htmlResponse)).toBe(htmlResponse)
    expect(
      withLocalPreviewCsrfCookie(
        new Request('http://127.0.0.1:4173/api/v1/client/init'),
        apiResponse
      )
    ).toBe(apiResponse)
  })
})
