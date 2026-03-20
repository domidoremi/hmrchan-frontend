#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

import {
  DEFAULT_BASE,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_RUNS,
  DEFAULT_URLS_FILE,
  ensureDirectory,
  normalizeBase,
  pageTypeForUrl,
  readUrlManifestDocument,
  resetDirectory,
  roundScore,
  toMs,
  toNumber,
  toSlug,
} from './lib/lighthouse-prod-shared.mjs'
import { discoverAuditTargets } from './lib/lighthouse-prod-discovery.mjs'
import { createAggregateAnalysis, mergeRunSummaries } from './lib/lighthouse-prod-aggregate.mjs'

const ALLOWED_PROFILES = new Set(['mobile', 'desktop', 'both'])
const ENV_CHROME_PATH =
  process.env.LIGHTHOUSE_CHROMIUM_PATH ||
  process.env.CHROME_PATH ||
  process.env.CHROME_BIN ||
  null
let cachedChromePathPromise = null

function parseArgs(argv) {
  const options = {
    base: DEFAULT_BASE,
    profile: 'both',
    output: DEFAULT_OUTPUT_DIR,
    urlsFile: DEFAULT_URLS_FILE,
    runId: null,
    runs: DEFAULT_RUNS,
    orchestrate: false,
    discoverOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--base') options.base = argv[++index]
    else if (arg === '--profile') options.profile = argv[++index]
    else if (arg === '--output') options.output = argv[++index]
    else if (arg === '--urls-file') options.urlsFile = argv[++index]
    else if (arg === '--run-id') options.runId = argv[++index]
    else if (arg === '--runs') options.runs = Number(argv[++index])
    else if (arg === '--orchestrate') options.orchestrate = true
    else if (arg === '--discover-only') options.discoverOnly = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else throw new Error(`未知参数: ${arg}`)
  }

  if (!ALLOWED_PROFILES.has(options.profile)) {
    throw new Error(`--profile 仅支持 mobile|desktop|both，收到: ${options.profile}`)
  }

  if (!Number.isInteger(options.runs) || options.runs <= 0) {
    throw new Error(`--runs 必须是正整数，收到: ${options.runs}`)
  }

  if (options.orchestrate && options.profile !== 'both') {
    throw new Error('编排模式固定执行 mobile + desktop，请勿同时传入 --profile mobile/desktop')
  }

  return options
}

function printHelp() {
  console.log(`
用法:
  node scripts/lighthouse-prod-audit.mjs --base https://momichan.xyz --profile both --urls-file scripts/config/lighthouse-prod-urls.json --output .lighthouse-prod
  node scripts/lighthouse-prod-audit.mjs --orchestrate --base https://momichan.xyz --output .lighthouse-prod --runs 3

参数:
  --base           目标站点基础地址，默认 https://momichan.xyz
  --profile        mobile | desktop | both，默认 both；编排模式固定为 both
  --urls-file      URL 清单文件，支持字符串数组、结构化 manifest 或纯文本一行一个 URL
  --output         单轮模式输出目录；编排模式输出审计根目录，默认 .lighthouse-prod
  --run-id         单轮模式可选 run 标识，用于多轮编排隔离输出
  --runs           编排模式重复轮次，默认 3
  --orchestrate    使用 Node 子进程执行 3 轮编排（每轮 mobile + desktop 并行）
  --discover-only  仅生成匿名可访问面 manifest，不执行 Lighthouse
`)
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
}

function formatMetric(value, suffix = '') {
  return value === null || value === undefined ? 'n/a' : `${value}${suffix}`
}

function average(values, digits = 0) {
  const numbers = values.filter(
    (value) => value !== null && value !== undefined && Number.isFinite(value)
  )

  if (numbers.length === 0) return null
  const result = numbers.reduce((sum, value) => sum + value, 0) / numbers.length
  return digits > 0 ? Number(result.toFixed(digits)) : Math.round(result)
}

