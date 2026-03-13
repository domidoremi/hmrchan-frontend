/**
 * System Service - 系统公开端点
 *
 * 对齐 docs/frontend-integration.md 中不包裹的系统端点：
 * - GET /health
 * - GET /metrics
 */

export type HealthResponse = Record<string, unknown> | { status: string }

export const systemService = {
  /**
   * 健康检查
   */
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

  /**
   * Prometheus 指标
   */
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
