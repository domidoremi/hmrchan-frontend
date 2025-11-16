import { defineAsyncComponent, type Component } from 'vue'
import AsyncComponentLoader from '@/components/feedback/AsyncComponentLoader.vue'

/**
 * 创建懒加载组件的工具函数
 * @param loader 组件加载函数
 * @param options 配置选项
 * @returns 异步组件
 */
export function useLazyComponent(
  loader: () => Promise<Component>,
  options?: {
    loadingComponent?: Component
    errorComponent?: Component
    delay?: number
    timeout?: number
    loadingText?: string
  },
) {
  const {
    loadingComponent = AsyncComponentLoader,
    errorComponent,
    delay = 200,
    timeout = 10000,
  } = options || {}

  return defineAsyncComponent({
    loader,
    loadingComponent,
    errorComponent,
    delay,
    timeout,
    onError(error, retry, fail, attempts) {
      console.error(`[LazyComponent] Failed to load component (attempt ${attempts}):`, error)
      // 最多重试 2 次
      if (attempts <= 2) {
        retry()
      } else {
        fail()
      }
    },
  })
}

/**
 * 预加载组件
 * @param loader 组件加载函数
 */
export function preloadComponent(loader: () => Promise<Component>) {
  return loader().catch((error) => {
    console.debug('[LazyComponent] Failed to preload component:', error)
  })
}
