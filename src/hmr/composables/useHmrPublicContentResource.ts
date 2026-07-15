import type { HmrAsyncResource } from '@/hmr/types'
import {
  useHmrContentResourceController,
  type HmrContentResourceControllerOptions,
  type HmrContentResourceState,
} from '@/hmr/composables/useHmrContentResourceController'
import {
  readAvailablePublicContent,
  readPublicContent,
  type PublicContentCacheLookupOptions,
  type PublicContentCacheOptions,
  type PublicContentCacheScope,
  type PublicContentCacheStrategy,
} from '@/utils/cache/publicContentCache'

export interface HmrPublicContentResourceOptions<T> extends HmrContentResourceControllerOptions<T> {
  cacheKey: string | (() => string)
  scope: PublicContentCacheScope
  strategy?: PublicContentCacheStrategy
  loader: () => Promise<HmrAsyncResource<T>>
  readAvailableBeforeRefresh?: boolean
  onResolved?: (data: T, resource: HmrAsyncResource<T>) => void
}

export type HmrPublicContentResource<T> = HmrContentResourceState<T> & {
  refresh: () => Promise<HmrAsyncResource<T>>
}

export function useHmrPublicContentResource<T>(
  options: HmrPublicContentResourceOptions<T>
): HmrPublicContentResource<T> {
  const controller = useHmrContentResourceController(options)
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
