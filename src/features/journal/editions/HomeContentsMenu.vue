<template>
  <details
    ref="menu"
    class="home-contents-menu"
    @toggle="syncCurrent"
    @keydown.esc.prevent.stop="dismiss(true)"
  >
    <summary>{{ t('journal.home.contents') }}<JournalIcon name="down" /></summary>
    <nav :aria-label="t('journal.home.contents')">
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        :aria-current="active === section.id ? 'location' : undefined"
        @click.prevent="go(section.id)"
      >
        <span aria-hidden="true">{{ section.number }}</span>
        <b>{{ section.label }}</b>
        <small v-if="section.count !== null">{{ section.count }}</small>
      </a>
    </nav>
  </details>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import JournalIcon from '../JournalIcon.vue'
import { scrollHomeTo } from './useHomeScroll'
import '../styles/home-reading-layout.css'

const props = defineProps<{
  sections: { id: string; number: string; label: string; count: number | null }[]
}>()
const { t } = useI18n({ useScope: 'global' })
const menu = ref<HTMLDetailsElement>()
const active = ref('')
const lifetime = new AbortController()

function syncCurrent() {
  if (!menu.value?.open) return
  active.value = props.sections[0]?.id ?? ''
  for (const { id } of props.sections) {
    const target = document.getElementById(id)
    if (target && target.getBoundingClientRect().top <= innerHeight * 0.3) active.value = id
  }
}

function dismiss(restoreFocus = false) {
  if (!menu.value?.open) return
  menu.value.open = false
  if (restoreFocus) menu.value.querySelector('summary')?.focus()
}

function go(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const header = menu.value?.closest('.journal-shell')?.querySelector('.edition-header')
  const offset = header
    ? header.getBoundingClientRect().height + (Number.parseFloat(getComputedStyle(header).top) || 0)
    : 0
  active.value = id
  dismiss()
  target.focus({ preventScroll: true })
  scrollHomeTo(
    scrollY + target.getBoundingClientRect().top - offset,
    document.body.dataset['motion'] === 'full'
  )
}

onMounted(() => {
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target instanceof Node && !menu.value?.contains(event.target)) dismiss()
    },
    { signal: lifetime.signal }
  )
})
onBeforeUnmount(() => lifetime.abort())
</script>
