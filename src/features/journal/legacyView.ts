import type { Component } from 'vue'
import JournalModuleFailure from './JournalModuleFailure.vue'

// Resolve both assets before committing the page; failures still resolve a usable route.
export function journalLegacyView<T>(loader: () => Promise<T>): () => Promise<T | Component> {
  return async () => {
    try {
      const [view] = await Promise.all([loader(), import('./styles/legacy-pages.css')])
      if (!view) throw new Error('Page module did not load')
      return view
    } catch {
      return JournalModuleFailure
    }
  }
}
