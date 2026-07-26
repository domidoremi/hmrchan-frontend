import { randomBytes } from 'node:crypto'

export const LOCAL_PREVIEW_CSRF_COOKIE_NAME = '__Host-momi_origin_csrf'

function hasCookie(request: Request, cookieName: string): boolean {
  const cookieHeader = request.headers.get('cookie') ?? ''
  return cookieHeader.split(';').some((segment) => segment.trim().startsWith(`${cookieName}=`))
}

export function withLocalPreviewCsrfCookie(request: Request, response: Response): Response {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html') || hasCookie(request, LOCAL_PREVIEW_CSRF_COOKIE_NAME)) {
    return response
  }

  const headers = new Headers(response.headers)
  const token = randomBytes(24).toString('base64url')
  headers.append(
    'Set-Cookie',
    `${LOCAL_PREVIEW_CSRF_COOKIE_NAME}=${token}; Path=/; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
