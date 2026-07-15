import { shallowRef, type ShallowRef } from 'vue'

import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

export interface HmrContentResourceControllerOptions<T> {
  initialData: T
  paths: string[]
  isEmpty?: (data: T) => boolean
  resolvePageState?: (data: T, resource: HmrAsyncResource<T>) => HmrPageState
}

export interface HmrContentResourceController<T> {
  content: ShallowRef<T>
  pageState: ShallowRef<HmrPageState>
  resource: ShallowRef<HmrAsyncResource<T>>
  applyResource: (nextResource: HmrAsyncResource<T>) => HmrAsyncResource<T>
  markLoading: () => void
  markReady: (data: T) => HmrAsyncResource<T>
}

export type HmrContentResourceState<T> = Pick<
  HmrContentResourceController<T>,
  'content' | 'pageState' | 'resource' | 'applyResource'
>

export function createHmrInitialResource<T>(data: T, paths: string[]): HmrAsyncResource<T> {
  return {
    state: 'idle',
    data,
    source: 'local',
    error: null,
    paths,
    updatedAt: null,
  }
}

export function useHmrContentResourceController<T>(
  options: HmrContentResourceControllerOptions<T>
): HmrContentResourceController<T> {
  const content = shallowRef<T>(options.initialData)
  const pageState = shallowRef<HmrPageState>('idle')
  const resource = shallowRef<HmrAsyncResource<T>>(
    createHmrInitialResource(options.initialData, options.paths)
  )

  function applyResource(nextResource: HmrAsyncResource<T>): HmrAsyncResource<T> {
    resource.value = nextResource
    content.value = nextResource.data
    pageState.value =
      options.resolvePageState?.(nextResource.data, nextResource) ??
      (options.isEmpty?.(nextResource.data) ? 'empty' : 'ready')
    return nextResource
  }

  function markLoading(): void {
    pageState.value = 'loading'
    resource.value = {
      ...resource.value,
      state: 'loading',
    }
  }

  function markReady(data: T): HmrAsyncResource<T> {
    return applyResource({
      state: 'ready',
      data,
      source: 'local',
      error: null,
      paths: options.paths,
      updatedAt: new Date().toISOString(),
    })
  }

  return {
    content,
    pageState,
    resource,
    applyResource,
    markLoading,
    markReady,
  }
}