function topEntries(entries, field, order = 'asc', count = 5) {
  return [...entries]
    .filter((entry) => entry[field] !== null && entry[field] !== undefined)
    .sort((left, right) => {
      if (order === 'desc') return right[field] - left[field]
      return left[field] - right[field]
    })
    .slice(0, count)
}

function averageMetrics(entries) {
  return {
    performance: average(entries.map((entry) => entry.performance)),
    accessibility: average(entries.map((entry) => entry.accessibility)),
    bestPractices: average(entries.map((entry) => entry.bestPractices)),
    seo: average(entries.map((entry) => entry.seo)),
    fcpMs: average(entries.map((entry) => entry.fcpMs)),
    lcpMs: average(entries.map((entry) => entry.lcpMs)),
    cls: average(entries.map((entry) => entry.cls), 3),
    tbtMs: average(entries.map((entry) => entry.tbtMs)),
    requestCount: average(entries.map((entry) => entry.requestCount)),
    transferSizeBytes: average(entries.map((entry) => entry.transferSizeBytes)),
  }
}

function topOpportunityTitles(entries, count = 5) {
  const counts = new Map()
  for (const entry of entries) {
    for (const item of entry.opportunities ?? []) {
      counts.set(item.title, (counts.get(item.title) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, count)
}

async function safeKillChrome(chrome) {
  if (!chrome) return
  try {
    await chrome.kill()
  } catch {
    // Windows 下 chrome-launcher 偶发清理失败，忽略即可
  }
}

async function resolveChromePath() {
  if (!cachedChromePathPromise) {
    cachedChromePathPromise = (async () => {
      if (ENV_CHROME_PATH) return ENV_CHROME_PATH

      try {
        const puppeteerModule = await import('puppeteer')
        const executablePath =
          puppeteerModule.executablePath?.() ?? puppeteerModule.default?.executablePath?.()
        if (
          typeof executablePath === 'string' &&
          executablePath.length > 0 &&
          fs.existsSync(executablePath)
        ) {
          return executablePath
        }
      } catch {
        // ignore puppeteer fallback failures
      }

      return null
    })()
  }

  return cachedChromePathPromise
}

function pickTargetMetadata(target) {
  return {
    pageType: target.pageType ?? pageTypeForUrl(target.url),
    discoverySource: target.discoverySource ?? null,
    indexedInSitemap: Boolean(target.indexedInSitemap),
    robotsDisallowed: Boolean(target.robotsDisallowed),
    selectionReason: target.selectionReason ?? null,
  }
}

function createSummaryEntry(target, profile, lhr) {
  const audits = lhr.audits
  const requestItems = audits['network-requests']?.details?.items ?? []
  const transferSizeBytes = requestItems.reduce(
    (total, item) => total + (item.transferSize || 0),
    0
  )
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
    url: target.url,
    profile,
    ...pickTargetMetadata(target),
    finalDisplayedUrl: lhr.finalDisplayedUrl ?? target.url,
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
    error: null,
  }
}

function createErrorEntry(target, profile, error, warnings = [], runtimeError = null) {
  return {
    url: target.url,
    profile,
    ...pickTargetMetadata(target),
    warnings,
    runtimeError,
    opportunities: [],
    error,
  }
}

function createAnalysis(summary) {
  const successful = summary.results.filter((entry) => !entry.error)
  const failed = summary.results.filter((entry) => entry.error)
  const authEntries = successful.filter((entry) => entry.pageType === 'anonymous-auth')
  const contentEntries = successful.filter((entry) => entry.pageType !== 'anonymous-auth')
  const grouped = new Map()

  for (const entry of successful) {
    const key = `${entry.pageType}::${entry.profile}`
    const bucket = grouped.get(key) ?? []
    bucket.push(entry)
    grouped.set(key, bucket)
  }

  const worstMobile = topEntries(
    contentEntries.filter((entry) => entry.profile === 'mobile'),
    'performance',
    'asc'
  )
  const worstDesktop = topEntries(
    contentEntries.filter((entry) => entry.profile === 'desktop'),
    'performance',
    'asc'
  )
  const slowestLcp = topEntries(contentEntries, 'lcpMs', 'desc')
  const worstCls = topEntries(contentEntries, 'cls', 'desc')
  const largestPages = topEntries(contentEntries, 'transferSizeBytes', 'desc')
  const busiestPages = topEntries(contentEntries, 'requestCount', 'desc')
  const hotOpportunities = topOpportunityTitles(contentEntries)

  const lines = []
  lines.push('# momichan.xyz Lighthouse 单轮分析报告')
  lines.push('')
  lines.push('## 1. 覆盖范围与执行说明')
  lines.push(`- 测试时间：${summary.generatedAt}`)
  if (summary.runId) lines.push(`- 轮次标识：${summary.runId}`)
  lines.push(`- 基础域名：${summary.base}`)
  lines.push(`- 页面数：${summary.urlCount}`)
  lines.push(`- 档位：${summary.profiles.join(' + ')}`)
  lines.push(`- 成功结果：${successful.length}`)
  lines.push(`- 失败结果：${failed.length}`)
  if (summary.coverage) {
    lines.push(
      `- 覆盖页面类型：${Object.entries(summary.coverage.includedByPageType ?? {})
        .map(([pageType, count]) => `${pageType}=${count}`)
        .join('，')}`
    )
    if ((summary.coverage.gaps ?? []).length > 0) {
      lines.push(
        `- 详情样本缺口：${summary.coverage.gaps
          .map((gap) => `${gap.pageType} 缺 ${gap.missing}`)
          .join('，')}`
      )
    }
    if ((summary.coverage.sourceFailures ?? []).length > 0) {
      lines.push(
        `- 发现阶段异常：${summary.coverage.sourceFailures
          .map((item) => `${item.source}: ${item.error}`)
          .join('；')}`
      )
    }
  }
  if ((summary.excluded ?? []).length > 0) {
    lines.push(
      `- 排除路径：${summary.excluded
        .map((entry) => new URL(entry.url).pathname)
        .join('，')}`
    )
  }

  lines.push('')
  lines.push('## 2. 最差页面 Top N')
  if (worstMobile.length > 0) {
    lines.push('- Mobile 低分页：')
    for (const entry of worstMobile) {
      lines.push(
        `  - ${entry.url} (${entry.pageType})：Performance ${formatMetric(entry.performance)}，LCP ${formatMetric(entry.lcpMs, 'ms')}，TBT ${formatMetric(entry.tbtMs, 'ms')}`
      )
    }
  }
  if (worstDesktop.length > 0) {
    lines.push('- Desktop 低分页：')
    for (const entry of worstDesktop) {
      lines.push(
        `  - ${entry.url} (${entry.pageType})：Performance ${formatMetric(entry.performance)}，LCP ${formatMetric(entry.lcpMs, 'ms')}，TBT ${formatMetric(entry.tbtMs, 'ms')}`
      )
    }
  }
  if (slowestLcp.length > 0) {
    lines.push(
      `- LCP 最慢：${slowestLcp
        .map((entry) => `${entry.profile}:${entry.url} (${formatMetric(entry.lcpMs, 'ms')})`)
        .join('；')}`
    )
  }
  if (worstCls.length > 0) {
    lines.push(
      `- CLS 最差：${worstCls
        .map((entry) => `${entry.profile}:${entry.url} (${formatMetric(entry.cls)})`)
        .join('；')}`
    )
  }

  lines.push('')
  lines.push('## 3. 按 pageType + profile 分组统计')
  for (const [key, entries] of [...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const [pageType, profile] = key.split('::')
    const metrics = averageMetrics(entries)
    lines.push(
      `- ${pageType} / ${profile}：${entries.length} 个结果，Perf ${formatMetric(metrics.performance)}，A11y ${formatMetric(metrics.accessibility)}，BP ${formatMetric(metrics.bestPractices)}，SEO ${formatMetric(metrics.seo)}，FCP ${formatMetric(metrics.fcpMs, 'ms')}，LCP ${formatMetric(metrics.lcpMs, 'ms')}，CLS ${formatMetric(metrics.cls)}，TBT ${formatMetric(metrics.tbtMs, 'ms')}，请求 ${formatMetric(metrics.requestCount)}，传输 ${metrics.transferSizeBytes === null ? 'n/a' : `${Math.round(metrics.transferSizeBytes / 1024)}KB`}`
    )
  }

  lines.push('')
  lines.push('## 4. FCP/LCP/CLS/TBT/体积/请求数专项')
  if (hotOpportunities.length > 0) {
    lines.push(
      `- 高频 opportunities：${hotOpportunities
        .map(([title, count]) => `${title}（${count}）`)
        .join('，')}`
    )
  }
  if (largestPages.length > 0) {
    lines.push(
      `- 体积偏大页面：${largestPages
        .slice(0, 3)
        .map(
          (entry) =>
            `${entry.profile}:${entry.url} (${Math.round((entry.transferSizeBytes ?? 0) / 1024)}KB)`
        )
        .join('；')}`
    )
  }
  if (busiestPages.length > 0) {
    lines.push(
      `- 请求数偏高页面：${busiestPages
        .slice(0, 3)
        .map((entry) => `${entry.profile}:${entry.url} (${entry.requestCount})`)
        .join('；')}`
    )
  }
  if (slowestLcp.length > 0) {
    lines.push(
      `- LCP 重点：${slowestLcp
        .slice(0, 3)
        .map((entry) => `${entry.pageType}/${entry.profile}`)
        .join('、')} 优先检查首屏媒体、关键 CSS 与 hydration 链路。`
    )
  }
  if (worstCls.length > 0) {
    lines.push(
      `- CLS 重点：${worstCls
        .slice(0, 3)
        .map((entry) => `${entry.pageType}/${entry.profile}`)
        .join('、')} 优先补齐占位、稳定首屏布局并减少客户端接管回流。`
    )
  }

  lines.push('')
  lines.push('## 5. 认证页 / 工具页单列')
  if (authEntries.length === 0) {
    lines.push('- 本轮未包含匿名认证页。')
  } else {
    const metrics = averageMetrics(authEntries)
    lines.push(
      `- 认证页平均：Perf ${formatMetric(metrics.performance)}，LCP ${formatMetric(metrics.lcpMs, 'ms')}，TBT ${formatMetric(metrics.tbtMs, 'ms')}，SEO ${formatMetric(metrics.seo)}。`
    )
    lines.push('- 认证页 SEO 与可能的 challenge 干扰需单独解读，不并入内容页共性结论。')
    const authWarnings = uniqueStrings(authEntries.flatMap((entry) => entry.warnings ?? []))
    if (authWarnings.length > 0) {
      lines.push(`- 认证页 warnings：${authWarnings.join('；')}`)
    }
  }

  lines.push('')
  lines.push('## 6. P0 / P1 / P2 整改建议')
  lines.push('- P0：优先处理首页与帖子详情的首屏资源、LCP 媒体与主线程阻塞。')
  lines.push('- P1：清理跨页面未使用的 JavaScript / CSS，并降低共享预取对匿名落地页的干扰。')
  lines.push('- P2：针对 CLS 与 Best Practices 低分页面补齐稳定占位，并排查第三方脚本或浏览器环境告警。')

  if (failed.length > 0) {
    lines.push('')
    lines.push('## 7. 失败 / 受限页面')
    for (const entry of failed) {
      lines.push(`- ${entry.profile}:${entry.url}：${entry.error}`)
    }
  }

  return `${lines.join('\n')}\n`
}

async function runSingleAudit(url, profile, chromePort) {
  const preset = profile === 'mobile' ? 'perf' : 'desktop'
  return lighthouse(url, {
    port: chromePort,
    logLevel: 'error',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    preset,
  })
}

async function runAuditWithRetry(url, profile, outputDir) {
  const attempts = [1, 2]
  const chromePath = await resolveChromePath()

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
      ...(chromePath ? { chromePath } : {}),
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

      console.warn(
        `⚠️ ${profile} ${url} 第 ${attempt} 次出现 ${lhr.runtimeError?.code ?? '未知错误'}，准备重试...`
      )
    } finally {
      await safeKillChrome(chrome)
    }
  }

  throw new Error('Lighthouse 重试流程异常结束')
}

function prefixStream(stream, prefix) {
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim().length === 0) continue
      console.log(`${prefix} ${line}`)
    }
  })
  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      console.log(`${prefix} ${buffer.trimEnd()}`)
    }
  })
}

