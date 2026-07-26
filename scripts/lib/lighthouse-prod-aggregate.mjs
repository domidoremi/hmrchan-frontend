import {
  DEFAULT_PROFILES,
  average,
  compareAuditEntries,
  median,
  medianFloat,
  pageTypeForUrl,
} from './lighthouse-prod-shared.mjs'

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
}

function summarizeOpportunities(entries) {
  const opportunityMap = new Map()

  for (const entry of entries) {
    for (const item of entry.opportunities ?? []) {
      const existing = opportunityMap.get(item.id) ?? {
        id: item.id,
        title: item.title,
        displayValue: item.displayValue ?? null,
        score: item.score ?? null,
        count: 0,
      }
      existing.count += 1
      if (existing.displayValue === null && item.displayValue) {
        existing.displayValue = item.displayValue
      }
      if (existing.score === null && item.score !== null && item.score !== undefined) {
        existing.score = item.score
      }
      opportunityMap.set(item.id, existing)
    }
  }

  return [...opportunityMap.values()].sort(
    (left, right) => right.count - left.count || left.title.localeCompare(right.title)
  )
}

function valueRange(values) {
  const numbers = values.filter(
    (value) => value !== null && value !== undefined && Number.isFinite(value)
  )
  if (numbers.length < 2) return 0
  return Math.max(...numbers) - Math.min(...numbers)
}

function containsChallengeSignal(...values) {
  const text = values
    .flat()
    .filter(Boolean)
    .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
    .join(' ')

  return /(challenge|required|turnstile|verification|captcha)/i.test(text)
}

function createRunRecord(entry, runNumber, runLabel) {
  if (!entry) {
    return {
      run: runNumber,
      runLabel,
      error: 'Missing result for URL/profile in this run',
      warnings: [],
      runtimeError: null,
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      fcpMs: null,
      lcpMs: null,
      cls: null,
      tbtMs: null,
      speedIndexMs: null,
      requestCount: null,
      transferSizeBytes: null,
    }
  }

  return {
    run: runNumber,
    runLabel,
    error: entry.error ?? null,
    warnings: entry.warnings ?? [],
    runtimeError: entry.runtimeError ?? null,
    performance: entry.performance ?? null,
    accessibility: entry.accessibility ?? null,
    bestPractices: entry.bestPractices ?? null,
    seo: entry.seo ?? null,
    fcpMs: entry.fcpMs ?? null,
    lcpMs: entry.lcpMs ?? null,
    cls: entry.cls ?? null,
    tbtMs: entry.tbtMs ?? null,
    speedIndexMs: entry.speedIndexMs ?? null,
    requestCount: entry.requestCount ?? null,
    transferSizeBytes: entry.transferSizeBytes ?? null,
  }
}

function manifestMetadataFor(url, manifestLookup, fallbackEntry) {
  const manifestEntry = manifestLookup.get(url)
  const sample = manifestEntry ?? fallbackEntry ?? {}
  return {
    pageType: sample.pageType ?? pageTypeForUrl(url),
    discoverySource: sample.discoverySource ?? null,
    indexedInSitemap: Boolean(sample.indexedInSitemap),
    robotsDisallowed: Boolean(sample.robotsDisallowed),
    selectionReason: sample.selectionReason ?? null,
  }
}

