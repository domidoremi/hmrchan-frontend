import { shallowRef, type ComponentPublicInstance } from 'vue'

/**
 * 管理由子组件回传的元素引用（例如 :ref 回调透传）
 */
export function useForwardedElementRef<T extends HTMLElement = HTMLElement>() {
  const elementRef = shallowRef<T | null>(null)

  const setElementRef = (el: Element | ComponentPublicInstance | null) => {
    elementRef.value = el instanceof HTMLElement ? (el as T) : null
  }

  return {
    elementRef,
    setElementRef,
  }
}
