/**
 * Cloudflare Pages Middleware — 动态 CSP nonce 注入
 *
 * 对 HTML 响应：
 * 1. 生成随机 nonce
 * 2. 用 HTMLRewriter 给所有 <script> 标签注入 nonce 属性
 * 3. 用 nonce 替换 CSP 中的静态 hash，兼容 Cloudflare 注入的内联脚本
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
    `script-src 'nonce-${nonce}' 'strict-dynamic' https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
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

  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  })
}