function createAggregateEntry({ url, profile, runs, sampleEntry, manifestLookup, sourceEntries }) {
  const metadata = manifestMetadataFor(url, manifestLookup, sampleEntry)
  const successfulRuns = runs.filter((run) => !run.error)
  const failedRuns = runs.filter((run) => run.error)

  const performanceSpread = valueRange(successfulRuns.map((run) => run.performance))
  const lcpSpread = valueRange(successfulRuns.map((run) => run.lcpMs))
  const challengeLikely =
    metadata.pageType === 'anonymous-auth' &&
    containsChallengeSignal(
      successfulRuns.map((run) => run.warnings),
      failedRuns.map((run) => run.error),
      failedRuns.map((run) => run.runtimeError)
    )

  const unstableReasons = []
  if (failedRuns.length > 0) unstableReasons.push('failed-run')
  if (performanceSpread > 15) unstableReasons.push('performance-spread>15')
  if (lcpSpread > 1000) unstableReasons.push('lcp-spread>1000ms')
  if (runs.some((run) => run.runtimeError)) unstableReasons.push('runtime-error')
  if (challengeLikely) unstableReasons.push('challenge-signal')

  return {
    url,
    profile,
    ...metadata,
    finalDisplayedUrl: sampleEntry?.finalDisplayedUrl ?? null,
    runtimeError:
      runs
        .map((run) => run.runtimeError)
        .find((value) => typeof value === 'string' && value.length > 0) ?? null,
    warnings: uniqueStrings(runs.flatMap((run) => run.warnings ?? [])),
    runs,
    error:
      failedRuns.length > 0
        ? failedRuns.map((run) => ({
            run: run.run,
            runLabel: run.runLabel,
            error: run.error,
            warnings: run.warnings,
          }))
        : null,
    unstable: unstableReasons.length > 0,
    unstableReasons,
    challengeLikely,
    performance: median(successfulRuns.map((run) => run.performance)),
    accessibility: median(successfulRuns.map((run) => run.accessibility)),
    bestPractices: median(successfulRuns.map((run) => run.bestPractices)),
    seo: median(successfulRuns.map((run) => run.seo)),
    fcpMs: median(successfulRuns.map((run) => run.fcpMs)),
    lcpMs: median(successfulRuns.map((run) => run.lcpMs)),
    cls: medianFloat(successfulRuns.map((run) => run.cls)),
    tbtMs: median(successfulRuns.map((run) => run.tbtMs)),
    speedIndexMs: median(successfulRuns.map((run) => run.speedIndexMs)),
    requestCount: median(successfulRuns.map((run) => run.requestCount)),
    transferSizeBytes: median(successfulRuns.map((run) => run.transferSizeBytes)),
    opportunities: summarizeOpportunities(
      successfulRuns.map((run) => sourceEntries.get(run.run) ?? null).filter(Boolean)
    ),
  }
}

export function mergeRunSummaries({ runSummaries, manifest = null }) {
  if (!Array.isArray(runSummaries) || runSummaries.length === 0) {
    throw new Error('至少需要一个 run summary 才能聚合')
  }

  const manifestEntries = Array.isArray(manifest?.entries) ? manifest.entries : []
  const manifestLookup = new Map(manifestEntries.map((entry) => [entry.url, entry]))
  const profiles =
    uniqueStrings(runSummaries.flatMap((summary) => summary.profiles ?? [])) || DEFAULT_PROFILES
  const base = runSummaries[0].base

  const keyToEntries = new Map()
  const registerKey = (url, profile) => {
    const key = `${profile}::${url}`
    if (!keyToEntries.has(key)) {
      keyToEntries.set(key, {
        url,
        profile,
        entriesByRun: new Map(),
      })
    }
    return keyToEntries.get(key)
  }

  for (const entry of manifestEntries) {
    for (const profile of profiles) {
      registerKey(entry.url, profile)
    }
  }

  for (let runIndex = 0; runIndex < runSummaries.length; runIndex += 1) {
    const summary = runSummaries[runIndex]
    for (const entry of summary.results ?? []) {
      const bucket = registerKey(entry.url, entry.profile)
      bucket.entriesByRun.set(runIndex + 1, entry)
    }
  }

  const results = []

  for (const bucket of keyToEntries.values()) {
    const sampleEntry = manifestLookup.get(bucket.url) ??
      [...bucket.entriesByRun.values()].find(Boolean) ?? {
        url: bucket.url,
        pageType: pageTypeForUrl(bucket.url),
      }

    const runs = runSummaries.map((summary, index) =>
      createRunRecord(
        bucket.entriesByRun.get(index + 1) ?? null,
        index + 1,
        summary.runId ?? `run-${index + 1}`
      )
    )

    results.push(
      createAggregateEntry({
        url: bucket.url,
        profile: bucket.profile,
        runs,
        sampleEntry,
        manifestLookup,
        sourceEntries: bucket.entriesByRun,
      })
    )
  }

  results.sort(compareAuditEntries)

  return {
    generatedAt: new Date().toISOString(),
    base,
    profiles,
    runs: runSummaries.map((summary, index) => summary.runId ?? `run-${index + 1}`),
    coverage: manifest?.coverage ?? null,
    excluded: manifest?.excluded ?? [],
    results,
  }
}

