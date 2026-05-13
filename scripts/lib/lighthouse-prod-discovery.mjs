import fs from 'node:fs'

import {
  DEFAULT_BASE,
  DEFAULT_URLS_FILE,
  DETAIL_PAGE_TARGETS,
  STATIC_ANONYMOUS_ROUTE_PATHS,
  compareAuditEntries,
  isAuditExcludedUrl,
  normalizeBase,
  normalizeManifestEntry,
  normalizePathname,
  pageTypeForUrl,
  readUrlManifestInput,
  toAbsoluteAuditUrl,
} from './lighthouse-prod-shared.mjs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

function isUuidV7(value) {
  return typeof value === 'string' && UUID_V7_RE.test(value)
}

function stripInlineComment(line) {
  const index = line.indexOf('#')
  return index === -1 ? line.trim() : line.slice(0, index).trim()
}

export function parseSitemapXml(xml) {
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/gisu)]
  return matches.map((match) => match[1].trim()).filter(Boolean)
}

export function parseRobotsTxt(robotsTxt) {
  const groups = []
  let agents = []
  let rules = []
  let seenRule = false

  const flushGroup = () => {
    if (agents.length === 0 && rules.length === 0) return
    groups.push({
      agents: [...agents],
      rules: [...rules],
    })
    agents = []
    rules = []
    seenRule = false
  }

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = stripInlineComment(rawLine)
    if (!line) continue

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    const value = line.slice(separatorIndex + 1).trim()

    if (key === 'user-agent') {
      if (seenRule) flushGroup()
      agents.push(value.toLowerCase())
      continue
    }

    if (key === 'allow' || key === 'disallow') {
      seenRule = true
      rules.push({ type: key, value })
    }
  }

  flushGroup()

  const disallowRules = groups
    .filter((group) => group.agents.includes('*'))
    .flatMap((group) =>
      group.rules
        .filter((rule) => rule.type === 'disallow' && rule.value.trim().length > 0)
        .map((rule) => rule.value.trim())
    )

  return {
    groups,
    disallowRules,
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isRobotsDisallowed(targetUrl, disallowRules = []) {
  if (!Array.isArray(disallowRules) || disallowRules.length === 0) return false

  const url = new URL(targetUrl)
  const pathAndQuery = `${normalizePathname(url.pathname)}${url.search}`

  return disallowRules.some((rule) => {
    const normalizedRule = rule.trim()
    if (!normalizedRule) return false

    const pattern = `^${escapeRegex(normalizedRule).replace(/\\\*/g, '.*')}`
    return new RegExp(pattern, 'i').test(pathAndQuery)
  })
}

function normalizeEnvelope(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload
  }

  if ('data' in payload && ('success' in payload || 'meta' in payload || 'pagination' in payload)) {
    const data = payload.data
    if (payload.pagination && typeof payload.pagination === 'object') {
      if (Array.isArray(data)) {
        return { items: data, ...payload.pagination }
      }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return { ...data, ...payload.pagination }
      }
    }
    return data
  }

  return payload
}

function extractItems(payload) {
  const normalized = normalizeEnvelope(payload)
  if (Array.isArray(normalized)) return normalized
  if (!normalized || typeof normalized !== 'object') return []

  if (Array.isArray(normalized.items)) return normalized.items
  if (Array.isArray(normalized.results)) return normalized.results
  if (Array.isArray(normalized.rows)) return normalized.rows
  if (Array.isArray(normalized.data)) return normalized.data
  return []
}

function uniqueByUrl(entries) {
  const deduped = new Map()
  for (const entry of entries) {
    if (!deduped.has(entry.url)) {
      deduped.set(entry.url, entry)
    }
  }
  return [...deduped.values()]
}

function createBaseEntry(url, options) {
  return {
    url,
    pageType: options.pageType ?? pageTypeForUrl(url),
    discoverySource: options.discoverySource,
    indexedInSitemap: Boolean(options.indexedInSitemap),
    robotsDisallowed: Boolean(options.robotsDisallowed),
    selectionReason: options.selectionReason,
  }
}

function mergeManifestEntry(existing, incoming) {
  return {
    ...incoming,
    ...existing,
    pageType: existing.pageType ?? incoming.pageType,
    discoverySource: existing.discoverySource ?? incoming.discoverySource,
    indexedInSitemap: Boolean(existing.indexedInSitemap || incoming.indexedInSitemap),
    robotsDisallowed: Boolean(existing.robotsDisallowed || incoming.robotsDisallowed),
    selectionReason: existing.selectionReason ?? incoming.selectionReason,
  }
}

