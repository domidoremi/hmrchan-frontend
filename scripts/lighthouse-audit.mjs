#!/usr/bin/env node
/**
 * Lighthouse 性能审计脚本
 * 用于分析前端性能问题并生成报告
 */

import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import fs from 'fs'
import path from 'path'

const TARGET_URL = process.argv[2] || 'http://localhost:5173'

async function runLighthouse() {
  console.log(`🔍 Starting Lighthouse audit for: ${TARGET_URL}\n`)

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  })

  const options = {
    logLevel: 'info',
    output: ['html', 'json'],
    port: chrome.port,
    onlyCategories: ['performance', 'best-practices'],
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  }

  try {
    const runnerResult = await lighthouse(TARGET_URL, options)
    const reportHtml = runnerResult.report[0]
    const reportJson = JSON.parse(runnerResult.report[1])

    // 保存报告
    const reportsDir = path.join(process.cwd(), 'lighthouse-reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir)
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.writeFileSync(path.join(reportsDir, `report-${timestamp}.html`), reportHtml)
    fs.writeFileSync(path.join(reportsDir, `report-${timestamp}.json`), JSON.stringify(reportJson, null, 2))

    // 输出关键指标
    console.log('\n📊 Performance Metrics:')
    console.log('========================')

    const { categories, audits } = reportJson

    console.log(`\n🎯 Performance Score: ${Math.round(categories.performance.score * 100)}/100`)

    console.log('\n⏱️  Core Web Vitals:')
    console.log(`   FCP (First Contentful Paint): ${audits['first-contentful-paint'].displayValue}`)
    console.log(`   LCP (Largest Contentful Paint): ${audits['largest-contentful-paint'].displayValue}`)
    console.log(`   TBT (Total Blocking Time): ${audits['total-blocking-time'].displayValue}`)
    console.log(`   CLS (Cumulative Layout Shift): ${audits['cumulative-layout-shift'].displayValue}`)
    console.log(`   SI (Speed Index): ${audits['speed-index'].displayValue}`)

    // 网络请求分析
    const networkRequests = audits['network-requests']
    if (networkRequests?.details?.items) {
      const items = networkRequests.details.items
      console.log(`\n📡 Network Requests: ${items.length} total`)

      // 按类型分组
      const byType = {}
      let totalSize = 0
      items.forEach(item => {
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

    // 优化建议
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

    opportunities.forEach(key => {
      const audit = audits[key]
      if (audit && audit.score !== null && audit.score < 1) {
        console.log(`   ⚠️  ${audit.title}`)
        if (audit.displayValue) {
          console.log(`      Potential savings: ${audit.displayValue}`)
        }
      }
    })

    console.log(`\n✅ Report saved to: ${reportsDir}`)

  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error.message)
  } finally {
    await chrome.kill()
  }
}

runLighthouse().catch(console.error)
