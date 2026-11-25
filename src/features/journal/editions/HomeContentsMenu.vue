<template>
  <details
    ref="menu"
    class="home-contents-menu"
    @toggle="syncMenu"
    @keydown.esc.prevent.stop="dismiss(true)"
    @focusout="leaveMenu"
  >
    <summary :aria-label="t('journal.home.contents')">
      <JournalIcon name="menu" />
      <span class="contents-trigger-copy">
        <span>{{ t('journal.home.contents') }}</span>
        <strong>{{ currentLabel }}</strong>
      </span>
      <JournalIcon name="down" class="contents-chevron" />
    </summary>
    <nav :aria-label="t('journal.home.contents')" data-lenis-prevent data-wheel-native>
      <a
        v-for="(section, index) in sections"
        :key="section.id"
        :href="`#${section.id}`"
        :aria-current="active === section.id ? 'location' : undefined"
        @click="go($event, section.id)"
      >
        <span class="contents-index" aria-hidden="true">{{
          String(index + 1).padStart(2, '0')
        }}</span>
        {{ section.label }}
      </a>
    </nav>
  </details>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createResizeObserver } from '@/utils/modernAPIs'
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
const currentLabel = computed(
  () => props.sections.find(({ id }) => id === active.value)?.label ?? props.sections[0]?.label
)
let resize: ResizeObserver | null = null

function syncCurrent() {
  active.value = props.sections[0]?.id ?? ''
  for (const { id } of props.sections) {
    const target = document.getElementById(id)
    if (target && target.getBoundingClientRect().top <= innerHeight * 0.3) active.value = id
  }
}

function syncMenu() {
  if (!menu.value) return
  syncCurrent()
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const shell = menu.value.closest('.journal-shell')
  const dock = shell?.querySelector('.mobile-navigation')?.getBoundingClientRect()
  const bottom = dock?.height ? Math.max(0, innerHeight - dock.top) : 0
  menu.value.style.setProperty('--contents-bottom', `${bottom + rem}px`)
  if (!menu.value.open) return
  const summary = menu.value.querySelector('summary')?.getBoundingClientRect()
  const edge = shell?.querySelector('.edition-header')?.getBoundingClientRect().bottom ?? 0
  const room = (summary?.top ?? 0) - Math.max(0, edge) - rem
  if (room < rem * 2.75) {
    dismiss()
    return
  }
  menu.value.style.setProperty('--contents-room', `${room}px`)
}

function leaveMenu(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && !menu.value?.contains(event.relatedTarget)) dismiss()
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
  syncMenu()
  resize = createResizeObserver(syncMenu)
  menu.value
    ?.closest('.journal-shell')
    ?.querySelectorAll('.edition-header, .mobile-navigation')
    .forEach((element) => resize?.observe(element))
  window.addEventListener('scroll', syncMenu, { passive: true, signal: lifetime.signal })
  window.addEventListener('resize', syncMenu, { passive: true, signal: lifetime.signal })
  document.addEventListener('journalchromechange', syncMenu, { signal: lifetime.signal })
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target instanceof Node && !menu.value?.contains(event.target)) dismiss()
    },
    { signal: lifetime.signal }
  )
})
watch(() => props.sections, syncMenu, { flush: 'post' })
onBeforeUnmount(() => {
  lifetime.abort()
  resize?.disconnect()
})
</script>
