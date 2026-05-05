export const UUIDV7_CUTOVER_EPOCH = '2026-05-01T00:00:00.000Z'

export function buildCacheNamespace(namespace: string): string {
  return `${namespace}:${UUIDV7_CUTOVER_EPOCH}`
}
