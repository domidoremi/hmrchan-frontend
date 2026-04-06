import { pickSummaryCount } from './summaryUtils'

type NullableCount = number | null

function normalizeCount(
  payload: unknown,
  candidatePaths: ReadonlyArray<readonly string[]>
): NullableCount {
  return pickSummaryCount(payload, candidatePaths)
}

export function normalizeFavoritesSummaryCount(payload: unknown): NullableCount {
  return normalizeCount(payload, [
    ['favorites_count'],
    ['total_favorites'],
    ['total'],
    ['count'],
    ['data', 'favorites_count'],
    ['data', 'total_favorites'],
    ['data', 'total'],
    ['data', 'count'],
    ['summary', 'favorites_count'],
    ['summary', 'total'],
  ])
}

export function normalizeReportsSummaryCount(payload: unknown): NullableCount {
  return normalizeCount(payload, [
    ['reports_count'],
    ['total_reports'],
    ['total'],
    ['count'],
    ['data', 'reports_count'],
    ['data', 'total_reports'],
    ['data', 'total'],
    ['data', 'count'],
    ['summary', 'reports_count'],
    ['summary', 'total'],
  ])
}

export function normalizeDiscussionsSummaryCount(payload: unknown): NullableCount {
  return normalizeCount(payload, [
    ['discussions_count'],
    ['discussion_count'],
    ['my_discussions_count'],
    ['total'],
    ['count'],
    ['data', 'discussions_count'],
    ['data', 'discussion_count'],
    ['data', 'my_discussions_count'],
    ['data', 'total'],
    ['data', 'count'],
    ['summary', 'discussions_count'],
    ['summary', 'total'],
  ])
}

export function normalizeCommunitySummaryCount(payload: unknown): NullableCount {
  return normalizeCount(payload, [
    ['discussions_count'],
    ['discussion_count'],
    ['total_comments'],
    ['comments_count'],
    ['count'],
    ['data', 'discussions_count'],
    ['data', 'discussion_count'],
    ['data', 'total_comments'],
    ['data', 'comments_count'],
    ['data', 'count'],
    ['summary', 'discussions_count'],
    ['summary', 'total_comments'],
  ])
}

export function normalizeRelationsSummaryCounts(payload: unknown): {
  followers: NullableCount
  following: NullableCount
  blocked: NullableCount
} {
  return {
    followers: normalizeCount(payload, [
      ['followers_count'],
      ['total_followers'],
      ['data', 'followers_count'],
      ['data', 'total_followers'],
      ['summary', 'followers_count'],
    ]),
    following: normalizeCount(payload, [
      ['following_count'],
      ['total_following'],
      ['data', 'following_count'],
      ['data', 'total_following'],
      ['summary', 'following_count'],
    ]),
    blocked: normalizeCount(payload, [
      ['blocked_count'],
      ['total_blocked'],
      ['data', 'blocked_count'],
      ['data', 'total_blocked'],
      ['summary', 'blocked_count'],
    ]),
  }
}

export function normalizeHistorySummaryCounts(payload: unknown): {
  history: NullableCount
  comments: NullableCount
  likes: NullableCount
  commentFavorites: NullableCount
} {
  return {
    history: normalizeCount(payload, [
      ['browsing_history_count'],
      ['history_count'],
      ['browsing_count'],
      ['data', 'browsing_history_count'],
      ['data', 'history_count'],
      ['data', 'browsing_count'],
      ['summary', 'browsing_history_count'],
    ]),
    comments: normalizeCount(payload, [
      ['comments_count'],
      ['my_comments_count'],
      ['data', 'comments_count'],
      ['data', 'my_comments_count'],
      ['summary', 'comments_count'],
    ]),
    likes: normalizeCount(payload, [
      ['likes_count'],
      ['my_likes_count'],
      ['data', 'likes_count'],
      ['data', 'my_likes_count'],
      ['summary', 'likes_count'],
    ]),
    commentFavorites: normalizeCount(payload, [
      ['comment_favorites_count'],
      ['my_comment_favorites_count'],
      ['favorites_count'],
      ['data', 'comment_favorites_count'],
      ['data', 'my_comment_favorites_count'],
      ['summary', 'comment_favorites_count'],
    ]),
  }
}
