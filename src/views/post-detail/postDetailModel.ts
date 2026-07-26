export interface PostDetailMediaLike {
  id?: string | null
  file_type?: string | null
  width?: number | null
  height?: number | null
  subtitles?: unknown[] | null
}

export interface PostDetailLike {
  title?: string | null
  description?: string | null
  published_at?: string | null
  thumbnail_url?: string | null
  media_count?: number | null
  media_files?: PostDetailMediaLike[] | null
}

export type PostDetailMediaUrlResolver = {
  getMediaThumbnailUrl: (mediaId: string, size: string) => string
  getMediaThumbnailSrcset: (mediaId: string) => string | null
  resolveThumbnailSrc: (url: string | null, size: string) => string
  resolveThumbnailSrcset: (url: string | null) => string | null
}

export type PostDetailMediaHintSourceResolver = Pick<
  PostDetailMediaUrlResolver,
  'getMediaThumbnailUrl' | 'resolveThumbnailSrc'
>

export type PostDetailMediaState = {
  activeMedia: PostDetailMediaLike | null
  subtitlesAvailable: boolean
  hasMultipleMedia: boolean
  mediaCount: number
  canGoPrevMedia: boolean
  canGoNextMedia: boolean
  showMediaNavButtons: boolean
  isImageSequence: boolean
}

export type PostDetailMediaTransitionName = 'media-fade' | 'media-slide-left' | 'media-slide-right'

export type PostDetailMediaStepDirection = -1 | 1
export type PostDetailNavigationDirection = -1 | 1
export type PostDetailNavigationHint = 'left' | 'right'

export type PostDetailMediaTransition = {
  activeMediaIndex: number
  mediaTransitionName: PostDetailMediaTransitionName
}

export type PostDetailNotFoundRouteParams = {
  pathMatch: string[]
}

export type PostDetailNavigationContextLike = {
  ids: readonly string[]
  index: number
}

export type PostDetailNavigationTarget = {
  index: number
  postId: string
  transition: PostDetailNavigationHint
}

export type PostDetailPendingNavigation = {
  direction: PostDetailNavigationDirection
  expiresAt: number
}

export type PostDetailNavigationRequest =
  | {
      action: 'navigate'
      direction: PostDetailNavigationDirection
    }
  | {
      action: 'prime'
      pending: PostDetailPendingNavigation
      hint: PostDetailNavigationHint
    }

export type PostDetailFallbackRecovery = 'none' | 'navigation-summary' | 'static-fallback'

export type PostDetailWheelState = {
  accumulator: number
  lastEventTime: number
}

export type PostDetailWheelIntent = {
  direction: PostDetailNavigationDirection | null
  state: PostDetailWheelState
  shouldPreventDefault: boolean
}

export type PostDetailTouchPoint = {
  x: number | null
  y: number | null
}

export type PostDetailRectLike = {
  top: number
  bottom: number
  width: number
  height: number
}

