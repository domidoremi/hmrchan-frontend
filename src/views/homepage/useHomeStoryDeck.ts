import { computed } from 'vue'
import { formatRelativeTime } from '@/utils/date'
import type { HomeAggregateResponse, PostListItem } from '@/api'
import type { ComputedRef, Ref } from 'vue'
import type { HomeTranslate, StoryDeckCard } from './homeModel'
import {
  collectUniqueItems,
  formatAuthorName,
  formatStoryExcerpt,
  formatStoryTitle,
  mapHomeImageUrl,
  mapStoryDeckItemToPost,
  normalizeTag,
  normalizeText,
  resolvePostLink,
  resolveStoryDeckTime,
} from './homeModel'

export function useHomeStoryDeck(options: {
  homeAggregate: Ref<HomeAggregateResponse | null>
  homeSourcePosts: ComputedRef<PostListItem[]>
  mediaPosts: ComputedRef<PostListItem[]>
  featuredRailPostIds: ComputedRef<Set<string>>
  enabled?: ComputedRef<boolean> | Ref<boolean>
  translate: HomeTranslate
}) {
  const { homeAggregate, homeSourcePosts, mediaPosts, featuredRailPostIds, enabled, translate } =
    options
  const isEnabled = computed(() => enabled?.value ?? true)

  const rawStoryCards = computed<StoryDeckCard[]>(() => {
    if (!isEnabled.value) return []

    const liveItems = homeAggregate.value?.story_deck.items ?? []
    if (liveItems.length > 0) {
      return liveItems.slice(0, 5).map((item) => {
        const post = mapStoryDeckItemToPost(item, translate)
        const author = formatAuthorName(post) || translate('home.hero.fallbackAuthor')
        return {
          post,
          thumbnail: mapHomeImageUrl(item.image),
          eyebrow: normalizeText(item.eyebrow) || author,
          title: normalizeText(item.title) || formatStoryTitle(post, translate),
          excerpt: normalizeText(item.summary) || formatStoryExcerpt(post, translate),
          author,
          time: resolveStoryDeckTime(item, translate),
          detailLink: resolvePostLink(item.deep_link, item.post_id),
        }
      })
    }

    const source = mediaPosts.value.length > 0 ? mediaPosts.value : homeSourcePosts.value
    return source.slice(0, 5).map((post) => {
      const firstTag = normalizeTag(post.tags?.[0] ?? '')
      const author = formatAuthorName(post) || translate('home.hero.fallbackAuthor')
      return {
        post,
        thumbnail: post.thumbnail_url ?? null,
        eyebrow: firstTag ? `#${firstTag}` : author,
        title: formatStoryTitle(post, translate),
        excerpt: formatStoryExcerpt(post, translate),
        author,
        time: post.published_at ? formatRelativeTime(post.published_at, translate) : '',
        detailLink: `/post/${post.id}`,
      }
    })
  })

  const storyCards = computed(() => {
    if (!isEnabled.value) return []

    return collectUniqueItems(
      [
        rawStoryCards.value.filter((card) => !featuredRailPostIds.value.has(card.post.id)),
        rawStoryCards.value,
      ],
      5,
      (card) => card.post.id
    )
  })

  const storyCardIds = computed(() => {
    if (!isEnabled.value) return new Set<string>()
    return new Set(storyCards.value.map((card) => card.post.id))
  })
  const storyCardCount = computed(() => (isEnabled.value ? storyCards.value.length : 0))

  return {
    rawStoryCards,
    storyCards,
    storyCardIds,
    storyCardCount,
  }
}
