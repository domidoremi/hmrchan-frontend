import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { useHmrContentResourceController } from '@/hmr/composables/useHmrContentResourceController'
import {
  readAvailablePublicContent,
  readPublicContent,
  type PublicContentCacheLookupOptions,
  type PublicContentCacheOptions,
  type PublicContentCacheScope,
  type PublicContentCacheStrategy,
} from '@/utils/cache/publicContentCache'

export interface HmrPublicContentResourceOptions<T> {
  initialData: T
  paths: string[]
  cacheKey: string | (() => string)
  scope: PublicContentCacheScope
  strategy?: PublicContentCacheStrategy
  loader: () => Promise<HmrAsyncResource<T>>
  isEmpty?: (data: T) => boolean
  resolvePageState?: (data: T, resource: HmrAsyncResource<T>) => HmrPageState
  readAvailableBeforeRefresh?: boolean
  onResolved?: (data: T, resource: HmrAsyncResource<T>) => void
}

export function useHmrPublicContentResource<T>(options: HmrPublicContentResourceOptions<T>) {
  const controller = useHmrContentResourceController({
    initialData: options.initialData,
    paths: options.paths,
    isEmpty: options.isEmpty,
    resolvePageState: options.resolvePageState,
  })
  const { content, pageState, resource, applyResource, markLoading } = controller

  function resolveCacheKey(): string {
    return typeof options.cacheKey === 'function' ? options.cacheKey() : options.cacheKey
  }

  async function readAvailable(cacheKey: string): Promise<HmrAsyncResource<T> | null> {
    const lookupOptions: PublicContentCacheLookupOptions<HmrAsyncResource<T>> = {
      key: cacheKey,
      scope: options.scope,
    }

    return readAvailablePublicContent(lookupOptions)
  }

  async function refresh(): Promise<HmrAsyncResource<T>> {
    const cacheKey = resolveCacheKey()
    if (options.readAvailableBeforeRefresh) {
      const cachedResource = await readAvailable(cacheKey)
      if (cachedResource) {
        applyResource(cachedResource)
      } else {
        markLoading()
      }
    } else {
      markLoading()
    }

    const cacheOptions: PublicContentCacheOptions<HmrAsyncResource<T>> = {
      key: cacheKey,
      scope: options.scope,
      loader: options.loader,
    }
    if (options.strategy) {
      cacheOptions.strategy = options.strategy
    }

    const nextResource = applyResource(await readPublicContent(cacheOptions))
    options.onResolved?.(nextResource.data, nextResource)
    return nextResource
  }

  return {
    content,
    pageState,
    resource,
    refresh,
    applyResource,
  }
}