export type PostDetailScrollMetrics = {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export type PostDetailPageMeta = {
  title: string
  description: string
  canonicalPath: string
  ogType: 'article'
  ogImage?: string | null
}

export type PostDetailFallbackCandidateResolver<TSummary, TPost> = {
  recovery: PostDetailFallbackRecovery
  navigationSummary: TSummary | null | undefined
  buildNavigationFallback: (summary: TSummary) => TPost
  resolveStaticFallback: () => TPost | null
}

export type PostDetailFallbackRecoveryErrorClassifier = {
  err: unknown
  hasNavigationSummary: boolean
  isNotFoundError: (err: unknown) => boolean
  isServiceUnavailableError: (err: unknown) => boolean
}

export type PostDetailFetchErrorOutcome =
  | {
      action: 'not-found-redirect'
    }
  | {
      action: 'api-error'
      message: string
    }
  | {
      action: 'generic-error'
    }

export type PostDetailFetchErrorClassifier = {
  err: unknown
  isNotFoundError: (err: unknown) => boolean
  getApiErrorMessage: (err: unknown) => string | null
}

export type PostDetailAdjacentMediaPreloadTarget = {
  mediaId: string
  thumbnailUrl: string
  fullSizeUrl: string
  shouldPreloadThumbnail: boolean
}

export const POST_DETAIL_IGNORED_INTERACTION_SELECTOR =
  '.post-panel, .post-actions, .media-thumbnails, .thumbnail-btn, .vp, .vp__controls, a, button, input, textarea'

type ClosableEventTarget = EventTarget & {
  closest?: (selector: string) => Element | null
}

export function shouldIgnorePostDetailInteractionTarget(
  target: EventTarget | null | undefined,
  selector = POST_DETAIL_IGNORED_INTERACTION_SELECTOR
): boolean {
  if (!target || typeof (target as ClosableEventTarget).closest !== 'function') return false
  return Boolean((target as ClosableEventTarget).closest?.(selector))
}

export function computePostDetailScrollProgress({
  scrollTop,
  scrollHeight,
  clientHeight,
}: PostDetailScrollMetrics): number {
  const docHeight = scrollHeight - clientHeight
  if (docHeight <= 0) return 0
  return Math.min(Math.max(scrollTop / docHeight, 0), 1)
}

export function buildDetailTitle(post: PostDetailLike | null | undefined): string {
  const title = (post?.title ?? '').trim()
  const description = (post?.description ?? '').trim()

  if (!title) return ''
  if (title === description) return ''
  if (description && description.startsWith(title)) return ''
  return title
}

export function buildDetailDescription(post: PostDetailLike | null | undefined): string {
  const title = (post?.title ?? '').trim()
  const description = (post?.description ?? '').trim()

  if (!description) return ''
  if (!title) return description
  if (description === title) return ''

  if (description.startsWith(title)) {
    return description
      .slice(title.length)
      .replace(/^[\s\u3000\-–—:：|｜/\\]+/, '')
      .trim()
  }

  return description
}

export function buildPostDetailPageMeta(
  post: PostDetailLike | null | undefined,
  canonicalPath: string
): PostDetailPageMeta | null {
  const title = post?.title?.trim()
  if (!title) return null

  return {
    title,
    description: buildDetailDescription(post) || title,
    canonicalPath,
    ogType: 'article',
    ogImage: post?.thumbnail_url ?? null,
  }
}

export function isPostDetailAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

export function shouldShowReadFullText(
  description: string | null | undefined,
  threshold = 280
): boolean {
  return (description?.length ?? 0) > threshold
}

export function buildPostDetailNotFoundRouteParams(
  currentPostId: string
): PostDetailNotFoundRouteParams {
  return {
    pathMatch: ['post', currentPostId],
  }
}

export function resolvePostDetailFallbackRecovery({
  notFound,
  serviceUnavailable,
  hasNavigationSummary,
}: {
  notFound: boolean
  serviceUnavailable: boolean
  hasNavigationSummary: boolean
}): PostDetailFallbackRecovery {
  if (notFound && hasNavigationSummary) return 'navigation-summary'
  if (serviceUnavailable) return 'static-fallback'
  return 'none'
}

export function resolvePostDetailFallbackRecoveryFromError({
  err,
  hasNavigationSummary,
  isNotFoundError,
  isServiceUnavailableError,
}: PostDetailFallbackRecoveryErrorClassifier): PostDetailFallbackRecovery {
  return resolvePostDetailFallbackRecovery({
    notFound: isNotFoundError(err),
    serviceUnavailable: isServiceUnavailableError(err),
    hasNavigationSummary,
  })
}

export function resolvePostDetailFetchErrorOutcome({
  err,
  isNotFoundError,
  getApiErrorMessage,
}: PostDetailFetchErrorClassifier): PostDetailFetchErrorOutcome {
  if (isNotFoundError(err)) {
    return {
      action: 'not-found-redirect',
    }
  }

  const apiErrorMessage = getApiErrorMessage(err)
  if (apiErrorMessage !== null) {
    return {
      action: 'api-error',
      message: apiErrorMessage,
    }
  }

  return {
    action: 'generic-error',
  }
}

export function resolvePostDetailFallbackCandidate<TSummary, TPost>({
  recovery,
  navigationSummary,
  buildNavigationFallback,
  resolveStaticFallback,
}: PostDetailFallbackCandidateResolver<TSummary, TPost>): TPost | null {
  if (recovery === 'navigation-summary' && navigationSummary) {
    return buildNavigationFallback(navigationSummary)
  }
  if (recovery === 'static-fallback') return resolveStaticFallback()
  return null
}

export function resolvePostDetailNavigationHint(
  direction: PostDetailNavigationDirection
): PostDetailNavigationHint {
  return direction > 0 ? 'left' : 'right'
}

export function resolvePostDetailNavigationTarget({
  context,
  currentPostId,
  offset,
}: {
  context: PostDetailNavigationContextLike | null | undefined
  currentPostId: string
  offset: PostDetailNavigationDirection
}): PostDetailNavigationTarget | null {
  if (!context) return null

  const nextIndex = context.index + offset
  if (nextIndex < 0 || nextIndex >= context.ids.length) return null

  const nextId = context.ids[nextIndex]
  if (!nextId || nextId === currentPostId) return null

  return {
    index: nextIndex,
    postId: nextId,
    transition: resolvePostDetailNavigationHint(offset),
  }
}

export function resolvePostDetailNavigationRequest({
  direction,
  pending,
  now,
  confirmationWindowMs = 800,
}: {
  direction: PostDetailNavigationDirection
  pending: PostDetailPendingNavigation | null | undefined
  now: number
  confirmationWindowMs?: number
}): PostDetailNavigationRequest {
  if (pending && pending.direction === direction && pending.expiresAt > now) {
    return {
      action: 'navigate',
      direction,
    }
  }

  return {
    action: 'prime',
    pending: {
      direction,
      expiresAt: now + confirmationWindowMs,
    },
    hint: resolvePostDetailNavigationHint(direction),
  }
}

export function resolvePostDetailWheelIntent({
  deltaX,
  deltaY,
  shiftKey,
  now,
  state,
  resetWindowMs = 250,
  threshold = 110,
}: {
  deltaX: number
  deltaY: number
  shiftKey: boolean
  now: number
  state: PostDetailWheelState
  resetWindowMs?: number
  threshold?: number
}): PostDetailWheelIntent {
  const horizontalDelta = shiftKey && Math.abs(deltaX) < 0.1 ? deltaY : deltaX

  if (Math.abs(horizontalDelta) < Math.abs(deltaY)) {
    return {
      direction: null,
      state,
      shouldPreventDefault: false,
    }
  }

  const accumulator =
    now - state.lastEventTime > resetWindowMs
      ? horizontalDelta
      : state.accumulator + horizontalDelta
  const nextState = {
    accumulator,
    lastEventTime: now,
  }

  if (Math.abs(accumulator) < threshold) {
    return {
      direction: null,
      state: nextState,
      shouldPreventDefault: false,
    }
  }

  return {
    direction: accumulator > 0 ? 1 : -1,
    state: {
      accumulator: 0,
      lastEventTime: now,
    },
    shouldPreventDefault: true,
  }
}

export function resolvePostDetailTouchNavigationDirection({
  start,
  end,
  threshold = 70,
}: {
  start: PostDetailTouchPoint
  end: PostDetailTouchPoint
  threshold?: number
}): PostDetailNavigationDirection | null {
  if (start.x === null || start.y === null || end.x === null || end.y === null) return null

  const deltaX = start.x - end.x
  const deltaY = start.y - end.y

  if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY)) return null
  return deltaX > 0 ? 1 : -1
}