function resolveAuditContractVersion() {
  const explicit =
    process.env.VITE_CLIENT_CONTRACT_VERSION?.trim() || process.env.CLIENT_CONTRACT_VERSION?.trim()
  if (explicit) return explicit

  try {
    const wrangler = fs.readFileSync('wrangler.toml', 'utf8')
    const match = wrangler.match(/^\s*VITE_CLIENT_CONTRACT_VERSION\s*=\s*"([^"]+)"/m)
    return match?.[1]?.trim() ?? ''
  } catch {
    return ''
  }
}

function buildAuditHeaders(accept) {
  const headers = {
    Accept: accept,
    'User-Agent': 'hmrchan-lighthouse-audit/1.0',
  }
  const contractVersion = resolveAuditContractVersion()
  if (contractVersion) {
    headers['X-Client-Contract-Version'] = contractVersion
  }
  return headers
}

async function fetchText(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: buildAuditHeaders('text/plain,application/xml,text/xml;q=0.9,*/*;q=0.8'),
  })

  if (!response.ok) {
    throw new Error(`请求失败 ${response.status}: ${url}`)
  }

  return response.text()
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: buildAuditHeaders('application/json,text/plain;q=0.8,*/*;q=0.5'),
  })

  if (!response.ok) {
    throw new Error(`请求失败 ${response.status}: ${url}`)
  }

  return response.json()
}

