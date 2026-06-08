import { isUuidString } from './functional-chain-matrix.js'

const BFF_SESSION_COOKIE_PATTERN = /^(?:__Host-)?momi_bff_(at|rt)$/

export function getBffSessionSetCookieHeaders(headers) {
  if (typeof headers?.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  return (headers?.get?.('Set-Cookie') ?? '')
    .split(/,(?=\s*(?:__Host-)?momi_bff_)/)
    .map((cookie) => cookie.trim())
    .filter(Boolean)
}

export function hasSessionSetCookie(cookies) {
  return cookies.some(
    (cookie) => /(?:__Host-)?momi_bff_(at|rt)=/.test(cookie) && !/Max-Age=0/i.test(cookie)
  )
}

export function parseBffSessionCookieForBrowser(baseUrl, cookie, nowMs = Date.now()) {
  const [nameValue = '', ...attributes] = cookie.split(';')
  const separatorIndex = nameValue.indexOf('=')
  if (separatorIndex <= 0) return null

  const name = nameValue.slice(0, separatorIndex).trim()
  if (!BFF_SESSION_COOKIE_PATTERN.test(name)) return null

  const parsed = {
    name,
    value: nameValue.slice(separatorIndex + 1).trim(),
    url: baseUrl,
    path: '/',
  }

  for (const rawAttribute of attributes) {
    const attribute = rawAttribute.trim()
    const lower = attribute.toLowerCase()
    if (lower === 'httponly') {
      parsed.httpOnly = true
    } else if (lower === 'secure') {
      parsed.secure = true
    } else if (lower.startsWith('path=')) {
      parsed.path = attribute.slice('path='.length) || '/'
    } else if (lower.startsWith('max-age=')) {
      const maxAge = Number.parseInt(attribute.slice('max-age='.length), 10)
      if (!Number.isFinite(maxAge) || maxAge <= 0) return null
      parsed.expires = Math.floor(nowMs / 1000) + maxAge
    } else if (lower.startsWith('expires=')) {
      const expires = Date.parse(attribute.slice('expires='.length))
      if (Number.isFinite(expires)) {
        parsed.expires = Math.floor(expires / 1000)
      }
    } else if (lower.startsWith('samesite=')) {
      const sameSite = attribute.slice('samesite='.length).toLowerCase()
      if (sameSite === 'strict') parsed.sameSite = 'Strict'
      else if (sameSite === 'none') parsed.sameSite = 'None'
      else parsed.sameSite = 'Lax'
    }
  }

  return parsed
}

export function buildOriginCsrfMaterial(baseUrl, role) {
  const url = new URL(baseUrl)
  const isLocalPreview = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  const cookieName = isLocalPreview ? 'momi_origin_csrf' : '__Host-momi_origin_csrf'
  const token = `functional-chain-csrf-${role.replace(/[^a-z0-9_-]/gi, '-')}`
  return {
    cookieName,
    cookieHeader: `${cookieName}=${token}`,
    token,
  }
}

export function buildCookieHeaderFromCookieRecords(baseUrl, role, cookies) {
  const csrf = buildOriginCsrfMaterial(baseUrl, role)
  const parts = cookies
    .filter((cookie) => BFF_SESSION_COOKIE_PATTERN.test(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
  parts.push(csrf.cookieHeader)
  return parts.join('; ')
}

export function buildCookieHeaderFromSetCookieHeaders(setCookieHeaders, baseUrl, role) {
  const parsedCookies = setCookieHeaders
    .map((cookie) => parseBffSessionCookieForBrowser(baseUrl, cookie))
    .filter((cookie) => cookie !== null)
  return buildCookieHeaderFromCookieRecords(baseUrl, role, parsedCookies)
}

export function readSessionUserId(probe) {
  const body = probe.body
  return body?.user?.id ?? body?.data?.user?.id
}

export function assertAuthenticatedUuidSession(probe, label) {
  if (probe.status !== 200) {
    throw new Error(`${label} session:resolve returned HTTP ${probe.status}`)
  }

  const body = probe.body
  const authenticated = body?.authenticated ?? body?.data?.authenticated
  if (authenticated !== true) {
    throw new Error(`${label} session:resolve did not return authenticated=true`)
  }

  const userId = readSessionUserId(probe)
  if (!isUuidString(userId)) {
    throw new Error(`${label} user.id is not a UUID string: ${String(userId ?? '')}`)
  }
}

export function assertUnauthenticatedSession(probe, label) {
  if (probe.status !== 200) {
    throw new Error(`${label} session:resolve returned HTTP ${probe.status}`)
  }

  const authenticated = probe.body?.authenticated ?? probe.body?.data?.authenticated
  if (authenticated !== false) {
    throw new Error(`${label} session:resolve expected authenticated=false`)
  }
}
