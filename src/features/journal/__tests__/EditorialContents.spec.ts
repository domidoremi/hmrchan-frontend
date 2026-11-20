import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditorialContents from '../editions/EditorialContents.vue'
import { createJournalTestI18n } from './journalTestI18n'

vi.mock('@/utils/modernAPIs', () => ({
  createResizeObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete document.body.dataset['motion']
})

describe('EditorialContents chapter navigation', () => {
  it.each(['full', 'reduced'])(
    'aligns a chapter below the sticky directory in %s motion',
    async (motion) => {
      document.body.dataset['motion'] = motion
      vi.stubGlobal('scrollY', 500)
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
      const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const section = document.createElement('section')
      section.id = 'issue-film'
      section.tabIndex = -1
      section.style.scrollMarginTop = '152px'
      document.body.append(section)
      vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 400 } as DOMRect)
      const wrapper = mount(EditorialContents, {
        attachTo: document.body,
        props: { sections: [{ id: section.id, number: '02', label: 'Images', count: 7 }] },
        global: { plugins: [createJournalTestI18n('en')] },
      })
      try {
        const directory = wrapper.element as HTMLElement
        directory.style.top = '72px'
        vi.spyOn(directory, 'getBoundingClientRect').mockReturnValue({ height: 50 } as DOMRect)
        await wrapper.get('a').trigger('click')
        expect(document.activeElement).toBe(section)
        expect(scroll).toHaveBeenCalledWith({
          top: 778,
          behavior: motion === 'full' ? 'smooth' : 'instant',
        })
      } finally {
        wrapper.unmount()
        section.remove()
      }
    }
  )
})
