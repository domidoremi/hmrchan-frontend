import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  analyzeBundleBudget,
  collectBundleBudgetMetrics,
  countHomeInitialAssets,
  formatBundleBudgetReport,
} from '../../../scripts/lib/bundle-budget.js'

describe('bundle budget helpers', () => {
  it('counts unique home initial assets while preserving tag reference count', () => {
    const summary = countHomeInitialAssets(`
      <script type="module" src="/assets/js/index.js"></script>
      <link rel="preload" href="/assets/css/index.css" as="style">
      <link rel="stylesheet" href="/assets/css/index.css">
      <link rel="manifest" href="/manifest.json">
    `)

    expect(summary.tagReferences).toBe(3)
    expect(summary.uniqueAssetReferences).toBe(2)
    expect(summary.urls).toEqual(['/assets/css/index.css', '/assets/js/index.js'])
  })

  it('collects dist metrics and flags budget violations', () => {
    const distDir = mkdtempSync(path.join(tmpdir(), 'hmrchan-bundle-budget-'))
    mkdirSync(path.join(distDir, 'assets', 'js'), { recursive: true })
    mkdirSync(path.join(distDir, 'assets', 'css'), { recursive: true })
    mkdirSync(path.join(distDir, 'icons'), { recursive: true })
    writeFileSync(path.join(distDir, 'index.html'), '<script src="/assets/js/app.js"></script>')
    writeFileSync(path.join(distDir, 'assets', 'js', 'app.js'), 'x'.repeat(100))
    writeFileSync(path.join(distDir, 'assets', 'css', 'app.css'), 'y'.repeat(60))
    writeFileSync(path.join(distDir, 'icons', 'sitting.webp'), 'z'.repeat(30))

    const metrics = collectBundleBudgetMetrics({ distDir })
    const result = analyzeBundleBudget(metrics, {
      maxTotalJsBytes: 99,
      maxTotalCssBytes: 100,
      maxTotalImageBytes: 100,
      maxLargestChunkBytes: 100,
      maxHomeInitialAssetCount: 1,
    })

    expect(metrics.totalJsBytes).toBe(100)
    expect(metrics.totalCssBytes).toBe(60)
    expect(metrics.totalImageBytes).toBe(30)
    expect(metrics.largestChunkPath).toBe('assets/js/app.js')
    expect(result.status).toBe('failed')
    expect(result.violations.map((violation) => violation.metric)).toEqual(['totalJsBytes'])
    expect(result.violations[0]).toEqual(
      expect.objectContaining({
        reasonCode: 'total-js-budget-exceeded',
        overBy: 1,
      })
    )
    expect(formatBundleBudgetReport(result)).toContain('totalJsBytes')
  })

  it('reports locator details for largest chunk and home initial asset violations', () => {
    const result = analyzeBundleBudget(
      {
        totalJsBytes: 100,
        totalCssBytes: 20,
        totalImageBytes: 30,
        largestChunkBytes: 80,
        largestChunkPath: 'assets/js/dashboard.js',
        homeInitialAssetCount: 3,
        homeInitialAssetTagCount: 4,
        homeInitialAssetUrls: ['/assets/css/app.css', '/assets/js/app.js', '/assets/js/vendor.js'],
        fileCounts: {
          js: 2,
          css: 1,
          images: 1,
          chunks: 3,
          total: 4,
        },
      },
      {
        maxTotalJsBytes: 120,
        maxTotalCssBytes: 30,
        maxTotalImageBytes: 40,
        maxLargestChunkBytes: 64,
        maxHomeInitialAssetCount: 2,
      }
    )

    expect(result.violations).toEqual([
      expect.objectContaining({
        metric: 'largestChunkBytes',
        reasonCode: 'largest-chunk-budget-exceeded',
        overBy: 16,
      }),
      expect.objectContaining({
        metric: 'homeInitialAssetCount',
        reasonCode: 'home-initial-asset-count-exceeded',
        overBy: 1,
      }),
    ])

    const report = formatBundleBudgetReport(result)

    expect(report).toContain('largestChunkPath: assets/js/dashboard.js')
    expect(report).toContain('homeInitialAssetUrls: /assets/css/app.css, /assets/js/app.js')
  })
})
