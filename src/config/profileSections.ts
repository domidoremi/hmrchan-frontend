import type { Component } from 'vue'
import {
  Bell,
  Bookmark,
  Clock3,
  Flag,
  Heart,
  MessageSquare,
  Settings,
  Shield,
  ThumbsUp,
  UserMinus,
  UserPlus,
  Users,
} from '@lucide/vue'

export type ProfileSectionId =
  | 'favorites'
  | 'comments'
  | 'likes'
  | 'comment-favorites'
  | 'history'
  | 'reports'
  | 'followers'
  | 'following'
  | 'blocked'
  | 'security'
  | 'settings'
  | 'notifications'

export type ProfileSectionGroup = 'content' | 'activity' | 'network' | 'account'

export interface ProfileSectionDefinition {
  id: ProfileSectionId
  route: string
  labelKey: string
  hintKey?: string
  group: ProfileSectionGroup
  icon: Component
  countKey?: string
}

export const profileSections: ProfileSectionDefinition[] = [
  {
    id: 'favorites',
    route: '/profile/favorites',
    labelKey: 'profile.tabs.favorites',
    hintKey: 'favorites.organizeHint',
    group: 'content',
    icon: Heart,
    countKey: 'favorites',
  },
  {
    id: 'comments',
    route: '/profile/comments',
    labelKey: 'profile.tabs.comments',
    group: 'activity',
    icon: MessageSquare,
    countKey: 'comments',
  },
  {
    id: 'likes',
    route: '/profile/likes',
    labelKey: 'profile.tabs.likes',
    group: 'activity',
    icon: ThumbsUp,
    countKey: 'likes',
  },
  {
    id: 'comment-favorites',
    route: '/profile/comment-favorites',
    labelKey: 'profile.tabs.commentFavorites',
    group: 'content',
    icon: Bookmark,
    countKey: 'comment_favorites',
  },
  {
    id: 'history',
    route: '/profile/history',
    labelKey: 'profile.tabs.history',
    group: 'content',
    icon: Clock3,
    countKey: 'browsing_history',
  },
  {
    id: 'reports',
    route: '/profile/reports',
    labelKey: 'profile.tabs.reports',
    group: 'activity',
    icon: Flag,
    countKey: 'reports',
  },
  {
    id: 'security',
    route: '/profile/security',
    labelKey: 'profile.securityHubTitle',
    hintKey: 'profile.securityHubHint',
    group: 'account',
    icon: Shield,
  },
  {
    id: 'followers',
    route: '/profile/followers',
    labelKey: 'profile.tabs.followers',
    group: 'network',
    icon: Users,
    countKey: 'followers',
  },
  {
    id: 'following',
    route: '/profile/following',
    labelKey: 'profile.tabs.following',
    group: 'network',
    icon: UserPlus,
    countKey: 'following',
  },
  {
    id: 'blocked',
    route: '/profile/blocked',
    labelKey: 'profile.tabs.blocked',
    group: 'network',
    icon: UserMinus,
    countKey: 'blocked',
  },
  {
    id: 'settings',
    route: '/profile/settings',
    labelKey: 'nav.profileSettings',
    group: 'account',
    icon: Settings,
  },
  {
    id: 'notifications',
    route: '/profile/notifications',
    labelKey: 'profile.tabs.notifications',
    group: 'account',
    icon: Bell,
    countKey: 'notifications',
  },
]

export const profileSectionMap = Object.fromEntries(
  profileSections.map((section) => [section.id, section])
) as Record<ProfileSectionId, ProfileSectionDefinition>
