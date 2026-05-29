import { describe, expect, it, beforeEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { syncClientDocumentHead } from '@/router/clientHead'

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

  it('does not mutate head tags for routes outside the client head whitelist', () => {
    syncClientDocumentHead(makeRoute('/posts/123', 'hmr-post-detail'))

    expect(document.title).toBe('Before')
    expect(findNamedMeta('description')).toBeNull()
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')).toBeNull()
  })
})
