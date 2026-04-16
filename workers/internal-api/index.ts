import { handleInternalApiGatewayRequest } from '../../src/edge/internalApiGatewayWorker'

export default {
  async fetch(request: Request, env: Parameters<typeof handleInternalApiGatewayRequest>[1]) {
    try {
      return await handleInternalApiGatewayRequest(request, env)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      console.error('[Internal API Gateway] unhandled runtime error', {
        message,
      })

      return new Response(
        JSON.stringify({
          error: 'INTERNAL_API_GATEWAY_RUNTIME_ERROR',
          message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'X-Proxy-Upstream-Source': 'public',
          },
        }
      )
    }
  },
}
