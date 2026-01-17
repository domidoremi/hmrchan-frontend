/**
 * API Services Export
 */

export {
  apiClient,
  ApiError,
  type RequestConfig,
  type ApiResponse,
  type PaginatedApiResponse,
} from './client'
export {
  authService,
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
  type UserResponse,
} from './authService'
export { postService, type PostListItem, type PostDetailResponse, type ThumbnailQuality } from './postService'
export { authorService, type AuthorListItem, type AuthorResponse } from './authorService'
export {
  favoriteService,
  type FavoriteCheckResponse,
  type FavoriteResponse,
  type FavoriteFolder,
  type FavoriteTagStats,
  type ListFavoritesParams,
} from './favoriteService'
export {
  commentService,
  type Comment,
  type CommentImage,
  type CommentImageUploadResponse,
  type CreateCommentRequest,
  type CommentListResponse,
  COMMENT_IMAGE_LIMITS,
} from './commentService'
export {
  userService,
  normalizeAvatarUrl,
  type UserProfile,
  type UpdateProfileRequest,
  type ChangePasswordRequest,
  type AvatarUploadResponse,
  USERNAME_LIMITS,
  PROFILE_LIMITS,
} from './userService'
export {
  communityService,
  type DiscussionItem,
  type HotTopicItem,
  type CommunityStats,
  type TimeRange,
} from './communityService'
export {
  notificationService,
  type Notification,
  type NotificationType,
  type UnreadCountResponse,
} from './notificationService'
export {
  searchService,
  type SearchSuggestion,
  type SearchPostsParams,
  type SearchAuthorsParams,
} from './searchService'
export {
  userRelationsService,
  type UserRelation,
  type UserListItem,
  type UserPublicProfile,
} from './userRelationsService'
export {
  historyService,
  type SearchHistoryItem,
  type SearchHistoryType,
  type BrowsingHistoryItem,
  type HistoryStats,
} from './historyService'
export {
  discussionService,
  type Discussion,
  type DiscussionComment,
  type DiscussionAuthor,
  type PostReference,
  type CreateDiscussionRequest,
  type CreateCommentRequest as CreateDiscussionCommentRequest,
  type ListDiscussionsParams,
} from './discussionService'
export {
  sessionService,
  type Session,
  type SessionListResponse,
} from './sessionService'
