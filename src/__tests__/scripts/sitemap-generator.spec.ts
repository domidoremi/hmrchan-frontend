import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

describe('sitemap generator', () => {
  it('reproduces checked-in sitemap and robots assets without timestamp churn', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'hmr-sitemap-generator-'))
    const sitemapOutput = join(outputDir, 'sitemap.xml')
    const robotsOutput = join(outputDir, 'robots.txt')

    try {
      await execFileAsync(process.execPath, [
        'scripts/generate-sitemap.js',
        '--output',
        sitemapOutput,
        '--robots-output',
        robotsOutput,
      ])

      const [generatedSitemap, checkedInSitemap, generatedRobots, checkedInRobots] =
        await Promise.all([
          readFile(sitemapOutput, 'utf8'),
          readFile('public/sitemap.xml', 'utf8'),
          readFile(robotsOutput, 'utf8'),
          readFile('public/robots.txt', 'utf8'),
        ])

      expect(generatedSitemap).toBe(checkedInSitemap)
      expect(generatedRobots).toBe(checkedInRobots)
      expect(generatedSitemap).not.toContain('<lastmod>')
      expect(generatedSitemap).not.toContain('自动生成于')
    } finally {
      await rm(outputDir, { recursive: true, force: true })
    }
  })

  it('discovers valid public detail routes including schedule details', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'hmr-sitemap-dynamic-'))
    const sitemapOutput = join(outputDir, 'sitemap.xml')
    const robotsOutput = join(outputDir, 'robots.txt')
    const ids = {
      '/posts': '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f0',
      '/authors': '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f1',
      '/discussions': '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f2',
      '/schedules': '018f6d22-3cc7-7a1d-a456-4d2c59b6f4f3',
    } as const
    const server = createServer((request, response) => {
      const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
      const id = ids[pathname as keyof typeof ids]
      response.statusCode = id ? 200 : 404
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify(id ? { data: { items: [{ id }, { id: 'legacy-id' }] } } : {}))
    })

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
      const address = server.address() as AddressInfo

      await execFileAsync(
        process.execPath,
        ['scripts/generate-sitemap.js', '--output', sitemapOutput, '--robots-output', robotsOutput],
        {
          env: {
            ...process.env,
            PUBLIC_SITEMAP_API_BASE_URL: `http://127.0.0.1:${address.port}`,
          },
        }
      )

      const generatedSitemap = await readFile(sitemapOutput, 'utf8')
      expect(generatedSitemap).toContain(
        `<loc>https://next.momichan.com/posts/${ids['/posts']}</loc>`
      )
      expect(generatedSitemap).toContain(
        `<loc>https://next.momichan.com/author/${ids['/authors']}</loc>`
      )
      expect(generatedSitemap).toContain(
        `<loc>https://next.momichan.com/community/discussions/${ids['/discussions']}</loc>`
      )
      expect(generatedSitemap).toContain(
        `<loc>https://next.momichan.com/schedule/${ids['/schedules']}</loc>`
      )
      expect(generatedSitemap).not.toContain('legacy-id')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(outputDir, { recursive: true, force: true })
    }
  })
})
