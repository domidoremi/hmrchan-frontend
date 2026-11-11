import { watch, type Ref } from 'vue'
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router'
import { applyPageMeta } from '@/utils/pageMeta'

interface RoutePageMetaComposer {
  locale: Readonly<Ref<string>>
  t(key: string): unknown
  getLocaleMessage(locale: string): unknown
}

export function syncRoutePageMeta(
  route: RouteLocationNormalizedLoadedGeneric,
  composer: RoutePageMetaComposer
): void {
  const titleValue =
    typeof route.meta.title === 'function' ? route.meta.title(route) : route.meta.title
  const rawTitle = titleValue ? String(titleValue) : ''
  const translatedTitle = rawTitle ? String(composer.t(rawTitle)) : ''

  applyPageMeta({
    title: translatedTitle || undefined,
    description: typeof route.meta.description === 'string' ? route.meta.description : undefined,
    canonicalPath: route.path,
    locale: composer.locale.value,
  })
}

export function watchRoutePageMeta(
  currentRoute: Readonly<Ref<RouteLocationNormalizedLoadedGeneric>>,
  composer: RoutePageMetaComposer
) {
  return watch(
    [() => composer.locale.value, () => composer.getLocaleMessage(composer.locale.value)],
    () => {
      const route = currentRoute.value
      if (!route.matched.length) return
      syncRoutePageMeta(route, composer)
    }
  )
}
