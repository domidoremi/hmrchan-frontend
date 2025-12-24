/**
 * 查询参数构建工具
 * 统一处理 API 查询参数序列化
 */

type QueryValue = string | number | boolean | undefined | null

/**
 * 构建 URL 查询字符串
 * 过滤掉 undefined、null 和空字符串值
 *
 * @example
 * buildQuery({ page: 1, q: 'test', filter: null })
 * // => '?page=1&q=test'
 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }

  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

/**
 * 解析查询字符串为对象
 */
export function parseQuery(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

/**
 * 合并查询参数，后者覆盖前者
 */
export function mergeQueryParams(
  base: Record<string, QueryValue>,
  override: Record<string, QueryValue>
): Record<string, QueryValue> {
  return { ...base, ...override }
}
