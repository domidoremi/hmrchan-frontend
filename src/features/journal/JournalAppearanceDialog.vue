<template>
  <dialog
    ref="dialog"
    class="journal-appearance-dialog"
    aria-labelledby="appearance-title"
    @close="emit('close')"
    @click="closeOnBackdrop"
  >
    <header>
      <h2 id="appearance-title">{{ t('journal.appearance.title') }}</h2>
      <button
        type="button"
        class="icon-button"
        :aria-label="t('common.close')"
        @click="dialog?.close()"
      >
        <JournalIcon name="x" />
      </button>
    </header>
    <div class="appearance-content"><JournalDisplaySettings /></div>
  </dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import JournalDisplaySettings from './JournalDisplaySettings.vue'
import JournalIcon from './JournalIcon.vue'

const { t } = useI18n({ useScope: 'global' })
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
let previousFocus: HTMLElement | null = null

function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value || !dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.value.close()
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
  document.body.classList.add('journal-appearance-open')
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.classList.remove('journal-appearance-open')
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
})
</script>

<style scoped>
.journal-appearance-dialog {
  inline-size: min(51.25rem, calc(100vw - 2rem));
  max-block-size: calc(100dvh - 2rem);
  margin: auto;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  color: var(--ink);
  overflow: hidden;
  box-shadow: 0 32px 100px #0006;
}
.journal-appearance-dialog::backdrop {
  background: #101820b3;
  backdrop-filter: blur(0.5rem);
}
.journal-appearance-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--line);
}
.journal-appearance-dialog h2 {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  font-size: 1.25rem;
  font-weight: 500;
}
.appearance-content {
  max-block-size: calc(100dvh - 6.25rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.5rem;
}
@media (max-width: 460px) {
  .appearance-content {
    padding: 1rem;
  }
  .journal-appearance-dialog > header {
    padding-inline: 1rem;
  }
}
</style>
