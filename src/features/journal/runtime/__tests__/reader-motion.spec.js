import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installReaderMotion } from '../reader-motion.js'

let runtime, lifetime, dialog, source, photo, full
let animations
let originalPopover
const box = (left, top, width, height) => new DOMRect(left, top, width, height)
function imageGeometry(image, bounds) {
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 800 },
    naturalHeight: { configurable: true, value: 600 },
  })
  image.getBoundingClientRect = () => bounds
  image.style.objectFit = 'cover'
  image.style.objectPosition = '25% 75%'
}
function animate(node, frames, options) {
  let complete, reject
  const animation = {
    finished: new Promise((resolve, fail) => {
      complete = resolve
      reject = fail
    }),
    ready: Promise.resolve(),
    startTime: 0,
    playState: 'running',
    finish() {
      if (animation.playState !== 'running') return
      animation.playState = 'finished'
      complete()
    },
    cancel: vi.fn(() => {
      if (animation.playState !== 'running') return
      animation.playState = 'idle'
      reject(new DOMException('Animation cancelled', 'AbortError'))
    }),
  }
  animation.finished.catch(() => {})
  animations.push({ node, frames, options, animation })
  return animation
}
function open() {
  document.querySelector('#opener').click()
  dialog.open = true
  runtime.dialog(dialog)
}

beforeEach(() => {
  document.body.innerHTML =
    '<button id="opener" data-open="one"><img src="/source.jpg"></button><dialog id="app-dialog"><div id="dialog-content"><img class="detail-photo" src="/source.jpg"></div></dialog>'
  lifetime = new AbortController()
  animations = []
  full = true
  source = document.querySelector('#opener img')
  photo = document.querySelector('.detail-photo')
  dialog = document.querySelector('#app-dialog')
  imageGeometry(source, box(20, 40, 120, 100))
  imageGeometry(photo, box(300, 150, 480, 360))
  dialog.close = vi.fn(() => {
    dialog.open = false
    dialog.dispatchEvent(new Event('close'))
  })
  originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  })
  runtime = installReaderMotion({
    animate,
    fullMotion: () => full,
    listen: (target, type, handler, options) =>
      target.addEventListener(type, handler, { ...options, signal: lifetime.signal }),
  })
})
afterEach(() => {
  runtime.dispose()
  lifetime.abort()
  if (originalPopover) Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  else delete HTMLElement.prototype.showPopover
  document.body.innerHTML = ''
})

describe('reading image transitions', () => {
  it('keeps only the newest index preview visible after rapid selection or scrolling', async () => {
    const first = document.createElement('img')
    const second = document.createElement('img')
    document.body.append(first, second)
    for (const target of [first, second]) imageGeometry(target, box(300, 150, 480, 360))
    runtime.preview(source, first)
    expect(first.style.visibility).toBe('hidden')
    runtime.preview(source, second)
    await flushPromises()
    expect(first.style.visibility).toBe('')
    expect(second.style.visibility).toBe('hidden')
    expect(document.querySelectorAll('[data-motion-layer]')).toHaveLength(1)
    window.dispatchEvent(new Event('scroll'))
    expect(second.style.visibility).toBe('')
    expect(document.querySelector('[data-motion-layer]')).toBeNull()
    runtime.preview(source, second)
    animations.at(-2).animation.finish()
    await flushPromises()
    expect(second.style.visibility).toBe('')
    expect(document.querySelector('[data-motion-layer]')).toBeNull()
  })

  it('reveals the actual reading image and removes the temporary layer after arrival', async () => {
    open()
    expect(photo.style.visibility).toBe('hidden')
    expect(document.querySelectorAll('[data-motion-layer="reader"]')).toHaveLength(1)
    expect(HTMLElement.prototype.showPopover).toHaveBeenCalledOnce()
    animations[0].animation.finish()
    await flushPromises()
    expect(photo.style.visibility).toBe('')
    expect(document.querySelector('[data-motion-layer]')).toBeNull()
    expect(dialog.open).toBe(true)
  })

  it('reverses from an interrupted position and keeps the dialog open until movement and fade finish', async () => {
    open()
    const forward = animations[0]
    forward.node.getBoundingClientRect = () => box(200, 150, 170, 120)
    animations[1].node.getBoundingClientRect = () => box(180, 140, 240, 180)
    const onClosed = vi.fn()
    runtime.closeDialog(dialog, false, onClosed)
    const reverse = animations[2]
    const fade = animations[4]
    expect(forward.animation.cancel).toHaveBeenCalledOnce()
    expect(reverse.frames[0].translate).toBe('180px 110px')
    expect(reverse.frames[0].scale).toBe(`${170 / 120} ${120 / 100}`)
    expect(document.querySelectorAll('[data-motion-layer]')).toHaveLength(1)
    expect(dialog.open).toBe(true)
    expect(onClosed).not.toHaveBeenCalled()
    reverse.animation.finish()
    await flushPromises()
    expect(dialog.open).toBe(true)
    fade.animation.finish()
    await flushPromises()
    expect(dialog.open).toBe(false)
    expect(photo.style.visibility).toBe('')
    expect(document.querySelector('[data-motion-layer]')).toBeNull()
    expect(dialog.close).toHaveBeenCalledOnce()
    expect(onClosed).toHaveBeenCalledOnce()
  })

  it('cleans the current image when full content replaces the initial reading view', async () => {
    open()
    const replacement = document.createElement('img')
    replacement.className = 'detail-photo'
    replacement.src = '/source.jpg'
    imageGeometry(replacement, box(300, 150, 480, 360))
    photo.replaceWith(replacement)
    runtime.refreshDialog(dialog)
    expect(replacement.style.visibility).toBe('hidden')
    full = false
    runtime.cancel()
    await flushPromises()
    expect(replacement.style.visibility).toBe('')
    expect(document.querySelector('[data-motion-layer]')).toBeNull()
    runtime.closeDialog(dialog, false)
    expect(dialog.open).toBe(false)
    expect(animations).toHaveLength(2)
  })

  it('does not create a late transition when image decoding completes after closing', async () => {
    let decoded
    photo.getBoundingClientRect = () => box(0, 0, 0, 0)
    photo.decode = () => new Promise((resolve) => (decoded = resolve))
    open()
    runtime.closeDialog(dialog, true)
    imageGeometry(photo, box(300, 150, 480, 360))
    decoded()
    await flushPromises()
    expect(dialog.open).toBe(false)
    expect(animations).toHaveLength(0)
    expect(photo.style.visibility).toBe('')
    expect(document.querySelector('[data-motion-layer]')).toBeNull()
  })

  it('keeps a newly opened reading transition when an earlier close notification arrives', () => {
    open()
    runtime.closeDialog(dialog, true)
    open()
    dialog.dispatchEvent(new Event('close'))
    expect(dialog.open).toBe(true)
    expect(photo.style.visibility).toBe('hidden')
    expect(document.querySelectorAll('[data-motion-layer]')).toHaveLength(1)
  })
})
