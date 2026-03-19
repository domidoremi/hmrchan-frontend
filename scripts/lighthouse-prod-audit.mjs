#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const DEFAULT_BASE = 'https://momichan.xyz'
const DEFAULT_OUTPUT_DIR = '.lighthouse-prod'
const DEFAULT_URLS_FILE = path.join('scripts', 'config', 'lighthouse-prod-urls.json')
const ALLOWED_PROFILES = new Set(['mobile', 'desktop', 'both'])

function parseArgs(argv) {
  const options = {
    base: DEFAULT_BASE,
    profile: 'both',
    output: DEFAULT_OUTPUT_DIR,
    urlsFile: DEFAULT_URLS_FILE,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--base') options.base = argv[++index]
    else if (arg === '--profile') options.profile = argv[++index]
    else if (arg === '--output') options.output = argv[++index]
    else if (arg === '--urls-file') options.urlsFile = argv[++index]
    else if (arg === '--help' || arg === '-h') options.help = true
    else throw new Error(`未知参数: ${arg}`)
  }

  if (!ALLOWED_PROFILES.has(options.profile)) {
    throw new Error(`--profile 仅支持 mobile|desktop|both，收到: ${options.profile}`)
  }

  return options
}

function printHelp() {
  console.log(`
用法:
  bun run perf:lighthouse:prod -- --base https://momichan.xyz --profile both --urls-file scripts/config/lighthouse-prod-urls.json --output .lighthouse-prod

参数:
  --base       目标站点基础地址，默认 https://momichan.xyz
  --profile    mobile | desktop | both，默认 both
  --urls-file  URL 清单文件，支持 JSON 数组或纯文本一行一个 URL
  --output     输出目录，默认 .lighthouse-prod
`) 
}

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true })
  }
}

function resetDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true })
  fs.mkdirSync(targetPath, { recursive: true })
}

async function safeKillChrome(chrome) {
  if (!chrome) return
  try {
    await chrome.kill()
  } catch {
    // Windows 下 chrome-launcher 偶发清理失败，忽略即可
  }
}

