import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeContentsMenu from '../editions/HomeContentsMenu.vue'
import { createJournalTestI18n } from './journalTestI18n'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
  delete document.body.dataset['motion']
})

function setup() {
  const shell = document.createElement('div')
  shell.className = 'journal-shell'
  shell.innerHTML =
    '<header class="edition-header" style="top:12px"></header><section id="issue-film" tabindex="-1"></section>'
  document.body.append(shell)
  const header = shell.querySelector('header')!
  const target = shell.querySelector('section')!
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 60, bottom: 72 } as DOMRect)
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 400 } as DOMRect)
  const wrapper = mount(HomeContentsMenu, {
    attachTo: shell,
    props: { sections: [{ id: target.id, label: 'Images' }] },
    global: { plugins: [createJournalTestI18n('en')], stubs: { JournalIcon: true } },
  })
  vi.spyOn(wrapper.get('summary').element, 'getBoundingClientRect').mockReturnValue({
    top: 160,
    bottom: 204,
  } as DOMRect)
  return { wrapper, target }
}

describe('Home contents menu', () => {
  it.each(['full', 'reduced'])(
    'aligns the next chapter directly below the floating header in %s motion',
    async (motion) => {
      document.body.dataset['motion'] = motion
      vi.stubGlobal('scrollY', 500)
      const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const { wrapper, target } = setup()
      try {
        ;(wrapper.element as HTMLDetailsElement).open = true
        await wrapper.get('a').trigger('click')
        expect(document.activeElement).toBe(target)
        expect((wrapper.element as HTMLDetailsElement).open).toBe(false)
        expect(scroll).toHaveBeenCalledWith({
          top: 828,
          behavior: motion === 'full' ? 'smooth' : 'instant',
        })
      } finally {
        wrapper.unmount()
      }
    }
  )

  it('closes with Escape and returns focus to the summary', async () => {
    const { wrapper } = setup()
    try {
      ;(wrapper.element as HTMLDetailsElement).open = true
      ;(wrapper.get('a').element as HTMLElement).focus()
      await wrapper.get('a').trigger('keydown', { key: 'Escape' })
      expect((wrapper.element as HTMLDetailsElement).open).toBe(false)
      expect(document.activeElement).toBe(wrapper.get('summary').element)
    } finally {
      wrapper.unmount()
    }
  })

  it('leaves modifier-assisted link activation to the browser', async () => {
    const { wrapper, target } = setup()
    try {
      ;(wrapper.element as HTMLDetailsElement).open = true
      await wrapper.get('a').trigger('click', { ctrlKey: true })
      expect((wrapper.element as HTMLDetailsElement).open).toBe(true)
      expect(document.activeElement).not.toBe(target)
    } finally {
      wrapper.unmount()
    }
  })

  it('dismisses when its trigger scrolls behind the header', async () => {
    const { wrapper } = setup()
    try {
      ;(wrapper.element as HTMLDetailsElement).open = true
      await wrapper.trigger('toggle')
      expect((wrapper.element as HTMLElement).style.getPropertyValue('--contents-room')).not.toBe(
        ''
      )
      vi.mocked(wrapper.get('summary').element.getBoundingClientRect).mockReturnValue({
        top: 60,
        bottom: 104,
      } as DOMRect)
      window.dispatchEvent(new Event('scroll'))
      expect((wrapper.element as HTMLDetailsElement).open).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })
})
