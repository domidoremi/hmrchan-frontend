import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(rootDir, 'scripts', 'type-check-baseline.json')
const vueTscPath = path.join(rootDir, 'node_modules', 'vue-tsc', 'bin', 'vue-tsc.js')
const tscPath = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc')

const projects = [
  { name: 'app', executable: vueTscPath, config: 'tsconfig.app.json' },
  { name: 'vitest', executable: vueTscPath, config: 'tsconfig.vitest.json' },
  { name: 'node', executable: tscPath, config: 'tsconfig.node.json' },
]

const args = new Set(process.argv.slice(2))
const updateBaseline = args.delete('--update-baseline')
const full = args.delete('--full')

if (args.size > 0 || (updateBaseline && full)) {
  console.error('Usage: node scripts/type-check.mjs [--full | --update-baseline]')
  process.exit(2)
}

function normalizePath(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath)
  const relativePath = path.relative(rootDir, absolutePath)
  return relativePath.split(path.sep).join('/')
}

function parseDiagnostics(output) {
  const normalizedOutput = output
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()

  if (!normalizedOutput) return []

  const diagnostics = []
  let current = null

  const pushCurrent = () => {
    if (!current) return
    current.message = current.message.trimEnd()
    diagnostics.push(current)
    current = null
  }

  for (const line of normalizedOutput.split('\n')) {
    const fileMatch = line.match(/^(.*?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.*)$/)
    const globalMatch = line.match(/^error\s+(TS\d+):\s*(.*)$/)

    if (fileMatch) {
      pushCurrent()
      current = {
        file: normalizePath(fileMatch[1]),
        line: Number(fileMatch[2]),
        column: Number(fileMatch[3]),
        code: fileMatch[4],
        message: fileMatch[5],
      }
    } else if (globalMatch) {
      pushCurrent()
      current = {
        code: globalMatch[1],
        message: globalMatch[2],
      }
    } else if (current) {
      current.message += `\n${line}`
    }
  }

  pushCurrent()
  return diagnostics.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right), 'en')
  )
}

function formatDiagnostic(diagnostic) {
  const location = diagnostic.file
    ? `${diagnostic.file}(${diagnostic.line},${diagnostic.column}): `
    : ''
  return `${location}error ${diagnostic.code}: ${diagnostic.message}`
}

function runProject(project) {
  const result = spawnSync(
    process.execPath,
    [project.executable, '-p', project.config, '--noEmit', '--pretty', 'false'],
    {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }
  )

  if (result.error) throw result.error

  const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
  const diagnostics = parseDiagnostics(output)

  if (result.status !== 0 && diagnostics.length === 0) {
    console.error(`[type-check] ${project.name} failed without TypeScript diagnostics.`)
    if (output.trim()) console.error(output.trim())
    process.exit(result.status ?? 1)
  }

  return diagnostics
}

function diagnosticCounts(results) {
  return Object.fromEntries(
    Object.entries(results).map(([name, diagnostics]) => [name, diagnostics.length])
  )
}

const results = Object.fromEntries(projects.map((project) => [project.name, runProject(project)]))
const counts = diagnosticCounts(results)
const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

if (full) {
  for (const project of projects) {
    for (const diagnostic of results[project.name]) {
      console.error(`[${project.name}] ${formatDiagnostic(diagnostic)}`)
    }
  }
  console.log(`[type-check] Full check found ${total} diagnostic(s): ${JSON.stringify(counts)}.`)
  process.exit(total === 0 ? 0 : 1)
}

if (updateBaseline) {
  const baseline = {
    version: 1,
    policy: 'Exact normalized diagnostics; any added, changed, or resolved entry fails.',
    projects: results,
  }
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
  console.log(
    `[type-check] Wrote ${total} existing diagnostic(s) to ${normalizePath(baselinePath)}: ${JSON.stringify(counts)}.`
  )
  process.exit(0)
}

let baseline
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
} catch (error) {
  console.error(
    `[type-check] Unable to read ${normalizePath(baselinePath)}: ${error instanceof Error ? error.message : String(error)}`
  )
  console.error(
    '[type-check] Inspect the full diagnostics, then create the baseline with --update-baseline.'
  )
  process.exit(1)
}

let matches = baseline.version === 1

for (const project of projects) {
  const expected = baseline.projects?.[project.name]
  const actual = results[project.name]
  if (JSON.stringify(expected) === JSON.stringify(actual)) continue

  matches = false
  const expectedSet = new Set((expected ?? []).map((item) => JSON.stringify(item)))
  const actualSet = new Set(actual.map((item) => JSON.stringify(item)))
  const added = actual.filter((item) => !expectedSet.has(JSON.stringify(item)))
  const removed = (expected ?? []).filter((item) => !actualSet.has(JSON.stringify(item)))

  console.error(`[type-check] ${project.name} diagnostic baseline changed.`)
  for (const diagnostic of added) {
    console.error(`NEW: ${formatDiagnostic(diagnostic)}`)
  }
  for (const diagnostic of removed) {
    console.error(`RESOLVED_OR_CHANGED: ${formatDiagnostic(diagnostic)}`)
  }
}

if (!matches) {
  console.error(
    '[type-check] Baseline mismatch. Fix new diagnostics; update the baseline only after intentional debt changes are reviewed.'
  )
  process.exit(1)
}

console.log(
  `[type-check] Current diagnostics exactly match the reviewed baseline (${total}): ${JSON.stringify(counts)}.`
)
