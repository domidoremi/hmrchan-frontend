import { describe, expect, it, beforeEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { syncClientDocumentHead } from '@/router/clientHead'
import { appRoutes } from '@/router/routes'

function makeRoute(path: string, name: string): RouteLocationNormalized {
  return {
    fullPath: path,
    hash: '',
    matched: [],
    meta: {},
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
    .replace('/community/discussions/:id', '/community/discussions/123')
    .replace('/posts/:id', '/posts/123')
    .replace('/:pathMatch(.*)*', '/__missing-route__')
}

function collectNamedShellRoutes(): Array<{ name: string; path: string }> {
  return appRoutes.flatMap((route) =>
    (route.children ?? [])
      .filter((child) => typeof child.name === 'string')
      .map((child) => ({
        name: String(child.name),
        path: resolveRepresentativeRoutePath(child.path),
      }))
  )
}

describe('syncClientDocumentHead', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.title = 'Before'
  })

  it('syncs title, meta tags, and canonical link for public shell routes', () => {
    syncClientDocumentHead(makeRoute('/explore', 'hmr-explore'))

    expect(document.title).toBe('Explore · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('探索最新公开内容')
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findNamedMeta('twitter:url')?.content).toBe('http://localhost:3000/explore')
    expect(findPropertyMeta('og:url')?.content).toBe('http://localhost:3000/explore')
    expect(findPropertyMeta('og:image')?.content).toBe(
      'http://localhost:3000/icons/sitting-512.webp'
    )
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'http://localhost:3000/explore'
    )
  })

  it('syncs noindex head tags for protected profile shell routes', () => {
    syncClientDocumentHead(makeRoute('/profile/security', 'hmr-profile-section'))

    expect(document.title).toBe('Profile · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('查看 MomiChan 个人资料')
    expect(findNamedMeta('robots')?.content).toBe('noindex, nofollow')
    expect(findNamedMeta('twitter:url')?.content).toBe('http://localhost:3000/profile/security')
    expect(findPropertyMeta('og:url')?.content).toBe('http://localhost:3000/profile/security')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'http://localhost:3000/profile/security'
    )
  })

  it('syncs article head tags for post detail shell routes', () => {
    syncClientDocumentHead(makeRoute('/posts/123', 'hmr-post-detail'))

    expect(document.title).toBe('Post detail · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('浏览 MomiChan 公开帖子详情')
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findNamedMeta('twitter:url')?.content).toBe('http://localhost:3000/posts/123')
    expect(findPropertyMeta('og:type')?.content).toBe('article')
    expect(findPropertyMeta('og:url')?.content).toBe('http://localhost:3000/posts/123')
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'http://localhost:3000/posts/123'
    )
  })

  it('syncs article head tags for discussion detail shell routes', () => {
    syncClientDocumentHead(makeRoute('/community/discussions/123', 'hmr-discussion-detail'))

    expect(document.title).toBe('Discussion detail · MomiChan')
    expect(findNamedMeta('description')?.content).toContain('浏览 MomiChan 公开讨论详情')
    expect(findNamedMeta('robots')?.content).toBe('index, follow')
    expect(findNamedMeta('twitter:url')?.content).toBe(
      'http://localhost:3000/community/discussions/123'
    )
    expect(findPropertyMeta('og:type')?.content).toBe('article')
    expect(findPropertyMeta('og:url')?.content).toBe(
      'http://localhost:3000/community/discussions/123'
    )
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'http://localhost:3000/community/discussions/123'
    )
  })

  it('syncs head tags for every named routed shell page', () => {
    const namedRoutes = collectNamedShellRoutes()

    expect(namedRoutes.map((route) => route.name)).toEqual([
      'hmr-home',
      'hmr-explore',
      'hmr-community',
      'hmr-discussion-detail',
      'hmr-schedule',
      'hmr-settings',
      'hmr-login',
      'hmr-register',
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

      syncClientDocumentHead(makeRoute(route.path, route.name))

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
        new URL(route.path, window.location.origin).toString()
      )
    }
  })

  it('does not mutate head tags for routes outside the client head whitelist', () => {
    syncClientDocumentHead(makeRoute('/draft-preview', 'hmr-draft-preview'))

    expect(document.title).toBe('Before')
    expect(findNamedMeta('description')).toBeNull()
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')).toBeNull()
  })
})
