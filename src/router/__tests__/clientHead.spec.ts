import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { syncClientDocumentHead } from '@/router/clientHead'
import { appRoutes } from '@/router/routes'

function makeRoute(
  path: string,
  name: string,
  meta: RouteLocationNormalized['meta'] = {}
): RouteLocationNormalized {
  return {
    fullPath: path,
    hash: '',
    matched: [],
    meta,
    name,
    params: {},
    path,
    query: {},
    redirectedFrom: undefined,
  }
}

function findNamedMeta(name: string): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
}

function findPropertyMeta(property: string): HTMLMetaElement | null {
  return document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
}

function resolveRepresentativeRoutePath(path: string): string {
  if (!path) return '/'
  return `/${path}`
    .replace('/profile/:section', '/profile/security')
    .replace('/author/:id', '/author/018f5f3a-01a2-7c3d-8e4f-0123456789ad')
    .replace('/schedule/:id', '/schedule/018f5f3a-01a2-7c3d-8e4f-0123456789ae')
    .replace('/community/discussions/:id', '/community/discussions/123')
    .replace('/posts/:id', '/posts/123')
    .replace('/:pathMatch(.*)*', '/__missing-route__')
}

function collectNamedShellRoutes(): Array<{
  name: string
  path: string
  meta: RouteLocationNormalized['meta']
}> {
  return appRoutes.flatMap((route) =>
    (route.children ?? [])
      .filter((child) => typeof child.name === 'string')
      .map((child) => ({
        name: String(child.name),
        path: resolveRepresentativeRoutePath(child.path),
        meta: child.meta ?? {},
      }))
  )
}

