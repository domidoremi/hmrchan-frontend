import { describe, expect, it } from 'vitest'

import {
  SITEMAP_COLLECTION_SOURCES,
  STATIC_SITEMAP_ENTRIES,
  createSitemapDetailEntries,
  mergeSitemapEntries,
  renderSitemap,
} from '@/edge/sitemap'

describe('sitemap document', () => {
  const postId = '01900000-0000-7000-8000-000000000001'
  const discussionId = '01900000-0000-7000-8000-000000000002'

  it('renders only real canonical URLs without false hreflang variants', () => {
    const sitemap = renderSitemap(STATIC_SITEMAP_ENTRIES)

    expect(sitemap).toContain('<loc>https://momichan.com/</loc>')
    expect(sitemap).toContain('<loc>https://momichan.com/search</loc>')
    expect(sitemap).not.toContain('hreflang=')
    expect(sitemap).not.toContain('xmlns:xhtml')
    expect(sitemap).not.toContain('<lastmod>')
  })

  it('maps public collection items to canonical detail contracts', () => {
    const posts = SITEMAP_COLLECTION_SOURCES.find((source) => source.name === 'posts')
    const discussions = SITEMAP_COLLECTION_SOURCES.find((source) => source.name === 'discussions')
    expect(posts).toBeDefined()
    expect(discussions).toBeDefined()

    const detailEntries = [
      ...createSitemapDetailEntries(posts!, [
        { id: postId, updated_at: '2026-07-25T10:00:00Z' },
        { id: 'post-1', updated_at: '2026-07-25T10:00:00Z' },
        { id: '', updated_at: '2026-07-25T10:00:00Z' },
      ]),
      ...createSitemapDetailEntries(discussions!, [
        { id: discussionId, last_activity_at: '2026-07-26T02:00:00Z' },
      ]),
    ]
    const sitemap = renderSitemap(mergeSitemapEntries(STATIC_SITEMAP_ENTRIES, detailEntries))

    expect(sitemap).toContain(`<loc>https://momichan.com/post/${postId}</loc>`)
    expect(sitemap).toContain(
      `<loc>https://momichan.com/community/discussions/${discussionId}</loc>`
    )
    expect(sitemap).not.toContain('/post/post-1')
    expect(sitemap).toContain('<lastmod>2026-07-25</lastmod>')
    expect(sitemap.match(/<url>/g)).toHaveLength(STATIC_SITEMAP_ENTRIES.length + 2)
  })
})
