import type { ObjectDirective } from 'vue'

type ClickOutsideEvent = MouseEvent | PointerEvent
type ClickOutsideHandler = (event: ClickOutsideEvent) => void
type MaybeElement =
  | Element
  | null
  | undefined
  | { value?: MaybeElement | MaybeElement[] }
  | { $el?: MaybeElement | MaybeElement[] }
type MaybeElementSource = MaybeElement | MaybeElement[] | (() => MaybeElement | MaybeElement[])

export interface ClickOutsideBindingOptions {
  handler: ClickOutsideHandler
  include?: MaybeElementSource
  enabled?: boolean
  event?: 'click' | 'pointerdown'
}

type ClickOutsideBindingValue = ClickOutsideHandler | ClickOutsideBindingOptions

type ClickOutsideHTMLElement = HTMLElement & {
  __clickOutsideCleanup__?: () => void
}

function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element
}

function resolveElements(source?: MaybeElementSource): Element[] {
  if (!source) return []

  if (Array.isArray(source)) {
    return source.flatMap((item) => resolveElements(item))
  }

  if (typeof source === 'function') {
    return resolveElements(source())
  }

  if (isElement(source)) {
    return [source]
  }

  if (typeof source === 'object') {
    if ('value' in source) {
      return resolveElements(source.value)
    }

    if ('$el' in source) {
      return resolveElements(source.$el)
    }
  }

  return []
}

function normalizeValue(value: ClickOutsideBindingValue): ClickOutsideBindingOptions | null {
  if (typeof value === 'function') {
    return {
      handler: value,
      enabled: true,
      event: 'click',
    }
  }

  if (!value || typeof value !== 'object' || typeof value.handler !== 'function') {
    return null
  }

  return {
    handler: value.handler,
    include: value.include,
    enabled: value.enabled ?? true,
    event: value.event ?? 'click',
  }
}

function isEventWithin(event: ClickOutsideEvent, elements: Element[]): boolean {
  const target = event.target
  if (!(target instanceof Node)) return false

  const path = typeof event.composedPath === 'function' ? event.composedPath() : []

  return elements.some((element) => path.includes(element) || element.contains(target))
}

function cleanup(el: ClickOutsideHTMLElement) {
  el.__clickOutsideCleanup__?.()
  delete el.__clickOutsideCleanup__
}

function bind(el: ClickOutsideHTMLElement, value: ClickOutsideBindingValue) {
  cleanup(el)

  if (typeof document === 'undefined') return

  const options = normalizeValue(value)
  if (!options || options.enabled === false) return

  const handleEvent = (event: ClickOutsideEvent) => {
    const includeElements = resolveElements(options.include)
    if (isEventWithin(event, [el, ...includeElements])) {
      return
    }

    options.handler(event)
  }

  document.addEventListener(options.event, handleEvent, true)
  el.__clickOutsideCleanup__ = () => {
    document.removeEventListener(options.event ?? 'click', handleEvent, true)
  }
}

const vClickOutside: ObjectDirective<HTMLElement, ClickOutsideBindingValue> = {
  mounted(el, binding) {
    bind(el as ClickOutsideHTMLElement, binding.value)
  },
  updated(el, binding) {
    bind(el as ClickOutsideHTMLElement, binding.value)
  },
  unmounted(el) {
    cleanup(el as ClickOutsideHTMLElement)
  },
}

export default vClickOutside
