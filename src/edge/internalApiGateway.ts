import { SITE_ORIGIN } from './htmlDocument'

export type EdgeBindingFetcher = {
  fetch(input: Request): Promise<Response>
}

export type InternalApiGatewayRuntimeEnv = {
  INTERNAL_API_GATEWAY?: EdgeBindingFetcher
}

interface InternalGatewayFetchOptions {
  bodyBuffer: ArrayBuffer | null
  headers: Headers
  redirectMode?: RequestRedirect
  request: Request
  requestUrl: URL
}

export function buildInternalGatewayUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString()
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
    headers: options.headers,
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
