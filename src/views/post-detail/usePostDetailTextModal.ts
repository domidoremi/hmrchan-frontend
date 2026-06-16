import { computed, nextTick, ref, watch, type Ref } from 'vue'

import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

import { shouldShowReadFullText as computeShouldShowReadFullText } from './postDetailModel'

type UsePostDetailTextModalOptions = {
  detailDescription: Readonly<Ref<string>>
  textModalPanelRef: Readonly<Ref<HTMLElement | null>>
}

export function usePostDetailTextModal({
  detailDescription,
  textModalPanelRef,
}: UsePostDetailTextModalOptions) {
  const isTextModalOpen = ref(false)
  const textModalReturnFocus = ref<HTMLElement | null>(null)
  const shouldShowReadFullText = computed(() =>
    computeShouldShowReadFullText(detailDescription.value)
  )

  function closeTextModal() {
    isTextModalOpen.value = false
  }

  function openTextModal() {
    if (!detailDescription.value) return
    isTextModalOpen.value = true
  }

  function onTextModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeTextModal()
  }

  function resumeTextModalBindings() {
    if (!isTextModalOpen.value || typeof window === 'undefined') return
    lockBodyScroll()
    window.addEventListener('keydown', onTextModalKeydown)
  }

  function releaseTextModalBindings() {
    isTextModalOpen.value = false
    unlockBodyScroll()
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onTextModalKeydown)
  }

  watch(
    isTextModalOpen,
    async (open) => {
      if (typeof window === 'undefined') return
      if (open) {
        textModalReturnFocus.value =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        lockBodyScroll()
        window.addEventListener('keydown', onTextModalKeydown)
        await nextTick()
        textModalPanelRef.value?.focus({ preventScroll: true })
      } else {
        unlockBodyScroll()
        window.removeEventListener('keydown', onTextModalKeydown)
        await nextTick()
        textModalReturnFocus.value?.focus({ preventScroll: true })
        textModalReturnFocus.value = null
      }
    },
    { immediate: true }
  )

  return {
    isTextModalOpen,
    shouldShowReadFullText,
    openTextModal,
    closeTextModal,
    releaseTextModalBindings,
    resumeTextModalBindings,
  }
}
