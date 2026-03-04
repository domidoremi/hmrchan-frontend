/**
 * API Services Export
 */

export {
  apiClient,
  ApiError,
  API_AUTH_URL,
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
  type SendVerificationEmailRequest,
  type VerifyEmailRequest,
  type RequestPasswordResetRequest,
  type ResetPasswordRequest,
  type ChangeEmailRequest,
  type SendEmailCodeRequest,
  type VerifyEmailCodeRequest,
  type VerifyEmailCodeResponse,
  type SendRegistrationCodeRequest,
  type SendRegistrationCodeResponse,
} from './authService'
export {
  postService,
  type PostListItem,
  type PostDetailResponse,
  type PostAuthorResponse,
  type AuthorOtherPost,
  type ThumbnailQuality,
} from './postService'
export { postsLightService, type PostsLightParams, type PostLightItem } from './postsLightService'
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
  type CommentThreadResponse,
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
  type NotificationListResponse,
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
  type SearchHistoryListResponse,
  type BrowsingContentType,
  type BrowsingHistoryItem,
  type BrowsingHistoryListResponse,
  type HistoryStats,
  type MyCommentHistoryItem,
  type MyLikeHistoryItem,
  type MyCommentFavoriteItem,
} from './historyService'
export {
  discussionService,
  type Discussion,
  type DiscussionComment,
  type DiscussionAuthor,
  type DiscussionCommentThreadResponse,
  type PostReference,
  type CreateDiscussionRequest,
  type CreateCommentRequest as CreateDiscussionCommentRequest,
  type ListDiscussionsParams,
} from './discussionService'
export { deviceService, type Device, type DeviceListResponse } from './deviceService'
export { mediaService, type MediaFileListItem, type MediaFileResponse } from './mediaService'
export {
  twoFactorService,
  type TwoFactorSetupResponse,
  type TwoFactorStatusResponse,
  type TwoFactorVerifyRequest,
  type TwoFactorDisableRequest,
  type BackupCodesResponse,
  type TwoFactorVerifyResponse,
} from './twoFactorService'
export { preferencesService, type UserPreferences } from './preferencesService'
export {
  contactService,
  type ContactMessageRequest,
  type ContactMessageResponse,
} from './contactService'
export {
  scheduleService,
  type ScheduleResponse,
  type ScheduleCalendarItem,
  type ScheduleCategory,
  type ListSchedulesParams,
  type ScheduleCreateRequest,
} from './scheduleService'
export { memberService, type MemberProfile } from './memberService'
export { systemService, type HealthResponse } from './systemService'
export {
  reportService,
  type CreateReportRequest,
  type ReportItem,
  type ReportTargetType,
} from './reportService'
export { feedbackService, type FeedbackRequest, type FeedbackResponse } from './feedbackService'
export {
  auditService,
  type AuditActivityItem,
  type AuditActivityResponse,
  type SecuritySummary,
  type SecurityEvent,
  type MyActivityParams,
} from './auditService'
export {
  adminService,
  type DetailedHealth,
  type DbHealth,
  type SystemStats,
  type CacheStats,
  type AdminUserListParams,
  type AdminUser,
  type AdminUserStats,
  type AdminRole,
  type CreateRoleRequest,
  type UpdateRoleRequest,
  type Permission,
  type CrawlerStatus,
  type CrawlerPlatformStatus,
  type CrawlerConfig,
  type ProcessorStats,
  type ProcessorTask,
  type WatcherStatus,
  type AdminReport,
  type ReportStatsSummary,
  type ReviewReportRequest,
  type SecurityEventItem,
  type SecurityEventsResponse,
  type FailedLoginIpItem,
  type AdminFeedback,
} from './adminService'
