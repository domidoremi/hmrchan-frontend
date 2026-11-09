import { defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useJournalDirectory } from '../useJournalDirectory'

let wrapper: VueWrapper
let menu: ReturnType<typeof useJournalDirectory>
let desktop: MediaQueryList
let resize: () => void

beforeEach(() => {
  desktop = {
    matches: false,
    addEventListener: vi.fn((_name, listener) => {
      resize = listener
    }),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => desktop)
  )
  wrapper = mount(
    defineComponent({
      setup() {
        menu = useJournalDirectory()
        return () =>
          h('div', [
            h(
              'button',
              {
                ref: menu.menuButton,
                id: 'trigger',
                onClick: () => {
                  menu.menuOpen.value = !menu.menuOpen.value
                },
              },
              'Menu'
            ),
            menu.menuOpen.value
              ? h('nav', { ref: menu.directory }, [h('a', { href: '#content' }, 'Content')])
              : null,
            h('button', { id: 'content' }, 'Outside'),
          ])
      },
    }),
    { attachTo: document.body }
  )
})
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
async function openMenu() {
  await wrapper.get('#trigger').trigger('click')
  wrapper.get('nav a').element.focus()
  expect(menu.menuOpen.value).toBe(true)
}

describe('mobile directory', () => {
  it('returns focus to the trigger on Escape and unlocks scrolling', async () => {
    await openMenu()
    expect(document.body.classList.contains('journal-directory-open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.activeElement?.id).toBe('trigger')
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(document.body.classList.contains('journal-directory-open')).toBe(false)
  })
  it('closes when focus leaves without stealing the destination focus', async () => {
    await openMenu()
    wrapper.get('#content').element.focus()
    await nextTick()
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('content')
  })
  it('keeps inside clicks open and dismisses outside pointer presses', async () => {
    await openMenu()
    await wrapper.get('nav a').trigger('pointerdown')
    expect(menu.menuOpen.value).toBe(true)
    await wrapper.get('#content').trigger('pointerdown')
    expect(menu.menuOpen.value).toBe(false)
  })
  it('closes at the desktop breakpoint and cleans up on unmount', async () => {
    await openMenu()
    Object.assign(desktop, { matches: true })
    resize()
    await nextTick()
    expect(menu.menuOpen.value).toBe(false)
    await openMenu()
    wrapper.unmount()
    expect(document.body.classList.contains('journal-directory-open')).toBe(false)
    expect(desktop.removeEventListener).toHaveBeenCalledWith('change', resize)
  })
})
