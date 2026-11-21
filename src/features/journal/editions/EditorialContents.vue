<template>
  <nav ref="directory" class="editorial-contents" :aria-label="t('journal.home.contents')">
    <a
      v-for="section in sections"
      :key="section.id"
      :href="`#${section.id}`"
      :aria-current="active === section.id ? 'location' : undefined"
      @click.prevent="go(section.id)"
    >
      <span aria-hidden="true">{{ section.number }}</span><b>{{ section.label }}</b
      ><small v-if="section.count !== null" class="sr-only">{{ section.count }}</small>
    </a>
  </nav>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createResizeObserver } from '@/utils/modernAPIs'
import { cancelHomeFrame, queueHomeFrame } from './homeFrame'
import { scrollHomeTo } from './useHomeScroll'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
  sections: { id: string; number: string; label: string; count: number | null }[]
}>()
const active = ref(props.sections[0]?.id ?? '')
const directory = ref<HTMLElement>()
let sectionElements: HTMLElement[] = []
let resize: ResizeObserver | null = null
let header: HTMLElement | null | undefined
let progress = -1
function readPosition() {
  const nav = directory.value
  if (!nav || !sectionElements.length) return
  const marker = Math.max(nav.getBoundingClientRect().bottom + 1, window.innerHeight * 0.3)
  const bounds = sectionElements.map((section) => section.getBoundingClientRect())
  let index = 0
  while (index + 1 < bounds.length && bounds[index + 1]!.top <= marker) index++
  const atEnd =
    window.scrollY > 0 &&
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
  if (atEnd) index = bounds.length - 1
  const current = bounds[index]!
  const end = bounds[index + 1]?.top ?? current.bottom
  const fraction = atEnd ? 1 : (marker - current.top) / Math.max(1, end - current.top)
  const id = sectionElements[index]!.id
  const next = Math.min(1, Math.max(0, fraction))
  return () => {
    active.value = id
    if (next === progress) return
    progress = next
    nav.style.setProperty('--chapter-progress', String(next))
  }
}
function schedule() {
  if (!document.hidden) queueHomeFrame(readPosition)
}
function measure() {
  const nav = directory.value
  if (nav && header) {
    const top = Number.parseFloat(getComputedStyle(header).top) || 0
    const edge = `${top + header.offsetHeight}px`
    if (nav.style.getPropertyValue('--home-header-edge') !== edge)
      nav.style.setProperty('--home-header-edge', edge)
  }
  schedule()
}
function refresh() {
  resize?.disconnect()
  sectionElements = props.sections.flatMap(({ id }) => document.getElementById(id) ?? [])
  header = directory.value?.closest('.journal-shell')?.querySelector('.edition-header')
  if (header) resize?.observe(header)
  if (directory.value) resize?.observe(directory.value)
  for (const section of sectionElements) resize?.observe(section)
  measure()
}
function go(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  active.value = id
  element.focus({ preventScroll: true })
  const nav = directory.value
  const offset = nav
    ? (Number.parseFloat(getComputedStyle(nav).top) || 0) + nav.getBoundingClientRect().height
    : 0
  scrollHomeTo(
    window.scrollY + element.getBoundingClientRect().top - offset,
    document.body.dataset['motion'] === 'full'
  )
}
watch(() => props.sections, refresh, { flush: 'post' })
onMounted(() => {
  resize = createResizeObserver(measure)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', measure)
  document.addEventListener('visibilitychange', schedule)
  refresh()
})
onBeforeUnmount(() => {
  cancelHomeFrame(readPosition)
  resize?.disconnect()
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', measure)
  document.removeEventListener('visibilitychange', schedule)
})
</script>
