function responseMustNotIncludeBody(status: number): boolean {
  return status === 204 || status === 205 || status === 304
}

export function shouldOmitResponseBody(requestMethod: string, status: number): boolean {
  return requestMethod.toUpperCase() === 'HEAD' || responseMustNotIncludeBody(status)
}

export async function toBufferedResponseBody(
  response: Response,
  requestMethod: string
): Promise<ArrayBuffer | null> {
  if (shouldOmitResponseBody(requestMethod, response.status)) {
    return null
  }

  if (!response.body) {
    return null
  }

  return await response.arrayBuffer()
}

export async function buildBufferedResponse(
  response: Response,
  headers: Headers,
  requestMethod: string
): Promise<Response> {
  const body = await toBufferedResponseBody(response, requestMethod)

  return new Response(body, {
    status: response.status,
    headers,
  })
}
