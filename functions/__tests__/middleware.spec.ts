import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resolveHtmlDocumentWithEdgeData = vi.fn()
const resolveCanonicalUrl = vi.fn((config: { canonicalPath: string }) => {
  return `https://momichan.com${config.canonicalPath}`
})
const renderPrerenderShell = vi.fn(
  (config: { shellTitle: string }) =>
    `<section data-prerender-shell="true">${config.shellTitle}</section>`
)
const resolveStructuredDataPayload = vi.fn(() => '{"@context":"https://schema.org"}')

vi.mock('../../src/edge/detailDocumentResolver', () => ({
  resolveHtmlDocumentWithEdgeData,
}))

vi.mock('../../src/edge/htmlDocument', () => ({
  DEFAULT_OG_IMAGE: 'https://momichan.com/og-default.png',
  resolveCanonicalUrl,
  renderPrerenderShell,
  resolveStructuredDataPayload,
}))

class MockResponse {
  readonly body: string
  readonly headers: Headers
  readonly status: number
  readonly statusText: string

  constructor(body = '', init?: { headers?: HeadersInit; status?: number; statusText?: string }) {
    this.body = body
    this.headers = new Headers(init?.headers)
    this.status = init?.status ?? 200
    this.statusText = init?.statusText ?? 'OK'
  }

  clone() {
    return new MockResponse(this.body, {
      headers: this.headers,
      status: this.status,
      statusText: this.statusText,
    })
  }

  async text() {
    return this.body
  }

  async json() {
    return JSON.parse(this.body)
  }
}

class ElementWrapper {
  constructor(private readonly element: Element) {}

  getAttribute(name: string) {
    return this.element.getAttribute(name)
  }

  setAttribute(name: string, value: string) {
    this.element.setAttribute(name, value)
  }

  remove() {
    this.element.remove()
  }

  setInnerContent(content: string, options?: { html?: boolean }) {
    if (options?.html) {
      this.element.innerHTML = content
      return
    }

    this.element.textContent = content
  }
}

class MockHTMLRewriter {
  private handlers = new Map<string, { element(el: ElementWrapper): void }>()

  on(selector: string, handler: { element(el: ElementWrapper): void }) {
    this.handlers.set(selector, handler)
    return this
  }

  transform(response: MockResponse) {
    const document = new DOMParser().parseFromString(response.body, 'text/html')

    for (const [selector, handler] of this.handlers.entries()) {
      document.querySelectorAll(selector).forEach((node) => {
        handler.element(new ElementWrapper(node))
      })
    }

    return new MockResponse(document.documentElement.outerHTML, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    })
  }
}

