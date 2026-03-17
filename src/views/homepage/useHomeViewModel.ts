import { computed } from 'vue'
import { Calendar, MessageSquare, Users } from 'lucide-vue-next'
import {
  normalizeAvatarUrl,
  type HomeAggregateResponse,
  type HomeCommunityHighlight,
  type HomeScheduleHighlight,
  type PostListItem,
} from '@/api'
import { HOME_FALLBACK_POSTS } from '@/mocks/homepageFallback'
import { formatRelativeTime } from '@/utils/date'
import type { ComputedRef, Ref } from 'vue'
import {
  bubbleBursts,
  buildMediaHighlightCard,
  collectUniqueItems,
  formatAuthorName,
  formatBubbleText,
  formatCommunityHighlightMeta,
  formatHomeAuthorName,
  formatMetricValue,
  formatScheduleHighlightMeta,
  formatScheduleHighlightText,
  getPortalCardAvailabilityLabel,
  getPortalItemCountSummary,
  getPortalItemCountText,
  getPortalItemLabel,
  getPortalPreviewAuthorLabel,
  isMediaPost,
  isTextPost,
  mapFeaturedItemToPost,
  mapHomeImageUrl,
  mapLatestTextItemToPost,
  normalizeHomeTag,
  normalizeTag,
  normalizeText,
  type FeaturedRailCard,
  type HomeTranslate,
} from './homeModel'
import { useHomeHeroState } from './useHomeHeroState'
import { useHomeStoryDeck } from './useHomeStoryDeck'

