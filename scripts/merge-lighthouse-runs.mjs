#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const LEGACY_RUN_DIRS = ['.lighthouse-prod-full', '.lighthouse-prod-run2', '.lighthouse-prod-run3']
const DEFAULT_ROOT_DIR = '.lighthouse-prod'
const DEFAULT_OUTPUT_DIR = DEFAULT_ROOT_DIR

function parseArgs(argv) {
  const options = {
    runs: null,
    output: DEFAULT_OUTPUT_DIR,
    manifest: null,
    root: DEFAULT_ROOT_DIR,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--runs') {
      options.runs = argv[++index]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    } else if (arg === '--output') {
      options.output = argv[++index]
    } else if (arg === '--root') {
      options.root = argv[++index]
    } else if (arg === '--manifest') {
      options.manifest = argv[++index]
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`未知参数: ${arg}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`
用法:
  node scripts/merge-lighthouse-runs.cjs --root .lighthouse-prod --output .lighthouse-prod

参数:
  --runs      逗号分隔的 run 目录列表；未传时优先自动发现 <root>/runs/run-*，再回退兼容旧版目录
  --root      审计根目录，默认 .lighthouse-prod；用于自动发现 runs 与 manifest
  --manifest  可选的 URL manifest 文件，用于补充 pageType / discovery metadata；未传时优先读取 <root>/url-manifest.json
  --output    输出目录，默认 .lighthouse-prod
`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function resolveRunSummary(runDir) {
  const directSummaryPath = path.join(runDir, 'summary.json')
  if (fs.existsSync(directSummaryPath)) {
    return readJson(directSummaryPath)
  }

  const profileSummaries = ['mobile', 'desktop']
    .map((profile) => path.join(runDir, profile, 'summary.json'))
    .filter((summaryPath) => fs.existsSync(summaryPath))
    .map((summaryPath) => readJson(summaryPath))

  if (profileSummaries.length === 0) {
    throw new Error(`未找到 summary.json：${runDir}`)
  }

  return {
    generatedAt: new Date().toISOString(),
    runId: path.basename(runDir),
    base: profileSummaries[0].base,
    profiles: [...new Set(profileSummaries.flatMap((summary) => summary.profiles ?? []))],
    urlCount: new Set(
      profileSummaries.flatMap((summary) => (summary.results ?? []).map((entry) => entry.url))
    ).size,
    results: profileSummaries.flatMap((summary) => summary.results ?? []),
  }
}

function resolveRunDirs(options) {
  if (Array.isArray(options.runs) && options.runs.length > 0) {
    return options.runs.map((runDir) => path.resolve(runDir))
  }

  const runsDir = path.resolve(options.root, 'runs')
  if (fs.existsSync(runsDir)) {
    const discovered = fs
      .readdirSync(runsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^run-\d+$/i.test(entry.name))
      .map((entry) => path.join(runsDir, entry.name))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

    if (discovered.length > 0) {
      return discovered
    }
  }

  return LEGACY_RUN_DIRS.map((runDir) => path.resolve(runDir)).filter((runDir) =>
    fs.existsSync(runDir)
  )
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const { createAggregateAnalysis, mergeRunSummaries } =
    await import('./lib/lighthouse-prod-aggregate.mjs')

  const runDirs = resolveRunDirs(options)
  if (runDirs.length === 0) {
    throw new Error('未发现可聚合的 Lighthouse run 目录')
  }

  const runSummaries = runDirs.map((runDir) => {
    const summary = resolveRunSummary(runDir)
    return {
      ...summary,
      runId: summary.runId ?? path.basename(runDir),
    }
  })

  const manifestPath = path.resolve(
    options.manifest ?? path.join(options.root, 'url-manifest.json')
  )
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null
  const merged = mergeRunSummaries({
    runSummaries,
    manifest,
  })

  const outputDir = path.resolve(options.output)
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(merged, null, 2))
  fs.writeFileSync(path.join(outputDir, 'analysis.md'), createAggregateAnalysis(merged))
  console.log(`wrote ${outputDir}`)
}

main().catch((error) => {
  console.error(`❌ 聚合失败：${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