describe('functions/_middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    resolveHtmlDocumentWithEdgeData.mockReset()
    resolveCanonicalUrl.mockClear()
    renderPrerenderShell.mockClear()
    resolveStructuredDataPayload.mockClear()

    vi.stubGlobal('Response', MockResponse)
    vi.stubGlobal('HTMLRewriter', MockHTMLRewriter)
    vi.stubGlobal('btoa', (value: string) => Buffer.from(value, 'binary').toString('base64'))
    vi.stubGlobal('crypto', {
      getRandomValues(array: Uint8Array) {
        for (let i = 0; i < array.length; i += 1) {
          array[i] = i + 1
        }
        return array
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects the www host to the canonical apex host', async () => {
    const next = vi.fn()
    const { onRequest } = await import('../_middleware')

    const response = await onRequest({
      request: new Request('https://www.momichan.com/explore?q=test'),
      env: {},
      next,
    } as never)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(308)
    expect(response.headers.get('Location')).toBe('https://momichan.com/explore?q=test')
    expect(response.headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    )
  })

  it('applies HTML security headers, rewrites metadata, and returns the edge status', async () => {
    resolveHtmlDocumentWithEdgeData.mockResolvedValue({
      status: 404,
      title: 'Page not found · MomiChan',
      description: 'missing page',
      robots: 'noindex, nofollow',
      ogType: 'website',
      canonicalPath: '/missing',
      ogImage: null,
      shellTitle: 'Page not found · MomiChan',
    })

    const { onRequest } = await import('../_middleware')
    const response = await onRequest({
      request: new Request('https://momichan.com/missing'),
      env: {},
      next: () =>
        Promise.resolve(
          new MockResponse(
            `<!doctype html>
            <html>
              <head>
                <title>Original title</title>
                <meta name="description" content="old description" />
                <meta name="robots" content="index, follow" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://old.example" />
                <meta property="og:title" content="Old title" />
                <meta property="og:description" content="Old description" />
                <meta property="og:image" content="https://old.example/image.png" />
                <meta name="twitter:title" content="Old title" />
                <meta name="twitter:description" content="Old description" />
                <meta name="twitter:url" content="https://old.example" />
                <meta name="twitter:image" content="https://old.example/image.png" />
                <link rel="canonical" href="https://old.example" />
                <script data-prerender-structured-data="true"></script>
                <script src="/assets/app.js"></script>
              </head>
              <body>
                <div id="app-root"></div>
              </body>
            </html>`,
            {
              headers: {
                'content-type': 'text/html; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
              },
            }
          )
        ),
    } as never)

    expect(response.status).toBe(404)
    expect(response.statusText).toBe('Not Found')
    const contentSecurityPolicy = response.headers.get('Content-Security-Policy')
    expect(contentSecurityPolicy).toMatch(/script-src 'self' 'nonce-/)
    expect(contentSecurityPolicy).toContain("script-src-attr 'none'")
    expect(contentSecurityPolicy).toContain("style-src-attr 'unsafe-inline'")
    expect(response.headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    )
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()

    const html = await response.text()
    expect(html).toContain('Page not found · MomiChan')
    expect(html).not.toContain('content="old description"')
    expect(html).not.toContain('https://old.example')
    expect(html).toContain('content="noindex, nofollow"')
    expect(html).toContain('href="https://momichan.com/missing"')
    expect(html).toContain('data-prerender-shell="true"')
    expect(html).toContain('data-prerender-structured-data="true"')
    expect(html).toContain('application/ld+json')
    expect(html).toMatch(/nonce="[A-Za-z0-9+/=]+"/)
  })

  it('treats passkey recovery detail as a no-store auth SPA route instead of a 404 document', async () => {
    const recoveryPath = '/auth/passkeys/recovery/01900000-0000-7000-8000-000000000001'
    resolveHtmlDocumentWithEdgeData.mockResolvedValue({
      status: 200,
      title: 'Account security · MomiChan',
      description: 'passkey recovery',
      robots: 'noindex, nofollow',
      ogType: 'website',
      canonicalPath: recoveryPath,
      ogImage: null,
      shellTitle: 'Secure your account',
    })

    const { onRequest } = await import('../_middleware')
    const response = await onRequest({
      request: new Request(`https://momichan.com${recoveryPath}`),
      env: {},
      next: () =>
        Promise.resolve(
          new MockResponse(
            '<!doctype html><html><head><title>App</title></head><body><div id="app-root"></div></body></html>',
            {
              headers: { 'content-type': 'text/html; charset=utf-8' },
              status: 200,
            }
          )
        ),
    } as never)

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    expect(resolveHtmlDocumentWithEdgeData).toHaveBeenCalledWith(
      new URL(`https://momichan.com${recoveryPath}`),
      {}
    )
  })

  it('passes through non-html responses unchanged', async () => {
    resolveHtmlDocumentWithEdgeData.mockResolvedValue({
      status: 200,
      title: 'Ignored',
      description: 'ignored',
      robots: 'index, follow',
      ogType: 'website',
      canonicalPath: '/',
      ogImage: null,
      shellTitle: 'Ignored',
    })

    const original = new MockResponse('plain text', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    })

    const { onRequest } = await import('../_middleware')
    const response = await onRequest({
      request: new Request('https://momichan.com/api/plain'),
      env: {},
      next: () => Promise.resolve(original),
    } as never)

    expect(response).toBe(original)
  })

  it('marks auth-route HTML responses as no-store', async () => {
    resolveHtmlDocumentWithEdgeData.mockResolvedValue({
      status: 200,
      title: 'Login · MomiChan',
      description: 'login',
      robots: 'noindex, nofollow',
      ogType: 'website',
      canonicalPath: '/login',
      ogImage: null,
      shellTitle: 'Login',
    })

    const { onRequest } = await import('../_middleware')
    const response = await onRequest({
      request: new Request('https://momichan.com/login'),
      env: {},
      next: () =>
        Promise.resolve(
          new MockResponse(
            '<!doctype html><html><head><title>Login</title></head><body><div id="app-root"></div></body></html>',
            {
              headers: {
                'content-type': 'text/html; charset=utf-8',
              },
            }
          )
        ),
    } as never)

    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
  })
})
