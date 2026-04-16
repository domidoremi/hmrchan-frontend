import { handleInternalApiGatewayRequest } from '../../src/edge/internalApiGatewayWorker'

export default {
  fetch(request: Request, env: Parameters<typeof handleInternalApiGatewayRequest>[1]) {
    return handleInternalApiGatewayRequest(request, env)
  },
}
