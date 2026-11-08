import { computed, ref, watch, type Ref } from 'vue'
import { platforms, type JournalPost } from './models'

export function usePostSelection(posts: Readonly<Ref<JournalPost[]>>) {
  const selectedId = ref('')
  watch(
    posts,
    (items) => {
      if (!items.some((post) => post.id === selectedId.value)) selectedId.value = items[0]?.id || ''
    },
    { immediate: true }
  )
  const selected = computed(() => posts.value.find((post) => post.id === selectedId.value))
  const index = computed(() =>
    Math.max(
      0,
      posts.value.findIndex((post) => post.id === selectedId.value)
    )
  )
  function step(delta: number) {
    if (posts.value.length)
      selectedId.value =
        posts.value[(index.value + delta + posts.value.length) % posts.value.length]!.id
  }
  return { selectedId, selected, index, step }
}

export function sourceGroups(posts: JournalPost[]) {
  const counts = new Map<string, number>()
  posts.forEach((post) => counts.set(post.platform, (counts.get(post.platform) || 0) + 1))
  return [...counts]
    .map(([key, count]) => ({ key, count, label: platforms[key] || key }))
    .sort((a, b) => b.count - a.count)
}

export function dateLabel(value?: string) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    : ''
}

export function timelineGroups(posts: JournalPost[]) {
  const groups = new Map<string, JournalPost[]>()
  posts.forEach((post) => {
    const label = dateLabel(post.publishedAt) || post.time || '动态'
    groups.set(label, [...(groups.get(label) || []), post])
  })
  return [...groups].map(([label, items]) => ({ label, items }))
}
