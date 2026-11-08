import { afterEach, describe, expect, it } from 'vitest'
import { handleTabListKeydown } from '../tabNavigation'

afterEach(() => document.body.replaceChildren())

describe('tab keyboard navigation', () => {
  it('moves focus and selection, wraps, and skips disabled tabs', () => {
    document.body.innerHTML =
      '<div role="tablist"><button role="tab">One</button><button role="tab" disabled>Two</button><button role="tab">Three</button></div>'
    const list = document.querySelector<HTMLElement>('[role="tablist"]')!
    list.addEventListener('keydown', handleTabListKeydown)
    const tabs = Array.from(list.querySelectorAll('button'))
    tabs.forEach((tab) =>
      tab.addEventListener('click', () => {
        tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)))
      })
    )
    const press = (key: string) =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      )
    tabs[0]!.focus()
    press('ArrowRight')
    expect(document.activeElement).toBe(tabs[2])
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true')
    press('ArrowRight')
    expect(document.activeElement).toBe(tabs[0])
    press('End')
    expect(document.activeElement).toBe(tabs[2])
    press('Home')
    expect(document.activeElement).toBe(tabs[0])
    press('ArrowLeft')
    expect(document.activeElement).toBe(tabs[2])
    press('Tab')
    expect(document.activeElement).toBe(tabs[2])
  })
})
