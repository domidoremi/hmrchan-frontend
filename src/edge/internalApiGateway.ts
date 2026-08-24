export type EdgeBindingFetcher = {
  fetch(input: Request): Promise<Response>
}

const INTERNAL_GATEWAY_ORIGIN = 'https://momichan.com'

export type InternalApiGatewayRuntimeEnv = {
  INTERNAL_API_GATEWAY?: EdgeBindingFetcher
  INTERNAL_API_GATEWAY_SHARED_SECRET?: string
}

export const INTERNAL_API_GATEWAY_AUTH_HEADER = 'X-MomiChan-Internal-Gateway-Token'

interface InternalGatewayFetchOptions {
  bodyBuffer: ArrayBuffer | null
  env: InternalApiGatewayRuntimeEnv
  headers: Headers
  redirectMode?: RequestRedirect
  request: Request
  requestUrl: URL
}

export function buildInternalGatewayUrl(path: string): string {
  return new URL(path, INTERNAL_GATEWAY_ORIGIN).toString()
}

export function withInternalApiGatewayAuth(
  headers: HeadersInit,
  env: InternalApiGatewayRuntimeEnv
): Headers {
  const sharedSecret = env.INTERNAL_API_GATEWAY_SHARED_SECRET?.trim()
  if (!sharedSecret) {
    throw new Error('Internal API gateway shared secret is not configured')
  }

  const authenticatedHeaders = new Headers(headers)
  authenticatedHeaders.set(INTERNAL_API_GATEWAY_AUTH_HEADER, sharedSecret)
  return authenticatedHeaders
}

export async function fetchViaInternalApiGateway(
  gateway: EdgeBindingFetcher,
  options: InternalGatewayFetchOptions
): Promise<Response> {
  const internalGatewayUrl = buildInternalGatewayUrl(
    `${options.requestUrl.pathname}${options.requestUrl.search}`
  )
  const init: RequestInit = {
    method: options.request.method,
    headers: withInternalApiGatewayAuth(options.headers, options.env),
    redirect: options.redirectMode ?? 'follow',
  }

  if (
    options.request.method !== 'GET' &&
    options.request.method !== 'HEAD' &&
    options.bodyBuffer !== null
  ) {
    init.body = options.bodyBuffer.slice(0)
  }

  return gateway.fetch(new Request(internalGatewayUrl, init))
}
