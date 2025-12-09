/**
 * Nuclear option: Intercept ALL XMLHttpRequest AND fetch at the browser level
 * This runs before axios, service worker, everything
 */

import logger from './logger'

const LOG_CONTEXT = { category: 'HTTPS-Enforcer' }

// Helper function to force HTTPS
function forceHttpsUrl(url: string | URL): string {
  const urlString = typeof url === 'string' ? url : url.toString()

  // Force HTTPS if URL is HTTP and points to api.momichan.xyz
  if (urlString.includes('api.momichan.xyz') && urlString.startsWith('http://')) {
    const httpsUrl = urlString.replace('http://', 'https://')
    logger.error(`🚨 Forced HTTP → HTTPS: ${urlString} → ${httpsUrl}`, LOG_CONTEXT)
    return httpsUrl
  }

  return urlString
}

// ==================== Intercept XMLHttpRequest ====================
const OriginalXHR = window.XMLHttpRequest

class HttpsXHR extends OriginalXHR {
  constructor() {
    super()
    logger.debug('[XHR] New XMLHttpRequest created via interceptor', LOG_CONTEXT)
  }

  open(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    const urlString = typeof url === 'string' ? url : url.toString()
    logger.debug(`[XHR] open() called with URL: ${urlString}`, LOG_CONTEXT)

    const finalUrl = forceHttpsUrl(url)

    if (finalUrl !== urlString) {
      logger.error(`🚨 [XHR] FORCED HTTPS: ${urlString} → ${finalUrl}`, LOG_CONTEXT)
    }

    // Call original open with forced HTTPS URL
    if (async !== undefined) {
      if (username !== undefined) {
        super.open(method, finalUrl, async, username, password)
      } else {
        super.open(method, finalUrl, async)
      }
    } else {
      super.open(method, finalUrl)
    }
  }

  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    logger.debug(`[XHR] send() called, responseURL: ${this.responseURL}`, LOG_CONTEXT)
    super.send(body)
  }
}

window.XMLHttpRequest = HttpsXHR as unknown as typeof XMLHttpRequest
logger.debug('🔒 [XHR Interceptor] Installed', LOG_CONTEXT)

// ==================== Intercept fetch ====================
const originalFetch = window.fetch

window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url: string
  const inputType = input instanceof Request ? 'Request' : typeof input

  logger.debug(`[Fetch] Called with input type: ${inputType}`, LOG_CONTEXT)

  if (typeof input === 'string') {
    logger.debug(`[Fetch] String URL: ${input}`, LOG_CONTEXT)
    url = forceHttpsUrl(input)
    if (url !== input) {
      logger.error(`🚨 [Fetch] FORCED STRING URL: ${input} → ${url}`, LOG_CONTEXT)
    }
    return originalFetch(url, init)
  } else if (input instanceof URL) {
    const originalUrlStr = input.toString()
    logger.debug(`[Fetch] URL object: ${originalUrlStr}`, LOG_CONTEXT)
    url = forceHttpsUrl(originalUrlStr)
    if (url !== originalUrlStr) {
      logger.error(`🚨 [Fetch] FORCED URL object: ${originalUrlStr} → ${url}`, LOG_CONTEXT)
    }
    return originalFetch(url, init)
  } else if (input instanceof Request) {
    const originalUrl = input.url
    logger.debug(`[Fetch] Request object URL: ${originalUrl}`, LOG_CONTEXT)
    const forcedUrl = forceHttpsUrl(originalUrl)

    if (originalUrl !== forcedUrl) {
      logger.error(`🚨 [Fetch] FORCED Request URL: ${originalUrl} → ${forcedUrl}`, LOG_CONTEXT)
      // Create new Request with HTTPS URL
      const newRequest = new Request(forcedUrl, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
      })
      return originalFetch(newRequest, init)
    }
    return originalFetch(input, init)
  }

  logger.debug('[Fetch] Unexpected input type, passing through', LOG_CONTEXT)
  return originalFetch(input, init)
}

logger.debug('🔒 [Fetch Interceptor] Installed', LOG_CONTEXT)
logger.debug('🔒 All HTTP requests to api.momichan.xyz will be forced to HTTPS', LOG_CONTEXT)

export {}
