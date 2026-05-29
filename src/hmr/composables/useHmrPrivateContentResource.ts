import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import { useHmrContentResourceController } from '@/hmr/composables/useHmrContentResourceController'

export interface HmrPrivateContentResourceOptions<T> {
  initialData: T
  paths: string[]
  loader: () => Promise<HmrAsyncResource<T>>
  isEmpty?: (data: T) => boolean
  resolvePageState?: (data: T, resource: HmrAsyncResource<T>) => HmrPageState
}

export function useHmrPrivateContentResource<T>(options: HmrPrivateContentResourceOptions<T>) {
  const controller = useHmrContentResourceController({
    initialData: options.initialData,
    paths: options.paths,
    isEmpty: options.isEmpty,
    resolvePageState: options.resolvePageState,
  })
  const { content, pageState, resource, applyResource, markLoading, markReady } = controller

  async function refresh(): Promise<HmrAsyncResource<T>> {
    markLoading()

    return applyResource(await options.loader())
  }

  return {
    content,
    pageState,
    resource,
    refresh,
    applyResource,
    markReady,
  }
}
