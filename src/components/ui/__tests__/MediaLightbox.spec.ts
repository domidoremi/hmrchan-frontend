import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mediaMocks = vi.hoisted(() => ({
  getMediaStreamUrl: vi.fn((id: string) => `https://cdn.example.com/media/${id}`),
  warmDecodedImage: vi.fn(),
  useFocusTrap: vi.fn(),
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
}))

vi.mock('@/utils/mediaOptimizer', () => ({
  getMediaStreamUrl: mediaMocks.getMediaStreamUrl,
}))

vi.mock('@/utils/performance', () => ({
  warmDecodedImage: mediaMocks.warmDecodedImage,
}))

vi.mock('@/composables/useFocusTrap', () => ({
  useFocusTrap: mediaMocks.useFocusTrap,
}))

vi.mock('@/utils/bodyScrollLock', () => ({
  lockBodyScroll: mediaMocks.lockBodyScroll,
  unlockBodyScroll: mediaMocks.unlockBodyScroll,
}))

import MediaLightbox from '../MediaLightbox.vue'

const mediaList = [
  { id: 'img-1', file_type: 'image' },
  { id: 'img-2', file_type: 'image' },
]

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(MediaLightbox, {
    attachTo: document.body,
    props: {
      isOpen: true,
      mediaList,
      allowDownload: true,
      ...props,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        teleport: true,
        transition: false,
        AnimatedIcon: {
          template: '<span data-stub="animated-icon" />',
        },
        Button: {
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        VideoPlayer: {
          template: '<div data-testid="video-player" />',
        },
      },
    },
  })
}

describe('MediaLightbox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mediaMocks.getMediaStreamUrl.mockClear()
    mediaMocks.warmDecodedImage.mockClear()
    mediaMocks.useFocusTrap.mockClear()
    mediaMocks.lockBodyScroll.mockClear()
    mediaMocks.unlockBodyScroll.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('locks body scroll on open, supports navigation, and closes from UI / keyboard', async () => {
    const wrapper = createWrapper()

    expect(mediaMocks.lockBodyScroll).toHaveBeenCalledTimes(1)
    expect(mediaMocks.warmDecodedImage).toHaveBeenCalledWith('https://cdn.example.com/media/img-1')
    expect(wrapper.text()).toContain('1 / 2')

    await wrapper.find('.lightbox-nav.next').trigger('click')
    expect(wrapper.text()).toContain('2 / 2')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 / 2')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:isOpen')?.[0]).toEqual([false])
  })

  it('updates zoom controls and auto-hides toolbar controls after inactivity', async () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.zoom-indicator').text()).toBe('100%')

    wrapper.find('.lightbox-content').element.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 200,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.zoom-indicator').text()).toBe('125%')

    await wrapper.find('[aria-label="common.resetZoom"]').trigger('click')
    expect(wrapper.find('.zoom-indicator').text()).toBe('100%')

    await wrapper.find('.media-stage').trigger('dblclick', { clientX: 220, clientY: 180 })
    expect(wrapper.find('.zoom-indicator').text()).toBe('200%')

    await wrapper.find('input[type="range"]').setValue('3')
    expect(wrapper.find('.zoom-indicator').text()).toBe('300%')

    await wrapper.find('[aria-label="common.resetZoom"]').trigger('click')
    expect(wrapper.find('.zoom-indicator').text()).toBe('100%')

    wrapper.find('.lightbox-shell').trigger('mousemove')
    await vi.advanceTimersByTimeAsync(2500)
    expect(wrapper.find('.lightbox-toolbar').classes()).toContain('hidden')
  })

  it('downloads current image and unlocks body scroll when closed/unmounted', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const clickMock = vi.fn()
    const anchorStub = {
      href: '',
      download: '',
      rel: '',
      click: clickMock,
    }

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string
    ) => {
      if (tagName === 'a') {
        return anchorStub as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tagName)
    }) as typeof document.createElement)

    const wrapper = createWrapper({ isOpen: false })

    await wrapper.setProps({ isOpen: true })
    await wrapper.find('[aria-label="common.download"]').trigger('click')

    expect(anchorStub.href).toBe('https://cdn.example.com/media/img-1')
    expect(anchorStub.download).toBe('media-img-1')
    expect(clickMock).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ isOpen: false })
    expect(mediaMocks.unlockBodyScroll).toHaveBeenCalled()

    wrapper.unmount()
    expect(mediaMocks.unlockBodyScroll).toHaveBeenCalled()

    createElementSpy.mockRestore()
  })
})