export function buildPublishedMeta(
  post: PostDetailLike | null | undefined,
  options: {
    formatDate: (value: string) => string
    translate: (key: string, params?: Record<string, unknown>) => string
  }
): string {
  const publishedAt = post?.published_at
  if (!publishedAt) return ''
  return options.translate('post.publishedAt', { date: options.formatDate(publishedAt) })
}

export function resolvePostDetailMediaState(
  post: PostDetailLike | null | undefined,
  activeMediaIndex: number
): PostDetailMediaState {
  const mediaFiles = post?.media_files ?? []
  const activeMedia = mediaFiles[activeMediaIndex] ?? null
  const mediaCount = mediaFiles.length
  const hasMultipleMedia = mediaCount > 1

  return {
    activeMedia,
    subtitlesAvailable: Boolean(
      activeMedia && activeMedia.file_type === 'video' && (activeMedia.subtitles?.length ?? 0) > 0
    ),
    hasMultipleMedia,
    mediaCount,
    canGoPrevMedia: activeMediaIndex > 0,
    canGoNextMedia: activeMediaIndex + 1 < mediaCount,
    showMediaNavButtons: hasMultipleMedia && activeMedia?.file_type !== 'video',
    isImageSequence: mediaFiles.every((media) => media.file_type === 'image'),
  }
}

