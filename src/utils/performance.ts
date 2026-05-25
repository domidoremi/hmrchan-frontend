export type IdleTaskHandle = {
  id: number
  type: 'idle' | 'timeout'
}

interface RunWhenIdleOptions {
  timeout?: number
  fallbackDelay?: number
}

export function runWhenIdle(
  callback: () => void,
  { timeout, fallbackDelay = 1200 }: RunWhenIdleOptions = {}
): IdleTaskHandle | undefined {
  if (typeof window === 'undefined') return undefined

  if (window.requestIdleCallback) {
    return {
      id: window.requestIdleCallback(callback, timeout === undefined ? undefined : { timeout }),
      type: 'idle',
    }
  }

  return {
    id: window.setTimeout(callback, fallbackDelay),
    type: 'timeout',
  }
}

export function cancelIdleTask(handle: IdleTaskHandle | undefined): void {
  if (!handle || typeof window === 'undefined') return

  if (handle.type === 'idle') {
    window.cancelIdleCallback?.(handle.id)
    return
  }

  window.clearTimeout(handle.id)
}

export async function runWithConcurrency(
  tasks: Array<() => Promise<unknown>>,
  concurrency: number
): Promise<void> {
  let index = 0
  const workers = Array.from({ length: Math.max(concurrency, 1) }, async () => {
    while (index < tasks.length) {
      const task = tasks[index]
      index += 1
      await task?.().catch(() => undefined)
    }
  })
  await Promise.all(workers)
}
