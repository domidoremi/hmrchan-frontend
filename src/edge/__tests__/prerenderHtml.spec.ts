import { describe, expect, it } from 'vitest'
import { createPrerenderedHtml } from '@/edge/prerenderHtml'

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
  it('rewrites public route metadata and shell markup', () => {
    const html = createPrerenderedHtml(template, '/explore')

    expect(html).toContain('<title>Explore · MomiChan</title>')
    expect(html).toContain(
      'name="description" content="探索最新公开内容、筛选不同平台内容并继续浏览更多创作者动态。"'
    )
    expect(html).toContain('rel="canonical" href="https://momichan.xyz/explore"')
    expect(html).toContain('property="og:url" content="https://momichan.xyz/explore"')
    expect(html).toContain('data-prerender-shell="true"')
    expect(html).toContain('Browse the latest public posts')
    expect(html).toContain('data-prerender-structured-data="true"')
    expect(html).toContain('"@type":"CollectionPage"')
  })

  it('rewrites 404 documents as noindex shells', () => {
    const html = createPrerenderedHtml(template, '/404')

    expect(html).toContain('<title>Page not found · MomiChan</title>')
    expect(html).toContain('name="robots" content="noindex, nofollow"')
    expect(html).toContain('Page not found')
    expect(html).not.toContain('application/json" data-prerender-structured-data="true"')
  })
})
