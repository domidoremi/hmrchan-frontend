<template>
  <details
    ref="menu"
    class="home-contents-menu"
    @toggle="syncMenu"
    @keydown.esc.prevent.stop="dismiss(true)"
  >
    <summary>{{ t('journal.home.contents') }}<JournalIcon name="down" /></summary>
    <nav :aria-label="t('journal.home.contents')" data-lenis-prevent data-wheel-native>
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        :aria-current="active === section.id ? 'location' : undefined"
        @click="go($event, section.id)"
      >
        {{ section.label }}
      </a>
    </nav>
  </details>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import { useHomeSectionJump } from './homeAnchor'
import '../styles/home-reading-layout.css'

const props = defineProps<{
  sections: { id: string; label: string }[]
}>()
const { t } = useI18n({ useScope: 'global' })
const menu = ref<HTMLDetailsElement>()
const active = ref('')
const lifetime = new AbortController()
const jumpToSection = useHomeSectionJump()

function syncCurrent() {
  if (!menu.value?.open) return
  active.value = props.sections[0]?.id ?? ''
  for (const { id } of props.sections) {
    const target = document.getElementById(id)
    if (target && target.getBoundingClientRect().top <= innerHeight * 0.3) active.value = id
  }
}

function syncMenu() {
  if (!menu.value?.open) return
  const summary = menu.value.querySelector('summary')?.getBoundingClientRect()
  const header = menu.value.closest('.journal-shell')?.querySelector('.edition-header')
  const edge = header?.getBoundingClientRect().bottom ?? 0
  if (!summary || summary.top < Math.max(0, edge)) {
    dismiss()
    return
  }
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const dock = menu.value
    .closest('.journal-shell')
    ?.querySelector('.mobile-navigation')
    ?.getBoundingClientRect()
  const bottom = dock?.height ? Math.min(innerHeight, dock.top) : innerHeight
  const room = bottom - summary.bottom - rem * 1.5
  if (room < rem * 2.75) {
    dismiss()
    return
  }
  menu.value.style.setProperty('--contents-room', `${room}px`)
  syncCurrent()
}

function dismiss(restoreFocus = false) {
  if (!menu.value?.open) return
  menu.value.open = false
  if (restoreFocus) menu.value.querySelector('summary')?.focus()
}

function go(event: MouseEvent, id: string) {
  jumpToSection(event, id, () => {
    active.value = id
    dismiss()
  })
}

onMounted(() => {
  window.addEventListener('scroll', syncMenu, { passive: true, signal: lifetime.signal })
  window.addEventListener('resize', syncMenu, { passive: true, signal: lifetime.signal })
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target instanceof Node && !menu.value?.contains(event.target)) dismiss()
    },
    { signal: lifetime.signal }
  )
})
onBeforeUnmount(() => {
  lifetime.abort()
})
</script>