describe('syncClientDocumentHead', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.head.innerHTML = ''
    document.title = 'Before'
  })

  it('syncs title, meta tags, and canonical link for public shell routes', () => {
    syncClientDocumentHead(makeRoute('/explore', 'hmr-explore', { pageKey: 'explore' }))

    expect(document.title).toBe('Explore · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('探索最新公开内容')
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findNamedMeta('twitter:url')?.content).toBe('https://next.momichan.com/explore')
    expect(findPropertyMeta('og:url')?.content).toBe('https://next.momichan.com/explore')
    expect(findPropertyMeta('og:image')?.content).toBe(
      'https://next.momichan.com/icons/sitting-512.webp'
    )
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://next.momichan.com/explore'
    )
  })

  it('syncs noindex head tags for protected profile shell routes', () => {
    syncClientDocumentHead(
      makeRoute('/profile/security', 'hmr-profile-section', { pageKey: 'profile' })
    )

    expect(document.title).toBe('Profile · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('查看 MomiChan 个人资料')
    expect(findNamedMeta('robots')?.content).toBe('noindex, nofollow')
    expect(findNamedMeta('twitter:url')?.content).toBe('https://next.momichan.com/profile/security')
    expect(findPropertyMeta('og:url')?.content).toBe('https://next.momichan.com/profile/security')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://next.momichan.com/profile/security'
    )
  })

  it('syncs article head tags for post detail shell routes', () => {
    syncClientDocumentHead(makeRoute('/posts/123', 'hmr-post-detail', { pageKey: 'post' }))

    expect(document.title).toBe('Post detail · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('浏览 MomiChan 公开帖子详情')
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findNamedMeta('twitter:url')?.content).toBe('https://next.momichan.com/posts/123')
    expect(findPropertyMeta('og:type')?.content).toBe('article')
    expect(findPropertyMeta('og:url')?.content).toBe('https://next.momichan.com/posts/123')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://next.momichan.com/posts/123'
    )
  })

  it('syncs article head tags for discussion detail shell routes', () => {
    syncClientDocumentHead(
      makeRoute('/community/discussions/123', 'hmr-discussion-detail', { pageKey: 'community' })
    )

    expect(document.title).toBe('Discussion detail · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('浏览 MomiChan 公开讨论详情')
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findNamedMeta('twitter:url')?.content).toBe(
      'https://next.momichan.com/community/discussions/123'
    )
    expect(findPropertyMeta('og:type')?.content).toBe('article')
    expect(findPropertyMeta('og:url')?.content).toBe(
      'https://next.momichan.com/community/discussions/123'
    )
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://next.momichan.com/community/discussions/123'
    )
  })

  it('syncs head tags for every named routed shell page', () => {
    const namedRoutes = collectNamedShellRoutes()

    expect(namedRoutes.map((route) => route.name)).toEqual([
      'hmr-home',
      'hmr-explore',
      'hmr-author-detail',
      'hmr-community',
      'hmr-discussion-detail',
      'hmr-schedule',
      'hmr-schedule-detail',
      'hmr-settings',
      'hmr-login',
      'hmr-register',
      'hmr-forgot-password',
      'hmr-reset-password',
      'hmr-auth-callback',
      'hmr-passkey-recovery',
      'hmr-profile',
      'hmr-profile-section',
      'hmr-about',
      'hmr-contact',
      'hmr-join-us',
      'hmr-thank-you',
      'hmr-post-detail',
      'hmr-not-found',
    ])

    for (const route of namedRoutes) {
      document.head.innerHTML = ''
      document.title = 'Before'

      syncClientDocumentHead(makeRoute(route.path, route.name, route.meta))

      expect({ routeName: route.name, title: document.title }).not.toMatchObject({
        title: 'Before',
      })
      expect({
        routeName: route.name,
        description: findNamedMeta('description')?.content,
      }).toHaveProperty('description')
      expect({ routeName: route.name, robots: findNamedMeta('robots')?.content }).toMatchObject({
        robots: expect.stringMatching(/^(index|noindex), /),
      })
      expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
        new URL(route.path, 'https://next.momichan.com').toString()
      )
    }
  })

  it('does not mutate head tags for routes without managed page metadata', () => {
    syncClientDocumentHead(makeRoute('/draft-preview', 'hmr-draft-preview'))

    expect(document.title).toBe('Before')
    expect(findNamedMeta('description')).toBeNull()
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')).toBeNull()
  })

  it('does not request public author metadata for protected profile sections', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    syncClientDocumentHead(
      makeRoute('/profile/security', 'hmr-profile-section', { pageKey: 'profile' })
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(findNamedMeta('robots')?.content).toBe('noindex, nofollow')
  })

  it('upgrades author head metadata and structured data after client navigation', async () => {
    const authorId = '018f5f3a-01a2-7c3d-8e4f-0123456789ad'
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              avatar_url: 'https://cdn.example.test/creator.webp',
              bio: 'Creator biography for client-side metadata.',
              display_name: 'Client Creator',
              id: authorId,
              platform: 'youtube',
              username: 'client_creator',
            },
          }),
          { headers: { 'content-type': 'application/json' } }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    syncClientDocumentHead(
      makeRoute(`/author/${authorId}`, 'hmr-author-detail', { pageKey: 'explore' })
    )

    await vi.waitFor(() => {
      expect(document.title).toBe('Client Creator (@client_creator) · MomiChan')
    })
    expect(findNamedMeta('description')?.content).toContain(
      'Creator biography for client-side metadata.'
    )
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findPropertyMeta('og:image')?.content).toBe('https://cdn.example.test/creator.webp')
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000/api/v1/authors/${authorId}`,
      expect.any(Object)
    )
    expect(
      document.head.querySelector<HTMLScriptElement>(
        'script[data-prerender-structured-data="true"]'
      )?.textContent
    ).toContain('Client Creator')
  })

  it('upgrades schedule head metadata and structured data after client navigation', async () => {
    const scheduleId = '018f5f3a-01a2-7c3d-8e4f-0123456789ae'
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                category: 'live',
                description: 'A public schedule for client-side metadata.',
                id: scheduleId,
                start_date: '2026-07-26T12:00:00Z',
                title: 'Client Schedule',
              },
            }),
            { headers: { 'content-type': 'application/json' } }
          )
      )
    )

    syncClientDocumentHead(
      makeRoute(`/schedule/${scheduleId}`, 'hmr-schedule-detail', { pageKey: 'schedule' })
    )

    await vi.waitFor(() => {
      expect(document.title).toBe('Client Schedule · MomiChan')
    })
    expect(findNamedMeta('description')?.content).toContain(
      'A public schedule for client-side metadata.'
    )
    expect(findPropertyMeta('og:type')?.content).toBe('article')
    expect(
      document.head.querySelector<HTMLScriptElement>(
        'script[data-prerender-structured-data="true"]'
      )?.textContent
    ).toContain('Client Schedule')
  })
})
