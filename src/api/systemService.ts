export type HealthResponse = Record<string, unknown> | { status: string }

export const systemService = {
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch('/health', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return (await response.json()) as HealthResponse
    }

    return { status: await response.text() }
  },

  async getMetrics(): Promise<string> {
    const response = await fetch('/metrics', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Metrics request failed: ${response.status}`)
    }

    return response.text()
  },
}