function normalizeBase(base) {
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function readUrlsFile(filePath, base) {
  const absolutePath = path.resolve(filePath)
  const raw = fs.readFileSync(absolutePath, 'utf8').trim()
  if (!raw) return []

  let entries
  if (raw.startsWith('[')) {
    entries = JSON.parse(raw)
  } else {
    entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return entries.map((entry) => {
    if (/^https?:\/\//i.test(entry)) return entry
    const normalizedPath = entry.startsWith('/') ? entry : `/${entry}`
    return `${base}${normalizedPath}`
  })
}

function toSlug(targetUrl) {
  const parsed = new URL(targetUrl)
  const raw = `${parsed.hostname}${parsed.pathname === '/' ? '/home' : parsed.pathname}`
  return raw.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function roundScore(score) {
  return score === null || score === undefined ? null : Math.round(score * 100)
}

function toMs(audit) {
  if (!audit || audit.numericValue === undefined || audit.numericValue === null) return null
  return Math.round(audit.numericValue)
}

function toNumber(audit, digits = 3) {
  if (!audit || audit.numericValue === undefined || audit.numericValue === null) return null
  return Number(audit.numericValue.toFixed(digits))
}

function createSummaryEntry(targetUrl, profile, lhr) {
  const audits = lhr.audits
  const requestItems = audits['network-requests']?.details?.items ?? []
  const transferSizeBytes = requestItems.reduce((total, item) => total + (item.transferSize || 0), 0)
  const opportunities = [
    'render-blocking-resources',
    'unused-javascript',
    'unused-css-rules',
    'offscreen-images',
    'uses-optimized-images',
    'uses-responsive-images',
    'server-response-time',
  ]
    .map((id) => audits[id])
    .filter((audit) => audit && audit.score !== null && audit.score < 1)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      displayValue: audit.displayValue ?? null,
      score: audit.score,
    }))

  return {
    url: targetUrl,
    profile,
    finalDisplayedUrl: lhr.finalDisplayedUrl ?? targetUrl,
    runtimeError: lhr.runtimeError?.code ?? null,
    warnings: lhr.runWarnings ?? [],
    performance: roundScore(lhr.categories.performance?.score),
    accessibility: roundScore(lhr.categories.accessibility?.score),
    bestPractices: roundScore(lhr.categories['best-practices']?.score),
    seo: roundScore(lhr.categories.seo?.score),
    fcpMs: toMs(audits['first-contentful-paint']),
    lcpMs: toMs(audits['largest-contentful-paint']),
    cls: toNumber(audits['cumulative-layout-shift']),
    tbtMs: toMs(audits['total-blocking-time']),
    speedIndexMs: toMs(audits['speed-index']),
    requestCount: requestItems.length,
    transferSizeBytes,
    opportunities,
  }
}

function createAnalysis(summary, metadata) {
  const successful = summary.results.filter((entry) => !entry.error)
  const failed = summary.results.filter((entry) => entry.error)
  const homeEntries = successful.filter((entry) => entry.url === `${metadata.base}/`)

  const sortByDescending = (entries, field) => [...entries].filter((entry) => entry[field] !== null).sort((a, b) => b[field] - a[field]).slice(0, 3)
  const sortByAscending = (entries, field) => [...entries].filter((entry) => entry[field] !== null).sort((a, b) => a[field] - b[field]).slice(0, 3)

  const worstCls = sortByDescending(successful, 'cls')
  const slowestLcp = sortByDescending(successful, 'lcpMs')
  const slowestFcp = sortByDescending(successful, 'fcpMs')
  const worstMobilePerf = sortByAscending(successful.filter((entry) => entry.profile === 'mobile'), 'performance')
  const worstDesktopPerf = sortByAscending(successful.filter((entry) => entry.profile === 'desktop'), 'performance')

  const lines = []
  lines.push('# momichan.xyz Lighthouse 分析报告')
  lines.push('')
  lines.push('## 1. 执行说明')
  lines.push(`- 测试时间：${metadata.generatedAt}`)
  lines.push(`- 基础域名：${metadata.base}`)
  lines.push(`- 页面数：${metadata.urlCount}`)
  lines.push(`- 档位：${metadata.profiles.join(' + ')}`)
  lines.push(`- 成功报告：${successful.length}`)
  lines.push(`- 失败报告：${failed.length}`)
  lines.push(`- Cloudflare 约束：本轮仅覆盖 A 层匿名公开页面；若 B 层详情页需要额外放行，当前报告未纳入。`)
  lines.push('')
  lines.push('## 2. 总览结论')

  if (homeEntries.length > 0) {
    lines.push('- 首页双档核心指标：')
    for (const entry of homeEntries) {
      lines.push(
        `  - ${entry.profile}：Performance ${entry.performance}，FCP ${entry.fcpMs}ms，LCP ${entry.lcpMs}ms，CLS ${entry.cls}，TBT ${entry.tbtMs}ms，SI ${entry.speedIndexMs}ms`
      )
    }
  }

  if (worstCls.length > 0) {
    lines.push(`- CLS 最差页面：${worstCls.map((entry) => `${entry.profile}:${entry.url}(${entry.cls})`).join('；')}`)
  }
  if (slowestLcp.length > 0) {
    lines.push(`- LCP 最慢页面：${slowestLcp.map((entry) => `${entry.profile}:${entry.url}(${entry.lcpMs}ms)`).join('；')}`)
  }
  if (slowestFcp.length > 0) {
    lines.push(`- FCP 最慢页面：${slowestFcp.map((entry) => `${entry.profile}:${entry.url}(${entry.fcpMs}ms)`).join('；')}`)
  }
  lines.push('')
  lines.push('## 3. 页面级双档指标')

  const grouped = new Map()
  for (const entry of successful) {
    const bucket = grouped.get(entry.url) ?? []
    bucket.push(entry)
    grouped.set(entry.url, bucket)
  }

  for (const [targetUrl, entries] of grouped.entries()) {
    lines.push(`### ${targetUrl}`)
    for (const entry of entries.sort((a, b) => a.profile.localeCompare(b.profile))) {
      lines.push(
        `- ${entry.profile}：Performance ${entry.performance} / Accessibility ${entry.accessibility} / Best Practices ${entry.bestPractices} / SEO ${entry.seo} / FCP ${entry.fcpMs}ms / LCP ${entry.lcpMs}ms / CLS ${entry.cls} / TBT ${entry.tbtMs}ms / SI ${entry.speedIndexMs}ms / 请求 ${entry.requestCount} / 传输 ${(entry.transferSizeBytes / 1024).toFixed(1)}KB`
      )
      if (entry.opportunities.length > 0) {
        const topTwo = entry.opportunities.slice(0, 2)
        lines.push(`- 问题解释：主要机会点是 ${topTwo.map((item) => item.title).join('、')}，优先检查首屏阻塞资源、未使用脚本和图片加载策略。`)
      } else {
        lines.push('- 问题解释：该页机会点较少，优先关注运行时脚本执行与布局稳定性。')
      }
    }
    lines.push('')
  }

  lines.push('## 4. 专项分析')
  lines.push(`- FCP/LCP：最慢前 3 项分别是 ${slowestLcp.map((entry) => `${entry.profile}:${toSlug(entry.url)}`).join('、')}。优先排查首屏图片、关键 CSS、模块预加载和后续 hydration 开销。`)
  lines.push(`- CLS：最差前 3 项分别是 ${worstCls.map((entry) => `${entry.profile}:${toSlug(entry.url)}`).join('、')}。优先排查图片/媒体尺寸占位、客户端接管前后 DOM 结构变化、字体切换和懒加载插入。`)
  lines.push('- JS 阻塞：结合 TBT 与 opportunities，优先检查未使用 JavaScript、渲染阻塞资源与首屏模块链。')
  lines.push('- 图片/字体：若 LCP 页面机会点包含图片优化项，优先做 responsive images、格式优化和首屏预加载。')
  lines.push('- 网络体积：请求数与总传输体积偏高的页面，优先精简首屏资源与第三方依赖。')
  lines.push('')
  lines.push('## 5. 整改优先级')

  const topOpportunityTitles = successful.flatMap((entry) => entry.opportunities.map((item) => item.title))
  const counts = new Map()
  for (const title of topOpportunityTitles) {
    counts.set(title, (counts.get(title) ?? 0) + 1)
  }
  const rankedTitles = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([title]) => title)

  lines.push(`- P0：解决最影响首页与移动端的首屏资源问题，重点围绕 ${rankedTitles.slice(0, 3).join('、') || '渲染阻塞资源与大体积首屏资源'}。`) 
  lines.push('- P1：针对 CLS 最差页面补齐稳定尺寸占位、减少客户端接管时的布局回流。')
  lines.push('- P2：清理次要页面的未使用脚本、非关键样式和冗余请求，进一步提升整体一致性。')

  if (failed.length > 0) {
    lines.push('')
    lines.push('## 6. 未完成/受限页面')
    for (const entry of failed) {
      lines.push(`- ${entry.profile}:${entry.url}：因 ${entry.error} 未测；若属 B 层页面，需要 Cloudflare 侧显式放行。`)
    }
  }

  return `${lines.join('\n')}\n`
}

