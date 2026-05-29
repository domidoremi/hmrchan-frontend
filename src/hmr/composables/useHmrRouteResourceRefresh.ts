import { onMounted, watch, type WatchSource } from 'vue'

export type HmrResourceRefresh = () => Promise<unknown> | unknown

export interface HmrRouteResourceRefreshOptions {
  refresh: HmrResourceRefresh
  watchSource: WatchSource<unknown> | WatchSource<unknown>[]
}

export function normalizeHmrRouteParam(value: unknown, fallback: string): string {
  const rawValue = Array.isArray(value) ? value[0] : value
  const normalized = String(rawValue ?? fallback).trim()
  return normalized || fallback
}

export function useHmrRouteResourceRefresh(options: HmrRouteResourceRefreshOptions): void {
  function refresh(): void {
    void options.refresh()
  }

  onMounted(refresh)
  watch(options.watchSource, refresh)
}

export function useHmrMountedResourceRefresh(refreshResource: HmrResourceRefresh): void {
  onMounted(() => {
    void refreshResource()
  })
}
