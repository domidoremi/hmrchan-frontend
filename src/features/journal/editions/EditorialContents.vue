<template>
  <nav ref="directory" class="editorial-contents" :aria-label="t('journal.home.contents')">
    <a
      v-for="section in sections"
      :key="section.id"
      :href="`#${section.id}`"
      :aria-current="active === section.id ? 'location' : undefined"
      @click.prevent="go(section.id)"
    >
      <span>{{ section.number }}</span><b>{{ section.label }}</b
      ><small :aria-label="section.count === null ? t('journal.browse.countUnknown') : undefined">{{
        section.count ?? '—'
      }}</small>
    </a>
  </nav>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createResizeObserver } from '@/utils/modernAPIs'
const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
  sections: { id: string; number: string; label: string; count: number | null }[]
}>()
const active = ref('issue-latest')
const directory = ref<HTMLElement>()
let sectionElements: HTMLElement[] = []
let resize: ResizeObserver | null = null
let frame = 0
function measure() {
  frame = 0
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
  active.value = sectionElements[index]!.id
  const fraction = atEnd ? 1 : (marker - current.top) / Math.max(1, end - current.top)
  nav.style.setProperty('--chapter-progress', String(Math.min(1, Math.max(0, fraction))))
}
function schedule() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(measure)
}
function refresh() {
  resize?.disconnect()
  sectionElements = props.sections.flatMap(({ id }) => document.getElementById(id) ?? [])
  if (directory.value) resize?.observe(directory.value)
  for (const section of sectionElements) resize?.observe(section)
  schedule()
}
function go(id: string) {
  const element = document.getElementById(id)
  if (!element) return
  active.value = id
  element.focus({ preventScroll: true })
  element.scrollIntoView({
    block: 'start',
    behavior: document.body.dataset['motion'] === 'full' ? 'smooth' : 'instant',
  })
}
watch(() => props.sections, refresh, { flush: 'post' })
onMounted(() => {
  resize = createResizeObserver(schedule)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  document.addEventListener('visibilitychange', schedule)
  refresh()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resize?.disconnect()
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  document.removeEventListener('visibilitychange', schedule)
})
</script>
