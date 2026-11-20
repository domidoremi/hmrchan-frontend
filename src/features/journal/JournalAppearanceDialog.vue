<template>
  <dialog
    ref="dialog"
    class="journal-appearance-dialog"
    aria-labelledby="appearance-title"
    @close="notifyClose"
    @cancel.prevent="close"
    @click="closeOnBackdrop"
  >
    <header>
      <h2 id="appearance-title">{{ t('journal.appearance.title') }}</h2>
      <button type="button" class="icon-button" :aria-label="t('common.close')" @click="close">
        <JournalIcon name="x" />
      </button>
    </header>
    <div class="appearance-content"><JournalDisplaySettings ref="settings" /></div>
    <footer>
      <button type="button" class="text-button" @click="settings?.reset()">
        {{ t('journal.appearance.reset') }}
      </button>
      <button type="button" class="button button-dark" @click="close">
        {{ t('journal.appearance.done') }}
      </button>
    </footer>
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
const settings = ref<InstanceType<typeof JournalDisplaySettings>>()
let previousFocus: HTMLElement | null = null
let closing = false

function notifyClose() {
  if (closing) return
  closing = true
  emit('close')
}
function close() {
  dialog.value?.close()
  notifyClose()
}

function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value || !dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    close()
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
  document.body.classList.add('journal-appearance-open')
})
onBeforeUnmount(() => {
  closing = true
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
  border-radius: 1.5rem;
  background: var(--paper);
  color: var(--ink);
  overflow: hidden;
  box-shadow: 0 32px 100px #0006;
}
.journal-appearance-dialog[open] {
  display: flex;
  flex-direction: column;
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
  flex: none;
}
.journal-appearance-dialog h2 {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  font-size: 1.25rem;
  font-weight: 500;
}
.appearance-content {
  min-block-size: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.5rem;
}
.journal-appearance-dialog > footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-block-start: 1px solid var(--line);
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