export function useHomeViewModel(options: {
  homeAggregate: Ref<HomeAggregateResponse | null>
  allPosts: Ref<PostListItem[]>
  homeDataSource: Ref<'idle' | 'aggregate' | 'support' | 'fallback'>
  error: Ref<string | null>
  total: Ref<number>
  homeScheduleHighlights: Ref<HomeScheduleHighlight[]>
  homeCommunityHighlights: Ref<HomeCommunityHighlight[]>
  shouldAnimate: ComputedRef<boolean>
  translate: HomeTranslate
  locale: Ref<string>
}) {
  const {
    homeAggregate,
    allPosts,
    homeDataSource,
    error,
    total,
    homeScheduleHighlights,
    homeCommunityHighlights,
    shouldAnimate,
    translate,
    locale,
  } = options

  const homeSourcePosts = computed(() => {
    if (homeDataSource.value !== 'fallback') return allPosts.value
    return allPosts.value.length > 0 ? allPosts.value : HOME_FALLBACK_POSTS
  })

  const isUsingFallbackPosts = computed(() => homeDataSource.value === 'fallback')
  const showPreviewNotice = computed(() => Boolean(error.value) && isUsingFallbackPosts.value)

  const fallbackTrendingTags = computed(() => {
    const tagCounts = new Map<string, number>()
    for (const post of homeSourcePosts.value) {
      const tags = post.tags ?? []
      for (const rawTag of tags) {
        const tag = normalizeTag(rawTag)
        if (!tag) continue
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)
  })

  const trendingTags = computed(() => {
    const liveTags = [
      ...(homeAggregate.value?.hero.trending_tags ?? []),
      ...(homeAggregate.value?.trends.tags ?? []),
    ]
      .map((tag) => normalizeHomeTag(tag))
      .filter(Boolean)

    if (liveTags.length > 0) {
      return Array.from(new Set(liveTags)).slice(0, 8)
    }

    return fallbackTrendingTags.value
  })

  const postsToolbarTags = computed(() => trendingTags.value.slice(0, 5))

  const uniqueAuthorCount = computed(() => {
    const keys = new Set<string>()
    for (const post of homeSourcePosts.value) {
      const key =
        post.author_id || post.author_username || post.author_name || post.original_author_id || ''
      if (key) keys.add(key)
    }
    return keys.size
  })

  const fallbackTrendingAuthors = computed(() => {
    const authorMap = new Map<
      string,
      { key: string; name: string; avatar: string | null; count: number; link: string }
    >()

    for (const post of homeSourcePosts.value) {
      const key =
        post.author_id || post.author_username || post.author_name || post.original_author_id || ''
      if (!key) continue

      const name = formatAuthorName(post)
      const avatar = normalizeAvatarUrl(post.author_avatar_url) || post.author_avatar_url || null
      const entry = authorMap.get(key)
      if (entry) {
        entry.count += 1
        if (!entry.name && name) entry.name = name
        if (!entry.avatar && avatar) entry.avatar = avatar
      } else {
        authorMap.set(key, {
          key,
          name: name || translate('home.hero.fallbackAuthor'),
          avatar,
          count: 1,
          link: post.author_id ? `/author/${post.author_id}` : '/authors',
        })
      }
    }

    return Array.from(authorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  })

  const trendingAuthors = computed(() => {
    const liveAuthors = homeAggregate.value?.trends.authors ?? []
    if (liveAuthors.length > 0) {
      return liveAuthors.slice(0, 4).map((author) => ({
        key: author.id || author.deep_link || author.display_name,
        name: author.display_name || translate('home.hero.fallbackAuthor'),
        avatar: normalizeAvatarUrl(author.avatar_url) || author.avatar_url || null,
        count: author.post_count ?? 0,
        link: author.deep_link || '/authors',
      }))
    }

    return fallbackTrendingAuthors.value
  })

  const leadingTrendingAuthor = computed(() => trendingAuthors.value[0] ?? null)
  const textPosts = computed(() => homeSourcePosts.value.filter((post) => isTextPost(post)))
  const mediaPosts = computed(() => homeSourcePosts.value.filter((post) => isMediaPost(post)))

  const fallbackFeaturedRailPosts = computed(() => {
    const ordered = [...mediaPosts.value, ...homeSourcePosts.value]
    const seen = new Set<string>()
    return ordered
      .filter((post) => {
        if (seen.has(post.id)) return false
        seen.add(post.id)
        return true
      })
      .slice(0, 4)
  })

  const portalItemMap = computed(
    () =>
      new Map((homeAggregate.value?.portal.items ?? []).map((item) => [item.key, item] as const))
  )
  const portalRecommendItem = computed(() => portalItemMap.value.get('recommend') ?? null)
  const portalSchedulePreview = computed(() => portalItemMap.value.get('schedule')?.preview ?? null)
  const portalCommunityPreview = computed(
    () => portalItemMap.value.get('community')?.preview ?? null
  )
  const portalRecommendLink = computed(() => portalRecommendItem.value?.deep_link || '/explore')
  const portalRecommendDescription = computed(() => {
    if (!portalRecommendItem.value) return translate('home.portal.items.recommend.desc')
    return translate('home.portal.items.recommend.dynamicDesc', {
      count: getPortalItemCountText(portalRecommendItem.value),
    })
  })

  const liveFeaturedRailItems = computed(() =>
    (homeAggregate.value?.featured.items ?? []).slice(0, 4)
  )

  const featuredRailCards = computed<FeaturedRailCard[]>(() =>
    liveFeaturedRailItems.value.map((item) => {
      const post = mapFeaturedItemToPost(item, translate)
      const relatedPost = item.related_posts?.[0]
      const author =
        formatHomeAuthorName(item.related_authors?.[0] ?? item.related_posts?.[0]?.author) ||
        translate('home.hero.fallbackAuthor')
      const title = normalizeText(item.title) || post.title || translate('home.hero.fallbackTitle')
      const rawSummary =
        normalizeText(item.summary || item.subtitle) ||
        normalizeText(relatedPost?.excerpt) ||
        normalizeText(post.description)
      const summary = rawSummary && rawSummary !== title ? rawSummary : ''
      const time = relatedPost?.published_at
        ? formatRelativeTime(relatedPost.published_at, translate)
        : ''
      const primaryTag = normalizeHomeTag(relatedPost?.tags?.[0])
      const kicker =
        normalizeText(item.kicker).toUpperCase() ||
        normalizeText(relatedPost?.platform).toUpperCase() ||
        translate('home.featured.kicker')

      const stats = [
        ...(relatedPost?.metrics?.view_count
          ? [
              {
                key: 'views',
                label: translate('post.views'),
                value: formatMetricValue(relatedPost.metrics.view_count),
              },
            ]
          : []),
        ...(relatedPost?.metrics?.like_count
          ? [
              {
                key: 'likes',
                label: translate('post.likes'),
                value: formatMetricValue(relatedPost.metrics.like_count),
              },
            ]
          : []),
      ].slice(0, 2)

      return {
        id: post.id,
        post,
        thumbnail: mapHomeImageUrl(item.cover),
        kicker,
        eyebrow: primaryTag ? `#${primaryTag}` : author,
        title,
        summary,
        author,
        time,
        stats,
      }
    })
  )

  const featuredRailPostIds = computed(
    () => new Set(featuredRailCards.value.map((card) => card.post.id))
  )

  const { rawStoryCards, storyCards, storyCardIds, storyCardCount } = useHomeStoryDeck({
    homeAggregate,
    homeSourcePosts,
    mediaPosts,
    featuredRailPostIds,
    translate,
  })

  const heroState = useHomeHeroState({
    homeAggregate,
    homeSourcePosts,
    textPosts,
    total,
    uniqueAuthorCount,
    trendingTags,
    shouldAnimate,
    translate,
  })

  const featuredRailPosts = computed(() => fallbackFeaturedRailPosts.value)

  const curatedMediaHighlights = computed(() => {
    const featuredCards = liveFeaturedRailItems.value.map((item) => {
      const post = mapFeaturedItemToPost(item, translate)
      return buildMediaHighlightCard(post, translate, {
        thumbnail: mapHomeImageUrl(item.cover),
        title: normalizeText(item.title) || post.title || translate('home.hero.fallbackTitle'),
        author:
          formatHomeAuthorName(item.related_authors?.[0] ?? item.related_posts?.[0]?.author) ||
          formatAuthorName(post) ||
          translate('home.hero.fallbackAuthor'),
      })
    })

    const storyCardsAsHighlights = rawStoryCards.value.map((card) =>
      buildMediaHighlightCard(card.post, translate, {
        thumbnail: card.thumbnail,
        title: card.title,
        author: card.author,
      })
    )

    const fallbackCards = mediaPosts.value.map((post) => buildMediaHighlightCard(post, translate))

    return collectUniqueItems(
      [
        heroState.heroSpotlightMediaCard.value ? [heroState.heroSpotlightMediaCard.value] : [],
        storyCardsAsHighlights,
        featuredCards,
        heroState.heroHighlightCards.value,
        fallbackCards,
      ],
      12,
      (card) => card.post.id
    )
  })

  const portalLeadCard = computed(() => {
    const excludedIds = new Set([...featuredRailPostIds.value, ...storyCardIds.value])
    const preferred = collectUniqueItems(
      [curatedMediaHighlights.value],
      1,
      (card) => card.post.id,
      excludedIds
    )

    return preferred[0] ?? curatedMediaHighlights.value[0] ?? null
  })

  const spotlightMediaCards = computed(() => {
    const excludedIds = new Set([...featuredRailPostIds.value, ...storyCardIds.value])
    if (portalLeadCard.value) excludedIds.add(portalLeadCard.value.post.id)

    const preferred = collectUniqueItems(
      [curatedMediaHighlights.value],
      4,
      (card) => card.post.id,
      excludedIds
    )

    return preferred.length > 0 ? preferred : curatedMediaHighlights.value.slice(0, 4)
  })

  const portalLeadEyebrow = computed(() => {
    if (heroState.heroSpotlightTag.value) return `#${heroState.heroSpotlightTag.value}`
    return portalLeadCard.value?.author || translate('home.hero.fallbackAuthor')
  })

  const portalLeadPreviewTitle = computed(() => {
    const title = normalizeText(portalLeadCard.value?.title)
    if (!title) return translate('home.portal.items.recommend.title')
    return title.length > 56 ? `${title.slice(0, 56)}…` : title
  })

  const portalOverviewStats = computed(() => {
    const keys = ['authors', 'schedule', 'community'] as const
    const liveStats = keys
      .map((key) => {
        const item = portalItemMap.value.get(key)
        if (!item) return null
        return {
          key,
          label: getPortalItemLabel(key, translate),
          value: getPortalItemCountText(item),
        }
      })
      .filter((item): item is { key: string; label: string; value: string } => Boolean(item))

    if (liveStats.length > 0) return liveStats
    return heroState.heroStats.value
  })

  const resolvedScheduleHighlights = computed(() => {
    if (homeScheduleHighlights.value.length > 0) {
      return homeScheduleHighlights.value
    }
    return homeAggregate.value?.trends.schedules ?? []
  })

  const resolvedCommunityHighlights = computed(() => {
    if (homeCommunityHighlights.value.length > 0) {
      return homeCommunityHighlights.value
    }
    return homeAggregate.value?.trends.community ?? []
  })

  const communityHighlightPreview = computed(() => resolvedCommunityHighlights.value[0] ?? null)
  const primaryScheduleHighlights = computed(() => resolvedScheduleHighlights.value.slice(0, 2))

  const scheduleFallbackCard = computed(() => {
    const scheduleItem = portalItemMap.value.get('schedule')
    return {
      label: translate('home.trends.scheduleTitle'),
      title: getPortalCardAvailabilityLabel(scheduleItem, translate),
      text: translate('home.portal.items.schedule.desc'),
      meta:
        getPortalItemCountSummary(scheduleItem, translate) ||
        translate('home.trends.scheduleAction'),
    }
  })

  const trendsScheduleCompanion = computed(() => {
    if (primaryScheduleHighlights.value.length !== 1) return null

    const community = communityHighlightPreview.value
    if (community) {
      return {
        kind: 'community',
        label: translate('nav.community'),
        title: community.title,
        text: community.excerpt,
        meta: formatCommunityHighlightMeta(community, translate),
        to: community.deep_link || '/community',
      }
    }

    return null
  })

  const portalPanels = computed(() => {
    const firstAuthor = trendingAuthors.value[0]
    const authorItem = portalItemMap.value.get('authors')
    const scheduleItem = portalItemMap.value.get('schedule')
    const communityItem = portalItemMap.value.get('community')
    const schedulePreview = portalSchedulePreview.value
    const communityPreview = portalCommunityPreview.value
    const firstSchedule = resolvedScheduleHighlights.value[0]
    const firstCommunity = communityHighlightPreview.value

    return [
      {
        key: 'authors',
        title: translate('home.portal.items.authors.title'),
        desc: translate('home.portal.items.authors.desc'),
        to: authorItem?.deep_link || '/authors',
        icon: Users,
        animation: 'user',
        noteLabel: firstAuthor
          ? translate('home.trends.authorsTitle')
          : getPortalCardAvailabilityLabel(authorItem, translate),
        noteTitle: firstAuthor?.name ?? translate('home.portal.items.authors.title'),
        noteText: firstAuthor
          ? translate('home.trends.authorCount', { n: firstAuthor.count })
          : translate('home.portal.items.authors.desc'),
        noteMeta: firstAuthor
          ? getPortalItemCountSummary(authorItem, translate)
          : translate('home.trends.authorsAction'),
      },
      {
        key: 'schedule',
        title: translate('home.portal.items.schedule.title'),
        desc: translate('home.portal.items.schedule.desc'),
        to: schedulePreview?.deep_link || scheduleItem?.deep_link || '/schedule',
        icon: Calendar,
        animation: 'calendar',
        noteLabel:
          getPortalPreviewAuthorLabel(schedulePreview) ||
          firstSchedule?.badge ||
          (firstSchedule ? formatScheduleHighlightText(firstSchedule, translate) : null) ||
          getPortalCardAvailabilityLabel(scheduleItem, translate),
        noteTitle:
          normalizeText(schedulePreview?.title) ||
          firstSchedule?.title ||
          translate('home.portal.items.schedule.title'),
        noteText:
          normalizeText(schedulePreview?.summary) ||
          (firstSchedule
            ? [
                formatScheduleHighlightText(firstSchedule, translate),
                formatHomeAuthorName(firstSchedule.author),
              ]
                .filter(Boolean)
                .join(' · ')
            : translate('home.portal.items.schedule.desc')),
        noteMeta:
          normalizeText(schedulePreview?.meta) ||
          formatScheduleHighlightMeta(firstSchedule, locale.value) ||
          getPortalItemCountSummary(scheduleItem, translate) ||
          translate('home.trends.scheduleAction'),
      },
      {
        key: 'community',
        title: translate('home.portal.items.community.title'),
        desc: translate('home.portal.items.community.desc'),
        to:
          communityPreview?.deep_link ||
          firstCommunity?.deep_link ||
          communityItem?.deep_link ||
          '/community',
        icon: MessageSquare,
        animation: 'sparkle',
        noteLabel:
          getPortalPreviewAuthorLabel(communityPreview) ||
          (firstCommunity
            ? translate('community.recentDiscussions')
            : getPortalCardAvailabilityLabel(communityItem, translate)),
        noteTitle:
          normalizeText(communityPreview?.title) ||
          firstCommunity?.title ||
          translate('home.portal.items.community.title'),
        noteText:
          normalizeText(communityPreview?.summary) ||
          normalizeText(firstCommunity?.excerpt) ||
          translate('home.portal.items.community.desc'),
        noteMeta:
          normalizeText(communityPreview?.meta) ||
          formatCommunityHighlightMeta(firstCommunity, translate) ||
          getPortalItemCountSummary(communityItem, translate) ||
          translate('nav.community'),
      },
    ]
  })

  const bubbleItems = computed(() => {
    const liveItems = homeAggregate.value?.latest_text_posts ?? []
    if (liveItems.length > 0) {
      const editorialPostId = homeAggregate.value?.hero.editorial_card?.post_id ?? null
      const preferredItems = collectUniqueItems(
        [
          liveItems.filter(
            (item) =>
              !heroState.spotlightTextPostIds.value.has(item.post_id) &&
              item.post_id !== editorialPostId
          ),
          liveItems,
        ],
        bubbleBursts.length,
        (item) => item.post_id
      )

      return preferredItems.map((item, index) => {
        const orbit = bubbleBursts[index]
        const post = mapLatestTextItemToPost(item, translate)
        return {
          post,
          thumbnail: null,
          text: formatBubbleText(post, translate),
          author: formatHomeAuthorName(item.author) || translate('home.hero.fallbackAuthor'),
          time:
            normalizeText(item.time_hint) ||
            (item.published_at ? formatRelativeTime(item.published_at, translate) : ''),
          style: {
            '--bubble-x': orbit.x,
            '--bubble-y': orbit.y,
            '--bubble-x-intro': orbit.introX,
            '--bubble-y-intro': orbit.introY,
            '--bubble-delay': orbit.delay,
            '--bubble-scale': orbit.scale,
            '--bubble-tail-angle': orbit.tailAngle,
          } as Record<string, string>,
        }
      })
    }

    const items = collectUniqueItems(
      [
        textPosts.value.filter(
          (post) =>
            !heroState.spotlightTextPostIds.value.has(post.id) &&
            post.id !== (heroState.latestTextPost.value?.id ?? '')
        ),
        textPosts.value,
      ],
      bubbleBursts.length,
      (post) => post.id
    )

    return items.map((post, index) => {
      const orbit = bubbleBursts[index]
      return {
        post,
        thumbnail: post.thumbnail_url ?? null,
        text: formatBubbleText(post, translate),
        author: formatAuthorName(post) || translate('home.hero.fallbackAuthor'),
        time: post.published_at ? formatRelativeTime(post.published_at, translate) : '',
        style: {
          '--bubble-x': orbit.x,
          '--bubble-y': orbit.y,
          '--bubble-x-intro': orbit.introX,
          '--bubble-y-intro': orbit.introY,
          '--bubble-delay': orbit.delay,
          '--bubble-scale': orbit.scale,
          '--bubble-tail-angle': orbit.tailAngle,
        } as Record<string, string>,
      }
    })
  })

  const quickFilters = computed(() => [
    { key: 'newest', label: translate('explore.newest'), to: { name: 'explore' } },
    {
      key: 'popular',
      label: translate('explore.popular'),
      to: { name: 'explore', query: { sort: 'popular' } },
    },
    {
      key: 'trending',
      label: translate('explore.trending'),
      to: { name: 'explore', query: { sort: 'trending' } },
    },
  ])

  return {
    bubbleItems,
    communityHighlightPreview,
    featuredRailCards,
    featuredRailPostIds,
    featuredRailPosts,
    homeSourcePosts,
    isUsingFallbackPosts,
    leadingTrendingAuthor,
    mediaPosts,
    portalLeadCard,
    portalLeadEyebrow,
    portalLeadPreviewTitle,
    portalOverviewStats,
    portalPanels,
    portalRecommendDescription,
    portalRecommendLink,
    postsToolbarTags,
    primaryScheduleHighlights,
    quickFilters,
    resolvedCommunityHighlights,
    resolvedScheduleHighlights,
    scheduleFallbackCard,
    showPreviewNotice,
    spotlightMediaCards,
    storyCardCount,
    storyCardIds,
    storyCards,
    textPosts,
    trendingAuthors,
    trendingTags,
    trendsScheduleCompanion,
    uniqueAuthorCount,
    ...heroState,
  }
}
