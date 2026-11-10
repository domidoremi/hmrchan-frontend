import {
  defineAsyncComponent,
  defineComponent,
  h,
  onErrorCaptured,
  type AsyncComponentLoader,
  type Component,
} from 'vue'
import JournalRouteState from './JournalRouteState.vue'
import JournalModuleFailure from './JournalModuleFailure.vue'

// A resolved outer Suspense does not cover later nested page-module loads.
export function journalAsyncView<T extends Component>(loader: AsyncComponentLoader<T>): T {
  const view = Object.assign(
    defineAsyncComponent({
      loader: async () => {
        const component = await loader()
        // Vite may suppress a failed preload after the global recovery event.
        if (!component) throw new Error('Page module did not load')
        return component
      },
      suspensible: false,
      delay: 180,
      timeout: 20000,
      loadingComponent: defineComponent({
        inheritAttrs: false,
        setup: () => () => h(JournalRouteState),
      }),
      errorComponent: JournalModuleFailure,
    }),
    { name: 'JournalPageModule' }
  )
  return view
}

export function useJournalModuleRecovery() {
  onErrorCaptured((_error, instance, info) => {
    // Keep module recovery local; application render errors still reach ErrorBoundary.
    if (
      instance?.$options.name === 'JournalPageModule' &&
      (info === 'async component loader' || info.endsWith('#runtime-13'))
    )
      return false
    return undefined
  })
}
