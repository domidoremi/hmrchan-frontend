import { ref } from 'vue'

export type HmrViewMode = 'grid' | 'list'

export function useHmrViewMode(initialMode: HmrViewMode = 'grid') {
  const viewMode = ref<HmrViewMode>(initialMode)

  function setViewMode(mode: HmrViewMode): void {
    viewMode.value = mode
  }

  return { viewMode, setViewMode }
}
