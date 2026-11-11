<template>
  <nav class="editorial-contents" aria-label="本期目录">
    <span class="contents-caption">本期目录<small>IN THIS ISSUE</small></span>
    <a
      v-for="section in sections"
      :key="section.id"
      :href="`#${section.id}`"
      :aria-current="active === section.id ? 'location' : undefined"
      @click.prevent="go(section.id)"
    >
      <span>{{ section.number }}</span><b>{{ section.label }}</b
      ><small :aria-label="section.count === null ? '数量尚未读取' : undefined">{{
        section.count ?? '—'
      }}</small>
    </a>
  </nav>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createVisibilityObserver } from '@/utils/modernAPIs'
const props = defineProps<{
  sections: { id: string; number: string; label: string; count: number | null }[]
}>()
const active = ref('issue-latest')
let observer: IntersectionObserver | undefined
function observe() {
  observer?.disconnect()
  const cover = document.querySelector('.spatial-cover')
  if (cover) observer?.observe(cover)
  for (const section of props.sections) {
    const element = document.getElementById(section.id)
    if (element) observer?.observe(element)
  }
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
watch(
  () => props.sections,
  async () => {
    await nextTick()
    observe()
  }
)
onMounted(() => {
  observer = createVisibilityObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) active.value = visible[0].target.id || props.sections[0]?.id || ''
    },
    { rootMargin: '-20% 0px -55% 0px', threshold: 0 }
  )
  observe()
})
onBeforeUnmount(() => observer?.disconnect())
</script>
