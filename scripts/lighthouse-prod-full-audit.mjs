#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  DEFAULT_BASE,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_URLS_FILE,
  ensureDirectory,
  normalizeBase,
} from './lib/lighthouse-prod-shared.mjs'
import { discoverAuditTargets } from './lib/lighthouse-prod-discovery.mjs'
import { mergeRunSummaries, createAggregateAnalysis } from './lib/lighthouse-prod-aggregate.mjs'

const DEFAULT_RUNS = 3

function parseArgs(argv) {
  const options = {
    base: DEFAULT_BASE,
    output: DEFAULT_OUTPUT_DIR,
    urlsFile: DEFAULT_URLS_FILE,
    runs: DEFAULT_RUNS,
    discoverOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--base') options.base = argv[++index]
    else if (arg === '--output') options.output = argv[++index]
    else if (arg === '--urls-file') options.urlsFile = argv[++index]
    else if (arg === '--runs') options.runs = Number(argv[++index])
    else if (arg === '--discover-only') options.discoverOnly = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else throw new Error(`未知参数: ${arg}`)
  }

  if (!Number.isInteger(options.runs) || options.runs <= 0) {
    throw new Error(`--runs 必须是正整数，收到: ${options.runs}`)
  }

  return options
}

function printHelp() {
  console.log(`
用法:
  node scripts/lighthouse-prod-full-audit.mjs --base https://momichan.com --output .lighthouse-prod --runs 3

参数:
  --base           目标站点基础地址，默认 https://momichan.com
  --output         输出目录，默认 .lighthouse-prod
  --urls-file      现有兜底 URL 清单，默认 scripts/config/lighthouse-prod-urls.json
  --runs           重复轮次，默认 3
  --discover-only  仅生成匿名可访问面 manifest，不执行 Lighthouse
`)
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
    .sort(
      (left, right) =>
        left.url.localeCompare(right.url) || left.profile.localeCompare(right.profile)
    )

  const combined = {
    generatedAt: new Date().toISOString(),
    runId,
    base,
    profiles: [...new Set(profiles)],
    urlCount: new Set(results.map((entry) => entry.url)).size,
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
      [
        '--base',
        base,
        '--profile',
        'mobile',
        '--urls-file',
        manifestPath,
        '--output',
        mobileDir,
        '--run-id',
        runId,
      ],
      `[${runId} mobile]`
    ),
    runNodeScript(
      path.resolve('scripts', 'lighthouse-prod-audit.mjs'),
      [
        '--base',
        base,
        '--profile',
        'desktop',
        '--urls-file',
        manifestPath,
        '--output',
        desktopDir,
        '--run-id',
        runId,
      ],
      `[${runId} desktop]`
    ),
  ])

  const mobileSummary = JSON.parse(fs.readFileSync(path.join(mobileDir, 'summary.json'), 'utf8'))
  const desktopSummary = JSON.parse(fs.readFileSync(path.join(desktopDir, 'summary.json'), 'utf8'))
  return combineProfileSummaries(runId, runDir, [mobileSummary, desktopSummary])
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
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
  if ((manifest.coverage.rejectedFallbacks ?? []).length > 0) {
    console.warn(
      `⚠️ 已剔除失效详情样本：${manifest.coverage.rejectedFallbacks
        .map((item) => `${item.pageType} ${item.status ?? item.error ?? 'unknown'}`)
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

main().catch((error) => {
  console.error(`❌ 执行失败：${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