async function runSingleAudit(url, profile, chromePort) {
  const preset = profile === 'mobile' ? 'perf' : 'desktop'
  const result = await lighthouse(url, {
    port: chromePort,
    logLevel: 'error',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    preset,
  })
  return result
}

async function runAuditWithRetry(url, profile, outputDir) {
  const attempts = [1, 2]

  for (const attempt of attempts) {
    const tmpDir = path.join(outputDir, 'tmp', `${profile}-${toSlug(url)}-${attempt}`)
    const chromeProfileDir = path.join(tmpDir, 'chrome-profile')
    const launcherProfileDir = path.join(tmpDir, 'launcher-profile')
    resetDirectory(chromeProfileDir)
    resetDirectory(launcherProfileDir)

    const chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${chromeProfileDir}`,
      ],
      userDataDir: launcherProfileDir,
    })

    try {
      const runnerResult = await runSingleAudit(url, profile, chrome.port)
      const reports = Array.isArray(runnerResult.report) ? runnerResult.report : [runnerResult.report]
      const jsonReport = reports[1] ?? '{}'
      const lhr = JSON.parse(jsonReport)

      const hasTraceError = lhr.runtimeError?.code === 'NO_NAVSTART'
      if (!hasTraceError && lhr.categories?.performance?.score !== null) {
        return runnerResult
      }

      if (attempt === attempts.length) {
        return runnerResult
      }

      console.warn(`⚠️ ${profile} ${url} 第 ${attempt} 次出现 ${lhr.runtimeError?.code ?? '未知错误'}，准备重试...`)
    } finally {
      await safeKillChrome(chrome)
    }
  }

  throw new Error('Lighthouse 重试流程异常结束')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const base = normalizeBase(options.base)
  const profiles = options.profile === 'both' ? ['mobile', 'desktop'] : [options.profile]
  const urls = readUrlsFile(options.urlsFile, base)

  if (urls.length === 0) {
    throw new Error('URL 清单为空，无法执行 Lighthouse')
  }

  const outputDir = path.resolve(options.output)
  const rawDir = path.join(outputDir, 'raw')
  ensureDirectory(outputDir)
  ensureDirectory(rawDir)
  ensureDirectory(path.join(outputDir, 'tmp'))

  const summary = {
    generatedAt: new Date().toISOString(),
    base,
    profiles,
    urlCount: urls.length,
    results: [],
  }

  for (const profile of profiles) {
    console.log(`\n🚀 开始执行 ${profile} 档 Lighthouse...`)
    for (const targetUrl of urls) {
      const slug = toSlug(targetUrl)
      console.log(`📊 ${profile} -> ${targetUrl}`)
      try {
        const runnerResult = await runAuditWithRetry(targetUrl, profile, outputDir)
        const reports = Array.isArray(runnerResult.report) ? runnerResult.report : [runnerResult.report]
        const htmlReport = reports[0] ?? ''
        const jsonReport = reports[1] ?? '{}'
        fs.writeFileSync(path.join(rawDir, `${profile}-${slug}.html`), htmlReport)
        fs.writeFileSync(path.join(rawDir, `${profile}-${slug}.json`), jsonReport)

        const lhr = JSON.parse(jsonReport)
        if (lhr.runtimeError?.code === 'NO_NAVSTART' && lhr.categories?.performance?.score === null) {
          summary.results.push({
            url: targetUrl,
            profile,
            error: `Lighthouse trace failed: ${lhr.runtimeError.code}`,
            warnings: lhr.runWarnings ?? [],
          })
        } else {
          summary.results.push(createSummaryEntry(targetUrl, profile, lhr))
        }
      } catch (error) {
        summary.results.push({
          url: targetUrl,
          profile,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2))
  fs.writeFileSync(path.join(outputDir, 'analysis.md'), createAnalysis(summary, summary))

  console.log(`\n✅ 已输出报告目录：${outputDir}`)
  console.log(`- 原始报告：${rawDir}`)
  console.log(`- 聚合摘要：${path.join(outputDir, 'summary.json')}`)
  console.log(`- 中文分析：${path.join(outputDir, 'analysis.md')}`)
}

main().catch((error) => {
  console.error(`❌ 执行失败：${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
