import { describe, expect, it } from 'vitest'
import { applyPrerenderDocument, createPrerenderedHtml } from '@/edge/prerenderHtml'

const template = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="base description" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://momichan.xyz/" />
    <script type="application/json" data-prerender-structured-data="true"></script>
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://momichan.xyz/" />
    <meta property="og:title" content="Base title" />
    <meta property="og:description" content="Base description" />
    <meta property="og:image" content="https://momichan.xyz/icons/sitting-512.webp" />
    <meta name="twitter:title" content="Base title" />
    <meta name="twitter:description" content="Base description" />
    <meta name="twitter:url" content="https://momichan.xyz/" />
    <meta name="twitter:image" content="https://momichan.xyz/icons/sitting-512.webp" />
    <title>Base title</title>
  </head>
  <body>
    <div id="app-root"></div>
  </body>
</html>`

describe('createPrerenderedHtml', () => {
  it('rewrites the homepage using the dedicated home prerender shell', () => {
    const html = createPrerenderedHtml(template, '/')

    expect(html).toContain('<title>Home · MomiChan</title>')
    expect(html).toContain('data-prerender-shell-variant="home"')
    expect(html).toContain('data-prerender-shell-content="true"')
    expect(html).toContain('Start here')
    expect(html).toContain('Find today’s standout posts, creators, and conversations')
    expect(html).not.toContain('Quick bridge')
  })

  it('rewrites public route metadata and shell markup', () => {
    const html = createPrerenderedHtml(template, '/explore')

    expect(html).toContain('<title>Explore · MomiChan</title>')
    expect(html).toContain(
      'name="description" content="探索最新公开内容、筛选不同平台内容并继续浏览更多创作者动态。"'
    )
    expect(html).toContain('rel="canonical" href="https://momichan.xyz/explore"')
    expect(html).toContain('property="og:url" content="https://momichan.xyz/explore"')
    expect(html).toContain('data-prerender-shell="true"')
    expect(html).toContain('Browse fresh posts, tags, and creator updates')
    expect(html).toContain('data-prerender-structured-data="true"')
    expect(html).toContain('"@type":"CollectionPage"')
    expect(html).not.toContain('Rendering mode')
  })

  it('rewrites 404 documents as noindex shells', () => {
    const html = createPrerenderedHtml(template, '/404')

    expect(html).toContain('<title>Page not found · MomiChan</title>')
    expect(html).toContain('name="robots" content="noindex, nofollow"')
    expect(html).toContain('Page not found')
    expect(html).not.toContain('application/json" data-prerender-structured-data="true"')
  })

  it('injects image preload hints for prerendered detail routes', () => {
    const html = applyPrerenderDocument(template, {
      status: 200,
      title: 'Post detail · MomiChan',
      description: 'detail description',
      canonicalPath: '/post/post-1',
      ogType: 'article',
      ogImage: 'https://cdn.example.com/post-1.jpg',
      robots: 'index, follow',
      shellTitle: 'Post detail',
      shellBody: 'detail body',
      shellEyebrow: 'Post',
      shellSummary: [],
      shellStats: [],
      shellLinks: [],
      structuredData: [],
      shellVariant: 'default',
      preloadImages: [
        {
          href: '/api/v1/media/media-1/thumbnail?size=large&format=webp',
          srcset:
            '/api/v1/media/media-1/thumbnail?size=small&format=webp 200w, /api/v1/media/media-1/thumbnail?size=medium&format=webp 400w, /api/v1/media/media-1/thumbnail?size=large&format=webp 800w',
          sizes: '100vw',
          fetchPriority: 'high',
        },
      ],
    })

    expect(html).toContain('data-prerender-preload-image="true"')
    expect(html).toContain('href="/api/v1/media/media-1/thumbnail?size=large&amp;format=webp"')
    expect(html).toContain('imagesizes="100vw"')
    expect(html).toContain('fetchpriority="high"')
  })
})
