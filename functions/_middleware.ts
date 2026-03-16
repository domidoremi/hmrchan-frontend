/**
 * Cloudflare Pages Middleware — 动态 CSP nonce 注入
 *
 * 对 HTML 响应：
 * 1. 生成随机 nonce
 * 2. 用 HTMLRewriter 给所有 <script> 标签注入 nonce 属性
 * 3. 只为 HTML 文档注入安全头，避免与 /api 响应头重复叠加
 *
 * 非 HTML 响应直接透传，零开销。
 */

/** 生成 16 字节随机 nonce（Base64 编码） */
function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/**
 * 构建带 nonce 的 CSP
 *
 * - `'nonce-xxx'`: 允许带此 nonce 的内联/外部脚本执行
 * - `'strict-dynamic'`: 被信任脚本动态加载的子脚本自动信任
 * - 保留域名白名单作为不支持 strict-dynamic 的浏览器的 fallback
 */
function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.momichan.xyz https://api.dicebear.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://pbs.twimg.com https://i.ytimg.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
}

const HTML_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=(), accelerometer=(), gyroscope=(), magnetometer=(), midi=(), usb=(), display-capture=(), screen-wake-lock=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(self), autoplay=(self)',
} as const

export async function onRequest(
  context: EventContext<unknown, string, unknown>
): Promise<Response> {
  const response = await context.next()

  // 只处理 HTML 响应
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const nonce = generateNonce()

  // HTMLRewriter 给所有 <script> 标签注入 nonce
  const rewritten = new HTMLRewriter()
    .on('script', {
      element(el) {
        // 跳过已有 nonce 的标签（理论上不会有）
        if (!el.getAttribute('nonce')) {
          el.setAttribute('nonce', nonce)
        }
      },
    })
    .transform(response)

  // 替换 CSP header
  const headers = new Headers(rewritten.headers)
  headers.set('Content-Security-Policy', buildCSP(nonce))
  Object.entries(HTML_SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  })
}