function isValidMediaIndex(index: number, mediaCount: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < mediaCount
}

export function resolveSelectedMediaTransition(
  requestedIndex: number,
  activeMediaIndex: number,
  mediaCount: number
): PostDetailMediaTransition | null {
  if (!isValidMediaIndex(requestedIndex, mediaCount)) return null
  if (requestedIndex === activeMediaIndex) return null

  return {
    activeMediaIndex: requestedIndex,
    mediaTransitionName:
      requestedIndex > activeMediaIndex ? 'media-slide-left' : 'media-slide-right',
  }
}

export function resolveSteppedMediaTransition(
  activeMediaIndex: number,
  mediaCount: number,
  direction: PostDetailMediaStepDirection
): PostDetailMediaTransition | null {
  if (mediaCount <= 1 || !isValidMediaIndex(activeMediaIndex, mediaCount)) return null

  const nextIndex = activeMediaIndex + direction
  if (!isValidMediaIndex(nextIndex, mediaCount)) return null

  return {
    activeMediaIndex: nextIndex,
    mediaTransitionName: direction > 0 ? 'media-slide-left' : 'media-slide-right',
  }
}

export function resolveAutoAdvanceMediaTransition(
  activeMediaIndex: number,
  mediaCount: number
): PostDetailMediaTransition | null {
  if (mediaCount <= 1 || !isValidMediaIndex(activeMediaIndex, mediaCount)) return null

  return {
    activeMediaIndex: (activeMediaIndex + 1) % mediaCount,
    mediaTransitionName: 'media-slide-left',
  }
}

export function getCommentsPreloadMargin(viewportHeight: number): number {
  return Math.max(Math.min(viewportHeight * 0.35, 320), 160)
}

export function shouldLoadCommentsForViewport({
  rect,
  viewportHeight,
}: {
  rect: PostDetailRectLike
  viewportHeight: number
}): boolean {
  if (viewportHeight <= 0) return false

  const hasMeasuredBox = rect.height > 0 || rect.width > 0 || rect.bottom > rect.top
  if (!hasMeasuredBox) return false

  const preloadMargin = getCommentsPreloadMargin(viewportHeight)
  return rect.top <= viewportHeight + preloadMargin && rect.bottom >= -preloadMargin
}

export function resolveMediaAspectRatio(media: PostDetailMediaLike | null | undefined): number {
  if (!media?.width || !media?.height) return 16 / 9
  return media.width / media.height
}

export function buildActiveMediaViewerStyle(
  media: PostDetailMediaLike | null | undefined
): Record<string, string> {
  const aspectRatio = resolveMediaAspectRatio(media)

  if (!media) {
    return {
      '--aspect-ratio': '1.7777778',
      '--media-min-block-size': 'clamp(18rem, 52dvh, 40rem)',
    }
  }

  const intrinsicHeight =
    media.width && media.height ? `${media.height}px` : 'clamp(18rem, 52dvh, 40rem)'

  return {
    '--aspect-ratio': String(aspectRatio),
    '--media-min-block-size': intrinsicHeight,
  }
}

export function buildActiveMediaElementStyle(
  media: PostDetailMediaLike | null | undefined
): Record<string, string> {
  return {
    aspectRatio: String(resolveMediaAspectRatio(media)),
  }
}

export function isMediaPending(
  post: PostDetailLike | null | undefined,
  detailFetched: boolean
): boolean {
  if (!post || detailFetched) return false

  const hasFiles = Boolean(post.media_files && post.media_files.length > 0)
  if (hasFiles) return false

  return (post.media_count ?? 0) > 0
}

export function shouldShowThumbnailRail(
  post: PostDetailLike | null | undefined,
  detailFetched: boolean
): boolean {
  const mediaCount = post?.media_files?.length ?? 0
  if (mediaCount > 1) return true
  return Boolean(post && !detailFetched && (post.media_count ?? 0) > 1)
}

