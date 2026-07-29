#!/usr/bin/env node

import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import fs from 'fs'
import path from 'path'

const TARGET_URLS = process.argv.slice(2)
const DEFAULT_URL = 'http://127.0.0.1:5173'

async function runLighthouse() {
  const urls = TARGET_URLS.length > 0 ? TARGET_URLS : [DEFAULT_URL]
  console.log(`🔍 Starting Lighthouse audit for: ${urls.join(', ')}\n`)

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  })

  const options = {
    logLevel: 'info',
    output: ['html', 'json'],
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  }

  try {
    const reportsDir = path.join(process.cwd(), 'lighthouse-reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir)
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    for (const url of urls) {
      const runnerResult = await lighthouse(url, options)
      const reportHtml = runnerResult.report[0]
      const reportJson = JSON.parse(runnerResult.report[1])

      const slug = (() => {
        try {
          const parsed = new URL(url)
          const raw = `${parsed.hostname}${parsed.pathname}`
          return (
            raw
              .replace(/[^a-z0-9]+/gi, '-')
              .replace(/^-+|-+$/g, '')
              .toLowerCase() || 'report'
          )
        } catch {
          return 'report'
        }
      })()

      fs.writeFileSync(path.join(reportsDir, `report-${timestamp}-${slug}.html`), reportHtml)
      fs.writeFileSync(
        path.join(reportsDir, `report-${timestamp}-${slug}.json`),
        JSON.stringify(reportJson, null, 2)
      )

      const { categories, audits } = reportJson

      console.log('\n📊 Lighthouse Scores:')
      console.log('====================')
      console.log(`\n🔗 URL: ${runnerResult.lhr.finalDisplayedUrl}`)
      console.log(`\n🎯 Performance: ${Math.round(categories.performance.score * 100)}/100`)
      console.log(`🎯 Accessibility: ${Math.round(categories.accessibility.score * 100)}/100`)
      console.log(`🎯 Best Practices: ${Math.round(categories['best-practices'].score * 100)}/100`)
      console.log(`🎯 SEO: ${Math.round(categories.seo.score * 100)}/100`)

      console.log('\n⏱️  Core Web Vitals:')
      console.log(
        `   FCP (First Contentful Paint): ${audits['first-contentful-paint'].displayValue}`
      )
      console.log(
        `   LCP (Largest Contentful Paint): ${audits['largest-contentful-paint'].displayValue}`
      )
      console.log(`   TBT (Total Blocking Time): ${audits['total-blocking-time'].displayValue}`)
      console.log(
        `   CLS (Cumulative Layout Shift): ${audits['cumulative-layout-shift'].displayValue}`
      )
      console.log(`   SI (Speed Index): ${audits['speed-index'].displayValue}`)

      const networkRequests = audits['network-requests']
      if (networkRequests?.details?.items) {
        const items = networkRequests.details.items
        console.log(`\n📡 Network Requests: ${items.length} total`)

        const byType = {}
        let totalSize = 0
        items.forEach((item) => {
          const type = item.resourceType || 'other'
          if (!byType[type]) byType[type] = { count: 0, size: 0 }
          byType[type].count++
          byType[type].size += item.transferSize || 0
          totalSize += item.transferSize || 0
        })

        console.log('\n   By Resource Type:')
        Object.entries(byType)
          .sort((a, b) => b[1].size - a[1].size)
          .forEach(([type, data]) => {
            console.log(`   - ${type}: ${data.count} requests, ${(data.size / 1024).toFixed(1)} KB`)
          })

        console.log(`\n   Total Transfer Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
      }

      console.log('\n💡 Optimization Opportunities:')
      const opportunities = [
        'render-blocking-resources',
        'unused-javascript',
        'unused-css-rules',
        'unminified-javascript',
        'unminified-css',
        'efficient-animated-content',
        'uses-responsive-images',
        'offscreen-images',
        'uses-optimized-images',
        'uses-webp-images',
      ]

      opportunities.forEach((key) => {
        const audit = audits[key]
        if (audit && audit.score !== null && audit.score < 1) {
          console.log(`   ⚠️  ${audit.title}`)
          if (audit.displayValue) {
            console.log(`      Potential savings: ${audit.displayValue}`)
          }
        }
      })
    }

    console.log(`\n✅ Reports saved to: ${reportsDir}`)
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error.message)
  } finally {
    await chrome.kill()
  }
}

runLighthouse().catch(console.error)
