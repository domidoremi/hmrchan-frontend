import { describe, expect, it } from 'vitest'

import { useHmrViewMode } from '@/hmr/composables/useHmrViewMode'

describe('useHmrViewMode', () => {
  it('uses grid by default and updates the selected mode', () => {
    const view = useHmrViewMode()

    expect(view.viewMode.value).toBe('grid')

    view.setViewMode('list')

    expect(view.viewMode.value).toBe('list')
  })

  it('accepts a custom initial mode', () => {
    const view = useHmrViewMode('list')

    expect(view.viewMode.value).toBe('list')
  })
})
