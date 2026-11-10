import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLayoutMotion } from '../layout-motion.js'

let root, cards, boxes, frames, events, animations, lifetime, full, motion
const box = (x, y, width = 200, height = 300) => ({ x, y, width, height })
const deferred = () => {
  let resolve
  const promise = new Promise((done) => (resolve = done))
  return { promise, resolve }
}
const flush = () => {
  for (const callback of frames.splice(0)) callback()
}

beforeEach(() => {
  document.body.innerHTML =
    '<section><article data-post="a"></article><article data-post="b"></article></section>'
  root = document.querySelector('section')
  cards = [...root.children]
  boxes = [box(0, 0), box(220, 0)]
  frames = []
  events = []
  animations = []
  lifetime = new AbortController()
  full = true
  for (const [index, card] of cards.entries())
    vi.spyOn(card, 'getBoundingClientRect').mockImplementation(() => {
      events.push('read:' + card.dataset.post)
      return boxes[index]
    })
  motion = createLayoutMotion({
    frame: (callback) => frames.push(callback),
    fullMotion: () => full,
    signal: lifetime.signal,
    animate: (element, keyframes) => {
      events.push('write:' + element.dataset.post)
      const done = deferred()
      const animation = { element, keyframes, finished: done.promise, cancel: vi.fn(done.resolve) }
      animations.push(animation)
      return animation
    },
  })
})
afterEach(() => {
  lifetime.abort()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('journal layout transitions', () => {
  it('measures the destination for every card before starting any animation', async () => {
    await motion.layout(root, () => {
      boxes = [box(0, 0, 500, 120), box(0, 140, 500, 120)]
    })
    expect(animations).toHaveLength(0)
    flush()
    expect(events).toEqual(['read:a', 'read:b', 'read:a', 'read:b', 'write:a', 'write:b'])
    expect(animations[1].keyframes[0].transform).toBe('translate(220px,-140px) scale(0.4,2.5)')
  })

  it('retargets from the currently displayed positions and cancels the previous transition', async () => {
    await motion.layout(root, () => {
      boxes = [box(0, 0, 500, 120), box(0, 140, 500, 120)]
    })
    flush()
    const previous = [...animations]
    boxes = [box(0, 0, 400, 180), box(70, 90, 400, 180)]
    await motion.layout(root, () => {
      boxes = [box(0, 0), box(220, 0)]
    })
    expect(previous.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    flush()
    expect(animations[3].keyframes[0].transform).toBe('translate(-150px,90px) scale(2,0.6)')
  })

  it('ignores an older update that resolves after a newer request', async () => {
    const pending = deferred()
    const first = motion.layout(root, () => pending.promise)
    await motion.layout(root, () => {
      boxes = [box(0, 0, 500, 120), box(0, 140, 500, 120)]
    })
    pending.resolve()
    await first
    flush()
    expect(animations).toHaveLength(2)
  })

  it('applies reduced-motion updates without measuring or scheduling an animation', async () => {
    full = false
    const update = vi.fn()
    await motion.layout(root, update)
    flush()
    expect(update).toHaveBeenCalledOnce()
    expect(events).toEqual([])
    expect(frames).toEqual([])
  })

  it('does not replay pending transitions when full motion is restored', async () => {
    await motion.layout(root, () => {
      boxes = [box(0, 0, 500, 120), box(0, 140, 500, 120)]
    })
    full = false
    motion.cancel()
    full = true
    flush()
    expect(animations).toEqual([])
  })

  it('skips unchanged, removed and zero-sized cards', async () => {
    await motion.layout(root, () => {})
    flush()
    expect(animations).toEqual([])
    await motion.layout(root, () => {
      cards[0].remove()
      boxes[1] = box(0, 100, 0, 0)
    })
    flush()
    expect(animations).toEqual([])
  })

  it('disposal cancels active animations and prevents pending work from restarting', async () => {
    await motion.layout(root, () => {
      boxes = [box(0, 0, 500, 120), box(0, 140, 500, 120)]
    })
    flush()
    lifetime.abort()
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    const update = vi.fn()
    await motion.layout(root, update)
    expect(update).not.toHaveBeenCalled()
  })

  it('does not animate a root detached while its update is pending', async () => {
    await motion.layout(root, () => {
      boxes = [box(0, 0, 500, 120), box(0, 140, 500, 120)]
    })
    root.remove()
    flush()
    expect(animations).toEqual([])
  })
})
