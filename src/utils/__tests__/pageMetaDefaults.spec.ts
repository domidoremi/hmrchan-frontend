import { describe, expect, it } from 'vitest'

import { resolveHtmlDocument } from '@/edge/htmlDocument'

import { resolvePageMetaDefaults } from '../pageMetaDefaults'

const ROUTE_MATRIX = [
  '/',
  '/explore',
  '/authors',
  '/search?q=metadata',
  '/community',
  '/schedule',
  '/schedule/01900000-0000-7000-8000-000000000001',
  '/about',
  '/community/discussions/01900000-0000-7000-8000-000000000002',
  '/discussion/01900000-0000-7000-8000-000000000002',
  '/contact',
  '/login',
  '/auth/callback',
  '/favorites',
  '/profile',
  '/profile/comment-favorites',
  '/profile/security-activity',
  '/settings/profile',
  '/users/01900000-0000-7000-8000-000000000001',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/passkeys/recovery',
  '/auth/passkeys/recovery/01900000-0000-7000-8000-000000000001',
  '/post/01900000-0000-7000-8000-000000000001',
  '/post/00000000-0000-4000-8000-000000000000',
  '/post/01ARZ3NDEKTSV4RRFFQ69G5FAV',
  '/post/not-a-real-id',
  '/author/01900000-0000-7000-8000-000000000003',
  '/author/momichan',
  '/community/discussions/topic-1',
  '/users/user-1',
  '/auth/passkeys/recovery/recovery-1',
  '/profile/not-a-route',
  '/missing-page/',
] as const

describe('pageMetaDefaults edge contract', () => {
  it.each(ROUTE_MATRIX)('matches edge SEO defaults for %s', (path) => {
    const url = new URL(path, 'https://momichan.com')
    const edgeConfig = resolveHtmlDocument(url)
    const clientConfig = resolvePageMetaDefaults(url)

    expect(clientConfig).toEqual({
      status: edgeConfig.status,
      title: edgeConfig.title,
      description: edgeConfig.description,
      canonicalPath: edgeConfig.canonicalPath,
      robots: edgeConfig.robots,
      ogType: edgeConfig.ogType,
      ogImage: edgeConfig.ogImage,
      structuredData: edgeConfig.structuredData,
    })
  })
})
