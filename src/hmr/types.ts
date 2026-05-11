import type { RouteRecordName } from 'vue-router'

export type HmrPublicPageKey =
  | 'home'
  | 'explore'
  | 'community'
  | 'schedule'
  | 'settings'
  | 'login'
  | 'register'
  | 'auth-callback'
  | 'passkey-recovery'
  | 'profile'
  | 'about'
  | 'contact'
  | 'join'
  | 'thanks'
  | 'post'
  | 'not-found'

export interface HmrNavItem {
  key: HmrPublicPageKey
  label: string
  to: string
  icon: 'home' | 'explore' | 'community' | 'schedule' | 'settings'
}

export interface HmrShellRouteMeta {
  pageKey: HmrPublicPageKey
  navKey?: HmrNavItem['key']
  isPanel?: boolean
  title?: string
}

export interface HmrAuthDisplayState {
  isAuthenticated: boolean
  displayName: string
  identity: string
  avatarUrl?: string
}

export type HmrAuthIntent = 'login' | 'register'

export type HmrPasskeyRecoveryStage =
  | 'idle'
  | 'started'
  | 'verifying'
  | 'cooldown'
  | 'ready'
  | 'complete'
  | 'blocked'

export interface HmrPasskeyRecoveryStatus {
  id: string
  status: HmrPasskeyRecoveryStage
  approvalStatus?: string
  cooldownUntil?: string
  expiresAt?: string
  canRegister: boolean
  message?: string
}

export interface HmrScheduleItem {
  id: string
  title: string
  phase: string
  time: string
  description: string
}

export interface HmrFaqItem {
  id: string
  question: string
  answer: string
}

export interface HmrFooterCta {
  title: string
  body: string
  primaryLabel: string
  primaryTo: string
  secondaryLabel: string
  secondaryTo: string
}

export interface HmrCursorCollection<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface HmrTrendSummary {
  title: string
  metric: string
  body: string
}

export interface HmrSecuritySummary {
  passkeys: number
  sessions: number
  devices: number
  twoFactorEnabled: boolean
  updatedAt: string
}

export interface HmrInboxSummary {
  unreadCount: number
  latestLabel: string
}

export type HmrPageState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export type HmrDataSource = 'api' | 'local'

export type HmrWarmRouteKey = 'home' | 'explore' | 'community' | 'schedule' | 'post'

export type HmrCacheTtlPreset = 'short' | 'medium' | 'long'

export interface HmrCachedSnapshot<T> {
  value: T
  expiresAt: number
  writtenAt: number
}

export type HmrScheduleViewMode = 'day' | 'week' | 'month'

export interface HmrResponsiveMediaSource {
  src: string
  srcset?: string
  sizes?: string
}

export type HmrApiErrorKind =
  | 'unauthorized'
  | 'restricted'
  | 'refresh-needed'
  | 'not-found'
  | 'rate-limited'
  | 'server'
  | 'network'
  | 'unknown'

export interface HmrApiErrorState {
  kind: HmrApiErrorKind
  message: string
  path?: string
  status?: number
  code?: string
}

export interface HmrRetryAction {
  label: string
  run: () => Promise<void>
}

export interface HmrAsyncResource<T> {
  state: HmrPageState
  data: T
  source: HmrDataSource
  error: HmrApiErrorState | null
  paths?: string[]
  updatedAt: string | null
  retry?: HmrRetryAction
}

export type HmrContactSubmissionState = 'idle' | 'submitting' | 'sent' | 'error'

export interface HmrDiscussionItem {
  id: string
  title: string
  excerpt: string
  metric: string
  to?: string
}

export interface HmrPostDetail {
  id: string
  title: string
  excerpt: string
  authorName: string
  createdAt: string
  platform?: string
}

export interface HmrProfileOverview {
  id: string
  displayName: string
  email?: string
  bio: string
}

export interface HmrSettingsSection {
  id: string
  title: string
  body: string
  actionTo?: string
}

export interface HmrRouteRecordMeta {
  routeName?: RouteRecordName | null
  pageKey: HmrPublicPageKey
  navKey?: HmrNavItem['key']
}