function formatMetric(value, suffix = '') {
  return value === null || value === undefined ? 'n/a' : `${value}${suffix}`
}

function averageMetrics(entries) {
  return {
    performance: average(entries.map((entry) => entry.performance)),
    accessibility: average(entries.map((entry) => entry.accessibility)),
    bestPractices: average(entries.map((entry) => entry.bestPractices)),
    seo: average(entries.map((entry) => entry.seo)),
    fcpMs: average(entries.map((entry) => entry.fcpMs)),
    lcpMs: average(entries.map((entry) => entry.lcpMs)),
    cls: average(
      entries.map((entry) => entry.cls),
      3
    ),
    tbtMs: average(entries.map((entry) => entry.tbtMs)),
    requestCount: average(entries.map((entry) => entry.requestCount)),
    transferSizeBytes: average(entries.map((entry) => entry.transferSizeBytes)),
  }
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

export function createAggregateAnalysis(summary) {
  const successful = summary.results.filter((entry) => !entry.error)
  const unstable = summary.results.filter((entry) => entry.unstable)
  const authResults = summary.results.filter((entry) => entry.pageType === 'anonymous-auth')
  const authSuccessful = authResults.filter((entry) => !entry.error)
  const challengeEntries = authResults.filter((entry) => entry.challengeLikely)
  const contentEntries = successful.filter(
    (entry) => entry.pageType !== 'anonymous-auth' && !entry.challengeLikely
  )
  const grouped = new Map()

  for (const entry of successful) {
    const key = `${entry.pageType}::${entry.profile}`
    const bucket = grouped.get(key) ?? []
    bucket.push(entry)
    grouped.set(key, bucket)
  }

  const lines = []
  lines.push('# next.momichan.com Lighthouse 聚合分析报告')
  lines.push('')
  lines.push('## 1. 覆盖范围与排除项')
  lines.push(`- 生成时间：${summary.generatedAt}`)
  lines.push(`- 基础域名：${summary.base}`)
  lines.push(`- 执行轮次：${summary.runs.join('、')}`)
  lines.push(`- 聚合结果数：${summary.results.length}`)
  if (summary.coverage) {
    lines.push(
      `- 覆盖页面类型：${Object.entries(summary.coverage.includedByPageType ?? {})
        .map(([pageType, count]) => `${pageType}=${count}`)
        .join('，')}`
    )
    lines.push(`- sitemap 已收录页面：${summary.coverage.indexedCount}`)
    lines.push(`- robots 标记禁止抓取页面：${summary.coverage.robotsDisallowedCount}`)
    if ((summary.coverage.gaps ?? []).length > 0) {
      lines.push(
        `- 详情样本缺口：${summary.coverage.gaps
          .map((gap) => `${gap.pageType} 缺 ${gap.missing}`)
          .join('，')}`
      )
    } else {
      lines.push('- 详情样本配额：author 2 / post 3 / discussion 1 / schedule 1 已满足')
    }
    if ((summary.coverage.rejectedFallbacks ?? []).length > 0) {
      lines.push(
        `- 已剔除失效详情样本：${summary.coverage.rejectedFallbacks
          .map(
            (item) =>
              `${item.pageType}: ${item.status ?? item.error ?? 'unknown'} ${item.probeUrl ?? item.url}`
          )
          .join('；')}`
      )
    }
  }
  if ((summary.excluded ?? []).length > 0) {
    lines.push(
      `- 排除路径：${summary.excluded.map((entry) => new URL(entry.url).pathname).join('，')}`
    )
  }
  lines.push('')
  lines.push('## 2. 最差页面 Top N')

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
  if (unstable.length > 0) {
    lines.push(
      `- 波动页面：${unstable
        .map((entry) => `${entry.profile}:${entry.url} [${entry.unstableReasons.join(', ')}]`)
        .join('；')}`
    )
  }

  lines.push('')
  lines.push('## 3. 按 pageType + profile 分组统计')
  for (const [key, entries] of [...grouped.entries()].sort((left, right) =>
    left[0].localeCompare(right[0])
  )) {
    const [pageType, profile] = key.split('::')
    const metrics = averageMetrics(entries)
    lines.push(
      `- ${pageType} / ${profile}：${entries.length} 个结果，Perf ${formatMetric(metrics.performance)}，A11y ${formatMetric(metrics.accessibility)}，BP ${formatMetric(metrics.bestPractices)}，SEO ${formatMetric(metrics.seo)}，FCP ${formatMetric(metrics.fcpMs, 'ms')}，LCP ${formatMetric(metrics.lcpMs, 'ms')}，CLS ${formatMetric(metrics.cls)}，TBT ${formatMetric(metrics.tbtMs, 'ms')}，请求 ${formatMetric(metrics.requestCount)}，传输 ${metrics.transferSizeBytes === null ? 'n/a' : `${Math.round(metrics.transferSizeBytes / 1024)}KB`}`
    )
  }

  lines.push('')
  lines.push('## 4. FCP/LCP/CLS/TBT/体积/请求数专项')
  const hotOpportunities = topOpportunityTitles(contentEntries)
  if (hotOpportunities.length > 0) {
    lines.push(
      `- 高频 opportunities：${hotOpportunities
        .map(([title, count]) => `${title}（${count}）`)
        .join('，')}`
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
        .join('、')} 优先补齐媒体占位和避免客户端接管造成回流。`
    )
  }
  const largestPages = topEntries(contentEntries, 'transferSizeBytes', 'desc')
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
  const busiestPages = topEntries(contentEntries, 'requestCount', 'desc')
  if (busiestPages.length > 0) {
    lines.push(
      `- 请求数偏高页面：${busiestPages
        .slice(0, 3)
        .map((entry) => `${entry.profile}:${entry.url} (${entry.requestCount})`)
        .join('；')}`
    )
  }

  lines.push('')
  lines.push('## 5. 认证页 / 第三方挑战干扰')
  if (authResults.length === 0) {
    lines.push('- 本轮未包含匿名认证页。')
  } else {
    if (authSuccessful.length > 0) {
      const authMetrics = averageMetrics(authSuccessful)
      lines.push(
        `- 认证页平均：Perf ${formatMetric(authMetrics.performance)}，LCP ${formatMetric(authMetrics.lcpMs, 'ms')}，TBT ${formatMetric(authMetrics.tbtMs, 'ms')}。`
      )
    } else {
      lines.push('- 认证页全部失败或未产出有效指标，需单独排查 challenge / 浏览器环境问题。')
    }
    if (challengeEntries.length > 0) {
      lines.push(
        `- 疑似第三方挑战干扰：${challengeEntries
          .map((entry) => `${entry.profile}:${entry.url}`)
          .join('，')}。相关结果应与内容页问题分开判断。`
      )
    } else {
      lines.push(
        '- 未捕获明确的 challenge/verification 信号，但认证页仍单独观察，不并入内容页共性结论。'
      )
    }
  }

  lines.push('')
  lines.push('## 6. P0 / P1 / P2 整改建议')
  lines.push(
    '- P0：先处理首页、帖子详情页和其他 LCP 最慢页面的首屏资源，重点优化首屏图片、关键 CSS、模块预加载与 hydration 阻塞。'
  )
  lines.push('- P1：清理跨页面未使用的 JavaScript / CSS，降低首页、列表页与认证页公共包体积。')
  lines.push(
    '- P2：针对 CLS 与 Best Practices 低分页面补稳定占位，并单独排查第三方脚本或浏览器控制台告警。'
  )

  const failed = summary.results.filter((entry) => entry.error)
  if (failed.length > 0) {
    lines.push('')
    lines.push('## 7. 失败 / 受限页面')
    for (const entry of failed) {
      lines.push(
        `- ${entry.profile}:${entry.url}：${entry.error
          .map((item) => `${item.runLabel} -> ${item.error}`)
          .join('；')}`
      )
    }
  }

  return `${lines.join('\n')}\n`
}
