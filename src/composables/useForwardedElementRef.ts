import { shallowRef, type ComponentPublicInstance } from 'vue'

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
