import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
})
