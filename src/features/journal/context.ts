import { inject, type InjectionKey, type ShallowRef } from 'vue'
import type { JournalRuntime } from './runtime'
export const journalKey: InjectionKey<ShallowRef<JournalRuntime | null>> = Symbol('journal')
export function useJournal() {
  const runtime = inject(journalKey)
  if (!runtime) throw new Error('Journal shell is required')
  return runtime
}
