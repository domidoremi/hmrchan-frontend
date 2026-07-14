import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'
import {
  useHmrContentResourceController,
  type HmrContentResourceController,
} from '@/hmr/composables/useHmrContentResourceController'

export interface HmrPrivateContentResourceOptions<T> {
  initialData: T
  paths: string[]
  loader: () => Promise<HmrAsyncResource<T>>
  isEmpty?: (data: T) => boolean
  resolvePageState?: (data: T, resource: HmrAsyncResource<T>) => HmrPageState
}

export type HmrPrivateContentResource<T> = Pick<
  HmrContentResourceController<T>,
  'content' | 'pageState' | 'resource' | 'applyResource' | 'markReady'
> & {
  refresh: () => Promise<HmrAsyncResource<T>>
}

export function useHmrPrivateContentResource<T>(
  options: HmrPrivateContentResourceOptions<T>
): HmrPrivateContentResource<T> {
  const controller = useHmrContentResourceController({
    initialData: options.initialData,
    paths: options.paths,
    ...(options.isEmpty ? { isEmpty: options.isEmpty } : {}),
    ...(options.resolvePageState ? { resolvePageState: options.resolvePageState } : {}),
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
