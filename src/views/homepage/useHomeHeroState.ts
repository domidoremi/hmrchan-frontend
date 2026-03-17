import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import { formatRelativeTime } from '@/utils/date'
import type { ComputedRef, Ref } from 'vue'
import type { HomeAggregateResponse, HomeLatestTextPostItem, PostListItem } from '@/api'
import type { HomeTranslate, MediaHighlightCard, SpotlightTextCard } from './homeModel'
import {
  buildMediaHighlightCard,
  collectUniqueItems,
  formatAuthorName,
  formatBubbleText,
  formatHeroAuthor,
  formatHeroTitle,
  formatHomeAuthorName,
  formatMetricValue,
  getHeroStatHint,
  getHeroStatLabel,
  mapHomeImageUrl,
  mapLatestTextItemToPost,
  normalizeHomeTag,
  normalizeText,
} from './homeModel'

function getSpotlightTextScore(item: HomeLatestTextPostItem): number {
  return normalizeText(item.excerpt).length + (item.tags?.length ?? 0) * 16
}

export function useHomeHeroState(options: {
  homeAggregate: Ref<HomeAggregateResponse | null>
  homeSourcePosts: ComputedRef<PostListItem[]>
  textPosts: ComputedRef<PostListItem[]>
  total: Ref<number>
  uniqueAuthorCount: ComputedRef<number>
  trendingTags: ComputedRef<string[]>
  shouldAnimate: ComputedRef<boolean>
  translate: HomeTranslate
}) {
  const {
    homeAggregate,
    homeSourcePosts,
    textPosts,
    total,
    uniqueAuthorCount,
    trendingTags,
    shouldAnimate,
    translate,
  } = options

  const heroEditorialVisible = ref(false)
  let heroEditorialRevealTimer: number | null = null

  const heroHighlightPosts = computed(() => {
    const source = homeSourcePosts.value
    const withThumbnail = source.filter((post) => !!post.thumbnail_url)
    return (withThumbnail.length > 0 ? withThumbnail : source).slice(0, 5)
  })

  const heroHighlightCards = computed(() =>
    heroHighlightPosts.value.map((post) => ({
      post,
      thumbnail: mapHomeImageUrl(
        { url: post.thumbnail_url, thumbnail_url: post.thumbnail_url },
        'medium'
      ),
      title: formatHeroTitle(post, translate),
      author: formatHeroAuthor(post, translate),
    }))
  )

  const latestTextPost = computed(() => textPosts.value[0] ?? null)
  const heroTags = computed(() => trendingTags.value.slice(0, 6))

  const heroSpotlightPost = computed<PostListItem | null>(() => {
    const spotlight = homeAggregate.value?.hero.spotlight
    if (!spotlight?.post_id) return null

    return {
      id: spotlight.post_id,
      platform: 'story',
      title: normalizeText(spotlight.title) || translate('home.hero.fallbackTitle'),
      content: normalizeText(spotlight.summary) || undefined,
      description: normalizeText(spotlight.summary) || undefined,
      thumbnail_url: mapHomeImageUrl(spotlight.image, 'large'),
      published_at: undefined,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      media_count: spotlight.image ? 1 : 0,
      media_type: spotlight.image ? 'image' : undefined,
      author_name: formatHomeAuthorName(spotlight.author) || undefined,
      author_id: spotlight.author?.id ?? undefined,
      author_username: spotlight.author?.username ?? undefined,
      author_avatar_url: spotlight.author?.avatar_url ?? undefined,
      post_url: spotlight.deep_link || undefined,
      tags: spotlight.primary_tag ? [normalizeHomeTag(spotlight.primary_tag)] : undefined,
    }
  })

  const heroSpotlightMediaCard = computed<MediaHighlightCard | null>(() => {
    const post = heroSpotlightPost.value
    if (!post) return null
    return buildMediaHighlightCard(post, translate, {
      thumbnail: post.thumbnail_url ?? null,
      title:
        normalizeText(homeAggregate.value?.hero.spotlight?.title) ||
        formatHeroTitle(post, translate),
      author:
        formatHomeAuthorName(homeAggregate.value?.hero.spotlight?.author) ||
        formatHeroAuthor(post, translate),
    })
  })

  const heroEditorialCard = computed(() => {
    const editorial = homeAggregate.value?.hero.editorial_card
    if (editorial) {
      const title = normalizeText(editorial.title)
      const text = normalizeText(editorial.text)
      const author = formatHomeAuthorName(editorial.author) || translate('home.hero.fallbackAuthor')
      const time =
        normalizeText(editorial.time_hint) ||
        (editorial.published_at ? formatRelativeTime(editorial.published_at, translate) : '')

      if (title || text || author) {
        return {
          title: title || author,
          text: text || translate('home.hero.fallbackTitle'),
          author,
          time,
        }
      }
    }

    const post = latestTextPost.value
    if (!post) return null

    const rawText = normalizeText(post.content ?? post.description ?? post.title)
    const rawTitle = normalizeText(post.title)
    const author = formatAuthorName(post) || translate('home.hero.fallbackAuthor')
    const time = post.published_at ? formatRelativeTime(post.published_at, translate) : ''

    return {
      title:
        rawTitle && rawTitle !== rawText
          ? rawTitle.length > 40
            ? `${rawTitle.slice(0, 40)}…`
            : rawTitle
          : author,
      text:
        rawText.length > 120
          ? `${rawText.slice(0, 120)}…`
          : rawText || translate('home.hero.fallbackTitle'),
      author,
      time,
    }
  })

  const heroEditorialSupportText = computed(() => {
    const card = heroEditorialCard.value
    if (!card) return ''
    const title = normalizeText(card.title)
    const text = normalizeText(card.text)
    return text && text !== title ? text : ''
  })

  const heroEditorialRevealKey = computed(() => {
    const card = heroEditorialCard.value
    if (!card) return ''
    return [card.title, card.text, card.author, card.time]
      .map((value) => normalizeText(value))
      .join('|')
  })

  const rawSpotlightTextCards = computed<SpotlightTextCard[]>(() => {
    const liveItems = homeAggregate.value?.latest_text_posts ?? []
    if (liveItems.length > 0) {
      const editorialPostId = homeAggregate.value?.hero.editorial_card?.post_id ?? null
      const filteredItems = editorialPostId
        ? liveItems.filter((item) => item.post_id !== editorialPostId)
        : liveItems
      const spotlightItems = (filteredItems.length >= 3 ? filteredItems : liveItems)
        .slice(0, 6)
        .sort((a, b) => {
          const scoreDelta = getSpotlightTextScore(b) - getSpotlightTextScore(a)
          if (scoreDelta !== 0) return scoreDelta

          const publishedA = Date.parse(a.published_at ?? '')
          const publishedB = Date.parse(b.published_at ?? '')
          if (Number.isFinite(publishedA) && Number.isFinite(publishedB)) {
            return publishedB - publishedA
          }
          return 0
        })
        .slice(0, 3)

      return spotlightItems.map((item) => {
        const post = mapLatestTextItemToPost(item, translate)
        const title = formatHeroTitle(post, translate)
        const text = formatBubbleText(post, translate)
        return {
          post,
          title,
          text,
          supportText: normalizeText(text) !== normalizeText(title) ? text : '',
          author: formatHomeAuthorName(item.author) || translate('home.hero.fallbackAuthor'),
          time:
            normalizeText(item.time_hint) ||
            (item.published_at ? formatRelativeTime(item.published_at, translate) : ''),
        }
      })
    }

    return textPosts.value.slice(0, 3).map((post) => {
      const title = formatHeroTitle(post, translate)
      const text = formatBubbleText(post, translate)
      return {
        post,
        title,
        text,
        supportText: normalizeText(text) !== normalizeText(title) ? text : '',
        author: formatAuthorName(post) || translate('home.hero.fallbackAuthor'),
        time: post.published_at ? formatRelativeTime(post.published_at, translate) : '',
      }
    })
  })

  const spotlightTextCards = computed(() =>
    collectUniqueItems([rawSpotlightTextCards.value], 3, (card) => card.post.id)
  )
  const spotlightTextPostIds = computed(
    () => new Set(spotlightTextCards.value.map((card) => card.post.id))
  )

  const heroEditorialTitle = computed(() => {
    const spotlight = homeAggregate.value?.hero.spotlight
    return (
      normalizeText(spotlight?.title) ||
      heroHighlightCards.value[0]?.title ||
      translate('home.hero.editorialFallbackTitle')
    )
  })

  const heroEditorialText = computed(() => {
    const spotlight = homeAggregate.value?.hero.spotlight
    const spotlightSummary = normalizeText(spotlight?.summary)
    if (spotlightSummary) {
      return spotlightSummary
    }

    const author = heroHighlightCards.value[0]?.author || translate('home.hero.fallbackAuthor')
    const tag = heroTags.value[0]
    return tag
      ? translate('home.hero.editorialTextWithTag', { author, tag: `#${tag}` })
      : translate('home.hero.editorialText', { author })
  })

  const heroSpotlightTag = computed(() => {
    const spotlight = homeAggregate.value?.hero.spotlight
    return normalizeHomeTag(spotlight?.primary_tag) || heroTags.value[0] || ''
  })

  const heroSpotlightMeta = computed(() => {
    const spotlight = homeAggregate.value?.hero.spotlight
    return (
      formatHomeAuthorName(spotlight?.author) ||
      heroHighlightCards.value[0]?.author ||
      translate('home.hero.fallbackAuthor')
    )
  })

  const heroStats = computed(() => {
    const liveStats = homeAggregate.value?.hero.stats ?? []
    if (liveStats.length > 0) {
      return liveStats.slice(0, 3).map((stat) => ({
        key: stat.key,
        label: getHeroStatLabel(stat.key, stat.label, translate),
        value: stat.display_value || formatMetricValue(stat.value),
        note: getHeroStatHint(stat.key, stat.hint, translate),
      }))
    }

    return [
      {
        key: 'updates',
        label: translate('home.hero.stats.updates'),
        value: formatMetricValue(total.value || homeSourcePosts.value.length),
        note: translate('home.hero.stats.updatesHint'),
      },
      {
        key: 'authors',
        label: translate('home.hero.stats.authors'),
        value: formatMetricValue(uniqueAuthorCount.value),
        note: translate('home.hero.stats.authorsHint'),
      },
      {
        key: 'tags',
        label: translate('home.hero.stats.tags'),
        value: formatMetricValue(trendingTags.value.length),
        note: translate('home.hero.stats.tagsHint'),
      },
    ]
  })

  function clearHeroEditorialRevealTimer(): void {
    if (typeof window === 'undefined' || heroEditorialRevealTimer === null) return
    window.clearTimeout(heroEditorialRevealTimer)
    heroEditorialRevealTimer = null
  }

  watch(
    [heroEditorialRevealKey, shouldAnimate],
    ([key, animate]) => {
      clearHeroEditorialRevealTimer()

      if (!key) {
        heroEditorialVisible.value = false
        return
      }

      if (!animate || typeof window === 'undefined') {
        heroEditorialVisible.value = true
        return
      }

      heroEditorialVisible.value = false
      heroEditorialRevealTimer = window.setTimeout(() => {
        heroEditorialVisible.value = true
        heroEditorialRevealTimer = null
      }, 220)
    },
    { immediate: true }
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearHeroEditorialRevealTimer()
    })
  }

  return {
    heroEditorialCard,
    heroEditorialSupportText,
    heroEditorialText,
    heroEditorialTitle,
    heroEditorialVisible,
    heroHighlightCards,
    heroHighlightPosts,
    heroSpotlightMediaCard,
    heroSpotlightMeta,
    heroSpotlightPost,
    heroSpotlightTag,
    heroStats,
    heroTags,
    latestTextPost,
    rawSpotlightTextCards,
    spotlightTextCards,
    spotlightTextPostIds,
    clearHeroEditorialRevealTimer,
  }
}
