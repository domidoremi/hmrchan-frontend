import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'

import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

import { usePostDetailTextModal } from '../usePostDetailTextModal'

vi.mock('@/utils/bodyScrollLock', () => ({
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
}))

function createTextModalSubject(description = 'x'.repeat(281)) {
  const scope = effectScope()
  const detailDescription = ref(description)
  const panel = document.createElement('div')
  panel.tabIndex = -1
  document.body.appendChild(panel)
  const textModalPanelRef = ref<HTMLElement | null>(panel)
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()

  const modal = scope.run(() =>
    usePostDetailTextModal({
      detailDescription,
      textModalPanelRef,
    })
  )

  if (!modal) throw new Error('failed to create post detail text modal subject')

  vi.mocked(lockBodyScroll).mockClear()
  vi.mocked(unlockBodyScroll).mockClear()

  return {
    detailDescription,
    modal,
    panel,
    scope,
    trigger,
  }
}

describe('usePostDetailTextModal', () => {
  let scopes: EffectScope[] = []

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(lockBodyScroll).mockClear()
    vi.mocked(unlockBodyScroll).mockClear()
  })

  afterEach(() => {
    scopes.forEach((scope) => scope.stop())
    scopes = []
    document.body.innerHTML = ''
  })

  it('keeps the read-full-text affordance aligned with description length', () => {
    const subject = createTextModalSubject('short copy')
    scopes.push(subject.scope)

    expect(subject.modal.shouldShowReadFullText.value).toBe(false)

    subject.detailDescription.value = 'x'.repeat(281)

    expect(subject.modal.shouldShowReadFullText.value).toBe(true)
  })

  it('does not open without text content', () => {
    const subject = createTextModalSubject('')
    scopes.push(subject.scope)

    subject.modal.openTextModal()

    expect(subject.modal.isTextModalOpen.value).toBe(false)
    expect(lockBodyScroll).not.toHaveBeenCalled()
  })

  it('locks scroll, focuses the panel, and closes on Escape', async () => {
    const subject = createTextModalSubject()
    scopes.push(subject.scope)

    subject.modal.openTextModal()
    await nextTick()
    await nextTick()

    expect(subject.modal.isTextModalOpen.value).toBe(true)
    expect(lockBodyScroll).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(subject.panel)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    await nextTick()

    expect(subject.modal.isTextModalOpen.value).toBe(false)
    expect(unlockBodyScroll).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(subject.trigger)
  })

  it('releases lifecycle bindings when the page is deactivated', async () => {
    const subject = createTextModalSubject()
    scopes.push(subject.scope)

    subject.modal.openTextModal()
    await nextTick()
    vi.mocked(unlockBodyScroll).mockClear()

    subject.modal.releaseTextModalBindings()
    await nextTick()

    expect(subject.modal.isTextModalOpen.value).toBe(false)
    expect(unlockBodyScroll).toHaveBeenCalled()
  })
})
