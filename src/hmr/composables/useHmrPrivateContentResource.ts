import type { HmrAsyncResource } from '@/hmr/types'
import {
  useHmrContentResourceController,
  type HmrContentResourceController,
  type HmrContentResourceControllerOptions,
  type HmrContentResourceState,
} from '@/hmr/composables/useHmrContentResourceController'

export interface HmrPrivateContentResourceOptions<
  T,
> extends HmrContentResourceControllerOptions<T> {
  loader: () => Promise<HmrAsyncResource<T>>
}

export type HmrPrivateContentResource<T> = HmrContentResourceState<T> &
  Pick<HmrContentResourceController<T>, 'markReady'> & {
    refresh: () => Promise<HmrAsyncResource<T>>
  }

export function useHmrPrivateContentResource<T>(
  options: HmrPrivateContentResourceOptions<T>
): HmrPrivateContentResource<T> {
  const controller = useHmrContentResourceController(options)
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