function runNodeScript(scriptPath, args, prefix) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    prefixStream(child.stdout, prefix)
    prefixStream(child.stderr, prefix)

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`))
    })
  })
}

function combineProfileSummaries(runId, runDir, summaries) {
  const base = summaries[0]?.base ?? null
  const profiles = summaries.flatMap((summary) => summary.profiles ?? [])
  const results = summaries
    .flatMap((summary) => summary.results ?? [])
    .sort((left, right) => left.url.localeCompare(right.url) || left.profile.localeCompare(right.profile))

  const combined = {
    generatedAt: new Date().toISOString(),
    runId,
    base,
    profiles: [...new Set(profiles)],
    urlCount: new Set(results.map((entry) => entry.url)).size,
    coverage: summaries.find((summary) => summary.coverage)?.coverage ?? null,
    excluded: summaries.find((summary) => Array.isArray(summary.excluded) && summary.excluded.length > 0)?.excluded ?? [],
    results,
  }

  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(combined, null, 2))
  return combined
}

async function executeRun({ base, manifestPath, outputDir, runNumber }) {
  const runId = `run-${runNumber}`
  const runDir = path.join(outputDir, 'runs', runId)
  const mobileDir = path.join(runDir, 'mobile')
  const desktopDir = path.join(runDir, 'desktop')

  ensureDirectory(runDir)

  console.log(`\n🏁 开始 ${runId}（mobile + desktop 并行）`)

  await Promise.all([
    runNodeScript(
      path.resolve('scripts', 'lighthouse-prod-audit.mjs'),
      ['--base', base, '--profile', 'mobile', '--urls-file', manifestPath, '--output', mobileDir, '--run-id', runId],
      `[${runId} mobile]`
    ),
    runNodeScript(
      path.resolve('scripts', 'lighthouse-prod-audit.mjs'),
      ['--base', base, '--profile', 'desktop', '--urls-file', manifestPath, '--output', desktopDir, '--run-id', runId],
      `[${runId} desktop]`
    ),
  ])

  const mobileSummary = JSON.parse(fs.readFileSync(path.join(mobileDir, 'summary.json'), 'utf8'))
  const desktopSummary = JSON.parse(fs.readFileSync(path.join(desktopDir, 'summary.json'), 'utf8'))
  return combineProfileSummaries(runId, runDir, [mobileSummary, desktopSummary])
}

async function executeOrchestratedAudit(options) {
  if (options.runId) {
    throw new Error('编排模式不支持 --run-id，请交由脚本自动生成 run-1 / run-2 / run-3')
  }

  const base = normalizeBase(options.base)
  const outputDir = path.resolve(options.output)
  fs.rmSync(outputDir, { recursive: true, force: true })
  ensureDirectory(outputDir)
  ensureDirectory(path.join(outputDir, 'runs'))

  console.log('🔎 发现匿名可访问面 URL...')
  const manifest = await discoverAuditTargets({
    base,
    fallbackUrlsFile: options.urlsFile,
  })

  const manifestPath = path.join(outputDir, 'url-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`✅ 已生成 manifest：${manifestPath}`)
  console.log(`- 总 URL：${manifest.entries.length}`)
  if ((manifest.coverage.gaps ?? []).length > 0) {
    console.warn(
      `⚠️ 详情样本存在缺口：${manifest.coverage.gaps
        .map((gap) => `${gap.pageType} 缺 ${gap.missing}`)
        .join('，')}`
    )
  }

  if (options.discoverOnly) {
    return
  }

  const runSummaries = []
  for (let runNumber = 1; runNumber <= options.runs; runNumber += 1) {
    runSummaries.push(
      await executeRun({
        base,
        manifestPath,
        outputDir,
        runNumber,
      })
    )
  }

  const merged = mergeRunSummaries({
    runSummaries,
    manifest,
  })

  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(merged, null, 2))
  fs.writeFileSync(path.join(outputDir, 'analysis.md'), createAggregateAnalysis(merged))

  console.log(`\n✅ 全量审计完成：${outputDir}`)
  console.log(`- URL manifest：${manifestPath}`)
  console.log(`- 聚合 summary：${path.join(outputDir, 'summary.json')}`)
  console.log(`- 中文分析：${path.join(outputDir, 'analysis.md')}`)
}

async function executeSingleRunAudit(options) {
  const base = normalizeBase(options.base)
  const profiles = options.profile === 'both' ? ['mobile', 'desktop'] : [options.profile]
  const manifestDocument = readUrlManifestDocument(options.urlsFile, base)
  const targets = manifestDocument.entries

  if (targets.length === 0) {
    throw new Error('URL 清单为空，无法执行 Lighthouse')
  }

  const outputDir = path.resolve(options.output)
  const rawDir = path.join(outputDir, 'raw')
  ensureDirectory(outputDir)
  ensureDirectory(rawDir)
  ensureDirectory(path.join(outputDir, 'tmp'))

  const summary = {
    generatedAt: new Date().toISOString(),
    runId: options.runId,
    base,
    profiles,
    urlCount: targets.length,
    coverage: manifestDocument.coverage ?? null,
    excluded: manifestDocument.excluded ?? [],
    results: [],
  }

  for (const profile of profiles) {
    console.log(`\n🚀 开始执行 ${profile} 档 Lighthouse${options.runId ? ` (${options.runId})` : ''}...`)
    for (const target of targets) {
      const slug = toSlug(target.url)
      console.log(`📊 ${profile} -> ${target.url}`)

      try {
        const runnerResult = await runAuditWithRetry(target.url, profile, outputDir)
        const reports = Array.isArray(runnerResult.report) ? runnerResult.report : [runnerResult.report]
        const htmlReport = reports[0] ?? ''
        const jsonReport = reports[1] ?? '{}'
        fs.writeFileSync(path.join(rawDir, `${profile}-${slug}.html`), htmlReport)
        fs.writeFileSync(path.join(rawDir, `${profile}-${slug}.json`), jsonReport)

        const lhr = JSON.parse(jsonReport)
        if (lhr.runtimeError?.code === 'NO_NAVSTART' && lhr.categories?.performance?.score === null) {
          summary.results.push(
            createErrorEntry(
              target,
              profile,
              `Lighthouse trace failed: ${lhr.runtimeError.code}`,
              lhr.runWarnings ?? [],
              lhr.runtimeError?.code ?? null
            )
          )
        } else {
          summary.results.push(createSummaryEntry(target, profile, lhr))
        }
      } catch (error) {
        summary.results.push(
          createErrorEntry(
            target,
            profile,
            error instanceof Error ? error.message : String(error),
            [],
            typeof error === 'object' && error !== null && 'code' in error
              ? String(error.code)
              : null
          )
        )
      }
    }
  }

  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2))
  fs.writeFileSync(path.join(outputDir, 'analysis.md'), createAnalysis(summary))

  console.log(`\n✅ 已输出报告目录：${outputDir}`)
  console.log(`- 原始报告：${rawDir}`)
  console.log(`- 聚合摘要：${path.join(outputDir, 'summary.json')}`)
  console.log(`- 中文分析：${path.join(outputDir, 'analysis.md')}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  if (options.orchestrate) {
    await executeOrchestratedAudit(options)
    return
  }

  await executeSingleRunAudit(options)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(`❌ 执行失败：${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