async function probeAuditUrl(
  url,
  fetchImpl,
  {
    accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    methods = ['HEAD', 'GET'],
  } = {}
) {
  const headers = buildAuditHeaders(accept)
  let lastResult = {
    ok: false,
    status: null,
    method: null,
    error: null,
  }

  for (const method of methods) {
    try {
      const response = await fetchImpl(url, {
        method,
        headers,
        redirect: 'follow',
      })
      lastResult = {
        ok: response.ok,
        status: response.status,
        method,
        error: null,
      }

      if (response.ok) return lastResult
      if (method === 'HEAD' && [405, 501].includes(response.status)) continue
      return lastResult
    } catch (err) {
      lastResult = {
        ok: false,
        status: null,
        method,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return lastResult
}

function resolveDetailApiUrl(targetUrl, base) {
  const url = new URL(targetUrl)
  const segments = normalizePathname(url.pathname).split('/').filter(Boolean)
  const id = segments.at(-1)
  if (!id) return null

  const pageType = pageTypeForUrl(targetUrl)
  const encodedId = encodeURIComponent(id)
  switch (pageType) {
    case 'author-detail':
      return `${base}/api/v1/authors/${encodedId}`
    case 'post-detail':
      return `${base}/api/v1/posts/${encodedId}`
    case 'discussion-detail':
      return `${base}/api/v1/discussions/${encodedId}`
    case 'schedule-detail':
      return `${base}/api/v1/schedules/${encodedId}`
    default:
      return null
  }
}

async function probeDetailDataUrl(entry, fetchImpl, base) {
  const detailApiUrl = resolveDetailApiUrl(entry.url, base)
  if (!detailApiUrl) {
    return {
      ok: true,
      url: entry.url,
      phase: 'page',
      status: null,
      method: null,
      error: null,
    }
  }

  const probe = await probeAuditUrl(detailApiUrl, fetchImpl, {
    accept: 'application/json,text/plain;q=0.8,*/*;q=0.5',
    methods: ['GET'],
  })

  return {
    ...probe,
    url: detailApiUrl,
    phase: 'detail-api',
  }
}

async function discoverEntityIds(fetchImpl, options) {
  const payload = await fetchJson(options.url, fetchImpl)
  const items = extractItems(payload)
  const ids = []

  for (const item of items) {
    const id = options.idSelector(item)
    if (typeof id !== 'string' || id.trim().length === 0) continue
    ids.push(id.trim())
  }

  return ids
}

function buildSelectionReason(pageType, source, index, totalRequired) {
  const slot = `${index + 1}/${totalRequired}`
  switch (source) {
    case 'sitemap':
      return '来自生产 sitemap 的公开匿名页面。'
    case 'route-whitelist':
      if (pageType === 'anonymous-auth') {
        return '匿名认证页不依赖 sitemap/SEO 收录，但纳入匿名可访问面审计。'
      }
      return '来自前端匿名公开路由白名单，用于补齐 sitemap 未覆盖页面。'
    case 'api-authors':
      return `代表性作者详情样本，来自公开 authors API（样本 ${slot}）。`
    case 'api-posts':
      return `代表性帖子详情样本，来自公开 posts API（样本 ${slot}）。`
    case 'api-discussions':
      return `代表性讨论详情样本，来自公开 discussions API（样本 ${slot}）。`
    case 'api-schedules':
      return `代表性日程详情样本，来自公开 schedules API（样本 ${slot}）。`
    case 'fallback-urls-file':
      return `未满足详情配额时，回退到现有 URL 清单补齐（样本 ${slot}）。`
    default:
      return '纳入 Lighthouse 审计覆盖。'
  }
}

function loadFallbackEntries({ base, fallbackUrlsFile, fallbackEntries }) {
  if (Array.isArray(fallbackEntries)) {
    return uniqueByUrl(fallbackEntries.map((entry) => normalizeManifestEntry(entry, base)))
  }

  if (!fallbackUrlsFile || !fs.existsSync(fallbackUrlsFile)) {
    return []
  }

  return readUrlManifestInput(fallbackUrlsFile, base)
}

function buildDetailFallbackBuckets(entries) {
  const buckets = new Map()
  for (const entry of entries) {
    const pageType = entry.pageType ?? pageTypeForUrl(entry.url)
    if (!DETAIL_PAGE_TARGETS[pageType]) continue
    const bucket = buckets.get(pageType) ?? []
    bucket.push(entry)
    buckets.set(pageType, bucket)
  }
  return buckets
}

export async function discoverAuditTargets({
  base = DEFAULT_BASE,
  fallbackUrlsFile = DEFAULT_URLS_FILE,
  fallbackEntries,
  fetchImpl = fetch,
} = {}) {
  const normalizedBase = normalizeBase(base)
  const sitemapUrl = `${normalizedBase}/sitemap.xml`
  const robotsUrl = `${normalizedBase}/robots.txt`

  const manifest = {
    generatedAt: new Date().toISOString(),
    base: normalizedBase,
    sitemapUrl,
    robotsUrl,
    entries: [],
    excluded: [],
    coverage: {
      detailTargets: { ...DETAIL_PAGE_TARGETS },
      gaps: [],
      sourceFailures: [],
      rejectedFallbacks: [],
      includedByPageType: {},
      indexedCount: 0,
      robotsDisallowedCount: 0,
    },
  }

  const entryMap = new Map()
  const excludedSet = new Set()
  const fallback = loadFallbackEntries({ base: normalizedBase, fallbackUrlsFile, fallbackEntries })
  const fallbackBuckets = buildDetailFallbackBuckets(fallback)

  let sitemapUrls = []
  let robotsRules = []

  const [sitemapResult, robotsResult] = await Promise.allSettled([
    fetchText(sitemapUrl, fetchImpl),
    fetchText(robotsUrl, fetchImpl),
  ])

  if (sitemapResult.status === 'fulfilled') {
    const parsedSitemapUrls = uniqueByUrl(
      parseSitemapXml(sitemapResult.value).map((url) => ({
        url: toAbsoluteAuditUrl(url, normalizedBase),
      }))
    ).map((entry) => entry.url)
    const baseOrigin = new URL(normalizedBase).origin
    sitemapUrls = parsedSitemapUrls.filter((url) => {
      if (new URL(url).origin === baseOrigin) return true
      manifest.excluded.push({
        url,
        pageType: pageTypeForUrl(url),
        reason: `生产 sitemap URL host 与审计 base 不一致，已从 ${normalizedBase} 审计中排除。`,
      })
      return false
    })
  } else {
    manifest.coverage.sourceFailures.push({
      source: 'sitemap',
      error:
        sitemapResult.reason instanceof Error
          ? sitemapResult.reason.message
          : String(sitemapResult.reason),
    })
  }

  if (robotsResult.status === 'fulfilled') {
    robotsRules = parseRobotsTxt(robotsResult.value).disallowRules
  } else {
    manifest.coverage.sourceFailures.push({
      source: 'robots',
      error:
        robotsResult.reason instanceof Error
          ? robotsResult.reason.message
          : String(robotsResult.reason),
    })
  }

  const sitemapSet = new Set(sitemapUrls)

  const rejectDetailSample = (entry, probe, source) => {
    manifest.coverage.rejectedFallbacks.push({
      url: entry.url,
      pageType: entry.pageType,
      source,
      status: probe.status,
      method: probe.method,
      error: probe.error,
      phase: probe.phase ?? 'page',
      probeUrl: probe.url ?? entry.url,
      reason:
        probe.phase === 'detail-api'
          ? '详情 API 存活校验未通过，未纳入 Lighthouse manifest。'
          : '回退详情 URL 存活校验未通过，未纳入 Lighthouse manifest。',
    })
  }

  const rejectInvalidPostSample = (entry, source, reason) => {
    manifest.coverage.rejectedFallbacks.push({
      url: entry.url,
      pageType: entry.pageType,
      source,
      status: null,
      method: null,
      error: null,
      phase: 'strict-uuidv7-contract',
      probeUrl: entry.url,
      reason,
    })
  }

  const addEntry = (entryLike) => {
    const normalized = normalizeManifestEntry(entryLike, normalizedBase)

    if (isAuditExcludedUrl(normalized.url)) {
      if (!excludedSet.has(normalized.url)) {
        excludedSet.add(normalized.url)
        manifest.excluded.push({
          url: normalized.url,
          pageType: normalized.pageType,
          reason: '命中鉴权/排除路径规则，不纳入匿名可访问面审计。',
        })
      }
      return false
    }

    const entry = {
      ...normalized,
      indexedInSitemap: Boolean(normalized.indexedInSitemap || sitemapSet.has(normalized.url)),
      robotsDisallowed: Boolean(
        normalized.robotsDisallowed || isRobotsDisallowed(normalized.url, robotsRules)
      ),
    }

    const existing = entryMap.get(entry.url)
    if (existing) {
      entryMap.set(entry.url, mergeManifestEntry(existing, entry))
      return false
    }

    entryMap.set(entry.url, entry)
    return true
  }

  for (const url of sitemapUrls) {
    addEntry(
      createBaseEntry(url, {
        pageType: pageTypeForUrl(url),
        discoverySource: 'sitemap',
        indexedInSitemap: true,
        robotsDisallowed: isRobotsDisallowed(url, robotsRules),
        selectionReason: buildSelectionReason(pageTypeForUrl(url), 'sitemap', 0, 0),
      })
    )
  }

  for (const routePath of STATIC_ANONYMOUS_ROUTE_PATHS) {
    const url = toAbsoluteAuditUrl(routePath, normalizedBase)
    addEntry(
      createBaseEntry(url, {
        pageType: pageTypeForUrl(url),
        discoverySource: 'route-whitelist',
        indexedInSitemap: sitemapSet.has(url),
        robotsDisallowed: isRobotsDisallowed(url, robotsRules),
        selectionReason: buildSelectionReason(pageTypeForUrl(url), 'route-whitelist', 0, 0),
      })
    )
  }

  const detailDiscoveryPlans = [
    {
      pageType: 'author-detail',
      source: 'api-authors',
      limit: DETAIL_PAGE_TARGETS['author-detail'],
      url: `${normalizedBase}/api/v1/authors?limit=10`,
      toUrl: (id) => `${normalizedBase}/profile/${id}`,
      idSelector: (item) => item?.id ?? item?.uuid ?? item?.author_id ?? null,
    },
    {
      pageType: 'post-detail',
      source: 'api-posts',
      limit: DETAIL_PAGE_TARGETS['post-detail'],
      url: `${normalizedBase}/api/v1/posts?limit=10`,
      toUrl: (id) => `${normalizedBase}/posts/${id}`,
      idSelector: (item) => item?.id ?? item?.uuid ?? null,
    },
    {
      pageType: 'discussion-detail',
      source: 'api-discussions',
      limit: DETAIL_PAGE_TARGETS['discussion-detail'],
      url: `${normalizedBase}/api/v1/discussions?limit=10`,
      toUrl: (id) => `${normalizedBase}/community/discussions/${id}`,
      idSelector: (item) => item?.id ?? item?.uuid ?? null,
    },
    {
      pageType: 'schedule-detail',
      source: 'api-schedules',
      limit: DETAIL_PAGE_TARGETS['schedule-detail'],
      url: `${normalizedBase}/api/v1/schedules?limit=10`,
      toUrl: (id) => `${normalizedBase}/schedule/${id}`,
      idSelector: (item) => item?.id ?? item?.uuid ?? null,
    },
  ]

  const detailResults = await Promise.allSettled(
    detailDiscoveryPlans.map((plan) => discoverEntityIds(fetchImpl, plan))
  )

  for (let index = 0; index < detailDiscoveryPlans.length; index += 1) {
    const plan = detailDiscoveryPlans[index]
    const result = detailResults[index]
    const required = DETAIL_PAGE_TARGETS[plan.pageType]

    if (result.status === 'fulfilled') {
      for (const id of result.value) {
        const currentCount = [...entryMap.values()].filter(
          (entry) => entry.pageType === plan.pageType
        ).length
        if (currentCount >= required) break

        const url = toAbsoluteAuditUrl(plan.toUrl(id), normalizedBase)
        const entry = createBaseEntry(url, {
          pageType: plan.pageType,
          discoverySource: plan.source,
          indexedInSitemap: sitemapSet.has(url),
          robotsDisallowed: isRobotsDisallowed(url, robotsRules),
          selectionReason: buildSelectionReason(plan.pageType, plan.source, currentCount, required),
        })
        if (plan.pageType === 'post-detail' && isUuid(id) && !isUuidV7(id)) {
          rejectInvalidPostSample(
            entry,
            plan.source,
            'Legacy UUIDv4 post residual blocked by strict UUIDv7 discovery contract.'
          )
          continue
        }
        const pageProbe = await probeAuditUrl(entry.url, fetchImpl)
        if (!pageProbe.ok) {
          rejectDetailSample(
            entry,
            { ...pageProbe, url: entry.url, phase: 'page' },
            plan.source
          )
          continue
        }
        const probe = await probeDetailDataUrl(entry, fetchImpl, normalizedBase)
        if (!probe.ok) {
          rejectDetailSample(entry, probe, plan.source)
          continue
        }
        addEntry(entry)
      }
    } else {
      manifest.coverage.sourceFailures.push({
        source: plan.source,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }

    let currentCount = [...entryMap.values()].filter(
      (entry) => entry.pageType === plan.pageType
    ).length
    const bucket = fallbackBuckets.get(plan.pageType) ?? []

    for (const candidate of bucket) {
      if (currentCount >= required) break
      const entry = {
        ...candidate,
        discoverySource: candidate.discoverySource ?? 'fallback-urls-file',
        selectionReason:
          candidate.selectionReason ??
          buildSelectionReason(plan.pageType, 'fallback-urls-file', currentCount, required),
        indexedInSitemap: Boolean(candidate.indexedInSitemap || sitemapSet.has(candidate.url)),
        robotsDisallowed: Boolean(
          candidate.robotsDisallowed || isRobotsDisallowed(candidate.url, robotsRules)
        ),
      }
      const pageProbe = await probeAuditUrl(entry.url, fetchImpl)
      if (!pageProbe.ok) {
        rejectDetailSample(
          entry,
          { ...pageProbe, url: entry.url, phase: 'page' },
          entry.discoverySource
        )
        continue
      }
      const detailProbe = await probeDetailDataUrl(entry, fetchImpl, normalizedBase)
      if (!detailProbe.ok) {
        rejectDetailSample(entry, detailProbe, entry.discoverySource)
        continue
      }

      const added = addEntry(entry)

      if (added) currentCount += 1
    }

    const actual = [...entryMap.values()].filter((entry) => entry.pageType === plan.pageType).length
    if (actual < required) {
      manifest.coverage.gaps.push({
        pageType: plan.pageType,
        required,
        actual,
        missing: required - actual,
      })
    }
  }

  manifest.entries = [...entryMap.values()].sort(compareAuditEntries)

  for (const entry of manifest.entries) {
    manifest.coverage.includedByPageType[entry.pageType] =
      (manifest.coverage.includedByPageType[entry.pageType] ?? 0) + 1
    if (entry.indexedInSitemap) manifest.coverage.indexedCount += 1
    if (entry.robotsDisallowed) manifest.coverage.robotsDisallowedCount += 1
  }

  return manifest
}
