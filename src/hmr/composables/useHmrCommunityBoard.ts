import { computed, ref, type Ref } from 'vue'

import type { HmrCommunityContent, HmrCommunityItem } from '@/api/hmrContent'

export type HmrCommunityTab = 'discussions' | 'hot' | 'latest' | 'feed'

export interface HmrCommunityTabOption {
  id: HmrCommunityTab
  label: string
  count: number
}

export function useHmrCommunityBoard(
  content: Ref<HmrCommunityContent>,
  t: (key: string) => string
) {
  const activeTab = ref<HmrCommunityTab>('discussions')

  const visibleThreads = computed<HmrCommunityItem[]>(() => {
    const byTab = content.value[activeTab.value]
    return byTab.length ? byTab : content.value.discussions.length ? content.value.discussions : []
  })

  const discussionTabs = computed<HmrCommunityTabOption[]>(() => [
    {
      id: 'discussions',
      label: t('community.allDiscussions'),
      count: content.value.discussions.length,
    },
    { id: 'hot', label: t('community.hot'), count: content.value.hot.length },
    { id: 'latest', label: t('community.latest'), count: content.value.latest.length },
    { id: 'feed', label: t('community.feed'), count: content.value.feed.length },
  ])

  const activeTabLabel = computed(
    () => discussionTabs.value.find((item) => item.id === activeTab.value)?.label ?? '讨论'
  )

  const hotThreads = computed(() =>
    (content.value.hot.length ? content.value.hot : content.value.discussions).slice(0, 4)
  )

  function threadTarget(item: HmrCommunityItem): string {
    if (item.target) return item.target
    if (item.id.startsWith('demo-') || item.id.startsWith('community-')) return '/community'
    return `/posts/${item.id}`
  }

  return {
    activeTab,
    activeTabLabel,
    discussionTabs,
    hotThreads,
    threadTarget,
    visibleThreads,
  }
}
