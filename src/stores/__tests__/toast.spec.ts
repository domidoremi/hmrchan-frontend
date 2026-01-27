import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '../toast'

describe('Toast Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('should add toast with action button', () => {
    const store = useToastStore()
    const mockAction = vi.fn()

    const id = store.info('Test message', 0, {
      title: 'Test Title',
      action: {
        label: 'Click me',
        onClick: mockAction,
      },
    })

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Test message')
    expect(store.toasts[0].title).toBe('Test Title')
    expect(store.toasts[0].action).toBeDefined()
    expect(store.toasts[0].action?.label).toBe('Click me')
  })

  it('should pause and resume timer', () => {
    const store = useToastStore()
    const id = store.info('Test', 5000)

    expect(store.toasts).toHaveLength(1)

    // Pause timer
    store.pauseTimer(id)
    vi.advanceTimersByTime(6000)
    expect(store.toasts).toHaveLength(1) // Should still be there

    // Resume timer
    store.resumeTimer(id)
    vi.advanceTimersByTime(5000)
    expect(store.toasts).toHaveLength(0) // Should be removed
  })

  it('should remove toast manually', () => {
    const store = useToastStore()
    const id = store.info('Test', 0)

    expect(store.toasts).toHaveLength(1)

    store.removeToast(id)
    expect(store.toasts).toHaveLength(0)
  })

  it('should auto-remove toast after duration', () => {
    const store = useToastStore()
    store.info('Test', 3000)

    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(3000)
    expect(store.toasts).toHaveLength(0)
  })
})
