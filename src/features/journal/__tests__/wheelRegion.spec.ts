import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWheelRegion } from '../editions/wheelRegion'

let region: HTMLElement
let position: number
let maximum: number
let move: ReturnType<typeof vi.fn>
beforeEach(() => {
  region = document.createElement('div')
  document.body.append(region)
  vi.spyOn(region, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 900,
    top: 100,
    bottom: 600,
    width: 800,
    height: 500,
  } as DOMRect)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.stubGlobal('innerHeight', 800)
  position = 0
  maximum = 1000
  move = vi.fn((value: number) => {
    position = value
  })
})
afterEach(() => {
  region.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function install(stepped = false) {
  const handler = createWheelRegion({
    element: region,
    position: () => position,
    maximum: () => maximum,
    move,
    stepped,
  })
  region.addEventListener('wheel', handler, { passive: false })
}
function wheel(options: WheelEventInit = {}, target: HTMLElement = region) {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: 500,
    clientY: 300,
    deltaY: 120,
    ...options,
  })
  target.dispatchEvent(event)
  return event
}
describe('wheel region intent', () => {
  it('browses content at the center and releases at both ends', () => {
    install()
    expect(wheel().defaultPrevented).toBe(true)
    expect(position).toBe(120)
    position = maximum
    expect(wheel().defaultPrevented).toBe(false)
    expect(wheel({ deltaY: -120 }).defaultPrevented).toBe(true)
    position = 0
    expect(wheel({ deltaY: -120 }).defaultPrevented).toBe(false)
  })
  it('keeps margins, partly visible scenes and fast page gestures free', () => {
    install()
    for (const options of [
      { clientX: 110 },
      { clientX: 890 },
      { clientY: 110 },
      { clientY: 590 },
      { deltaY: 900 },
    ])
      expect(wheel(options).defaultPrevented).toBe(false)
    vi.mocked(region.getBoundingClientRect).mockReturnValue({
      left: 100,
      right: 900,
      top: 720,
      bottom: 1220,
      width: 800,
      height: 500,
    } as DOMRect)
    expect(wheel({ clientY: 750 }).defaultPrevented).toBe(false)
    expect(move).not.toHaveBeenCalled()
  })
  it('preserves horizontal trackpad input, zoom, modifiers and editable controls', () => {
    install()
    for (const options of [
      { deltaX: 130 },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { cancelable: false },
    ])
      expect(wheel(options).defaultPrevented).toBe(false)
    const input = document.createElement('input')
    region.append(input)
    expect(wheel({}, input).defaultPrevented).toBe(false)
    expect(move).not.toHaveBeenCalled()
  })
  it('normalizes line deltas and passes through when there is no overflow', () => {
    install()
    wheel({ deltaY: 3, deltaMode: 1 })
    expect(position).toBe(48)
    maximum = 0
    expect(wheel().defaultPrevented).toBe(false)
  })
  it('groups small wheel events without wrapping or trapping a completed scene', () => {
    maximum = 2
    let time = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => time)
    install(true)
    wheel({ deltaY: 40 })
    wheel({ deltaY: 40 })
    wheel({ deltaY: 40 })
    expect(position).toBe(1)
    wheel()
    expect(position).toBe(1)
    time += 500
    wheel()
    expect(position).toBe(2)
    expect(wheel().defaultPrevented).toBe(false)
    time += 500
    wheel({ deltaY: -120 })
    expect(position).toBe(1)
  })
})
