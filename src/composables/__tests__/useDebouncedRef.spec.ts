import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, watch } from 'vue'

import { useDebouncedRef, useWritableDebouncedRef } from '../useDebouncedRef'

async function flushTimers() {
  await nextTick()
  await Promise.resolve()
}

describe('useDebouncedRef', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not emit a delayed pseudo update on initialization', async () => {
    const source = ref('editorial')
    const onChange = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      const { debounced } = useDebouncedRef(source, 300)
      watch(debounced, onChange)
    })

    vi.advanceTimersByTime(300)
    await flushTimers()

    expect(onChange).not.toHaveBeenCalled()

    scope.stop()
  })

  it('emits only the final value for a burst of source updates', async () => {
    const source = ref('a')
    const onChange = vi.fn()
    let debouncedValue = ''
    const scope = effectScope()

    scope.run(() => {
      const { debounced } = useDebouncedRef(source, 300)
      debouncedValue = debounced.value
      watch(debounced, (value) => {
        debouncedValue = value
        onChange(value)
      })
    })

    source.value = 'ab'
    source.value = 'abc'
    source.value = 'abcd'
    await flushTimers()

    vi.advanceTimersByTime(299)
    await flushTimers()
    expect(onChange).not.toHaveBeenCalled()
    expect(debouncedValue).toBe('a')

    vi.advanceTimersByTime(1)
    await flushTimers()

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith('abcd')
    expect(debouncedValue).toBe('abcd')

    scope.stop()
  })

  it('cancels a pending update and preserves the last committed value', async () => {
    const source = ref('base')
    let controls!: ReturnType<typeof useDebouncedRef<string>>
    const scope = effectScope()

    scope.run(() => {
      controls = useDebouncedRef(source, 300)
    })

    source.value = 'pending'
    await flushTimers()
    controls.cancel()

    vi.advanceTimersByTime(300)
    await flushTimers()

    expect(controls.debounced.value).toBe('base')

    scope.stop()
  })

  it('flushes the latest source value immediately', async () => {
    const source = ref('initial')
    let controls!: ReturnType<typeof useDebouncedRef<string>>
    const onChange = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      controls = useDebouncedRef(source, 300)
      watch(controls.debounced, onChange)
    })

    source.value = 'latest'
    controls.flush()
    await flushTimers()

    expect(controls.debounced.value).toBe('latest')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith('latest', 'initial', expect.anything())

    scope.stop()
  })

  it('cleans up pending updates when the scope is disposed', async () => {
    const source = ref('start')
    const onChange = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      const { debounced } = useDebouncedRef(source, 300)
      watch(debounced, onChange)
    })

    source.value = 'disposed'
    scope.stop()

    vi.advanceTimersByTime(300)
    await flushTimers()

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('useWritableDebouncedRef', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays propagation and exposes only the last committed value during the wait', async () => {
    let controls!: ReturnType<typeof useWritableDebouncedRef<string>>
    const onChange = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      controls = useWritableDebouncedRef('idle', 300)
      watch(controls.state, onChange)
    })

    controls.state.value = 'typing'

    expect(controls.state.value).toBe('idle')

    vi.advanceTimersByTime(300)
    await flushTimers()

    expect(controls.state.value).toBe('typing')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith('typing', 'idle', expect.anything())

    scope.stop()
  })

  it('cancels pending writable updates', async () => {
    let controls!: ReturnType<typeof useWritableDebouncedRef<string>>
    const scope = effectScope()

    scope.run(() => {
      controls = useWritableDebouncedRef('idle', 300)
    })

    controls.state.value = 'pending'
    controls.cancel()

    vi.advanceTimersByTime(300)
    await flushTimers()

    expect(controls.state.value).toBe('idle')

    scope.stop()
  })

  it('flushes the latest pending writable value immediately', async () => {
    let controls!: ReturnType<typeof useWritableDebouncedRef<string>>
    const onChange = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      controls = useWritableDebouncedRef('idle', 300)
      watch(controls.state, onChange)
    })

    controls.state.value = 'next'
    controls.flush()
    await flushTimers()

    expect(controls.state.value).toBe('next')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith('next', 'idle', expect.anything())

    scope.stop()
  })

  it('commits only the last writable value in a burst', async () => {
    let controls!: ReturnType<typeof useWritableDebouncedRef<string>>
    const onChange = vi.fn()
    const scope = effectScope()

    scope.run(() => {
      controls = useWritableDebouncedRef('idle', 300)
      watch(controls.state, onChange)
    })

    controls.state.value = 'a'
    controls.state.value = 'ab'
    controls.state.value = 'abc'

    vi.advanceTimersByTime(300)
    await flushTimers()

    expect(controls.state.value).toBe('abc')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith('abc', 'idle', expect.anything())

    scope.stop()
  })
})