export function getThumbnailPlaceholderCount(mediaCount?: number | null): number {
  return Math.min(Math.max(mediaCount ?? 0, 2), 6)
}

export function resolveActiveImageSource(
  media: PostDetailMediaLike | null | undefined,
  resolver: Pick<PostDetailMediaUrlResolver, 'getMediaThumbnailUrl'>
): string {
  if (!media?.id || media.file_type !== 'image') return ''
  return resolver.getMediaThumbnailUrl(media.id, 'large')
}

export function resolveActiveImageSrcset(
  media: PostDetailMediaLike | null | undefined,
  resolver: Pick<PostDetailMediaUrlResolver, 'getMediaThumbnailSrcset'>
): string | null {
  if (!media?.id || media.file_type !== 'image') return null
  return resolver.getMediaThumbnailSrcset(media.id)
}

export function resolveFallbackMediaSource(
  post: PostDetailLike | null | undefined,
  resolver: Pick<PostDetailMediaUrlResolver, 'resolveThumbnailSrc'>
): string {
  return resolver.resolveThumbnailSrc(post?.thumbnail_url ?? null, 'large') || ''
}

export function resolveFallbackMediaSrcset(
  post: PostDetailLike | null | undefined,
  resolver: Pick<PostDetailMediaUrlResolver, 'resolveThumbnailSrcset'>
): string | null {
  return resolver.resolveThumbnailSrcset(post?.thumbnail_url ?? null)
}

export function resolvePostDetailMediaHintSource(
  post: PostDetailLike | null | undefined,
  resolver: PostDetailMediaHintSourceResolver
): string | null {
  const primaryImage = post?.media_files?.find((media) => media.file_type === 'image' && media.id)
  if (primaryImage?.id) return resolver.getMediaThumbnailUrl(primaryImage.id, 'large')

  return resolver.resolveThumbnailSrc(post?.thumbnail_url ?? null, 'large') || null
}

export function resolvePlaceholderSource({
  activeMedia,
  activeMediaIndex,
  cachedThumbnailUrl,
  preloadedImages,
  getMediaThumbnailUrl,
}: {
  activeMedia: PostDetailMediaLike | null | undefined
  activeMediaIndex: number
  cachedThumbnailUrl: string | null
  preloadedImages: ReadonlySet<string>
  getMediaThumbnailUrl: (mediaId: string, size: string) => string
}): string | null {
  if (!activeMedia?.id) return cachedThumbnailUrl

  const thumbUrl = getMediaThumbnailUrl(activeMedia.id, 'medium')
  if (preloadedImages.has(thumbUrl)) return thumbUrl
  if (activeMediaIndex === 0 && cachedThumbnailUrl) return cachedThumbnailUrl
  return thumbUrl
}

export function getAdjacentMediaPreloadIndexes(
  mediaCount: number,
  activeMediaIndex: number
): number[] {
  if (mediaCount <= 1) return []
  return [(activeMediaIndex + 1) % mediaCount, (activeMediaIndex - 1 + mediaCount) % mediaCount]
}

export function resolveAdjacentImagePreloadTargets({
  mediaFiles,
  activeMediaIndex,
  preloadedImages,
  getMediaThumbnailUrl,
}: {
  mediaFiles: readonly PostDetailMediaLike[] | null | undefined
  activeMediaIndex: number
  preloadedImages: ReadonlySet<string>
  getMediaThumbnailUrl: (mediaId: string, size: string) => string
}): PostDetailAdjacentMediaPreloadTarget[] {
  if (!mediaFiles || mediaFiles.length <= 1) return []

  return getAdjacentMediaPreloadIndexes(mediaFiles.length, activeMediaIndex).flatMap((idx) => {
    const media = mediaFiles[idx]
    if (!media?.id || media.file_type !== 'image') return []

    const thumbnailUrl = getMediaThumbnailUrl(media.id, 'medium')
    return [
      {
        mediaId: media.id,
        thumbnailUrl,
        fullSizeUrl: getMediaThumbnailUrl(media.id, 'large'),
        shouldPreloadThumbnail: !preloadedImages.has(thumbnailUrl),
      },
    ]
  })
}
