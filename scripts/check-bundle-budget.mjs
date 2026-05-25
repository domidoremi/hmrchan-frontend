import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  analyzeBundleBudget,
  collectBundleBudgetMetrics,
  formatBundleBudgetReport,
} from './lib/bundle-budget.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.resolve(rootDir, process.env.BUNDLE_BUDGET_DIST_DIR ?? 'dist')
const budgetPath = path.resolve(
  rootDir,
  process.env.BUNDLE_BUDGET_FILE ?? 'scripts/config/bundle-budget.json'
)

if (!existsSync(distDir)) {
  console.error(`[bundle-budget] dist directory not found: ${distDir}`)
  console.error('[bundle-budget] Run `bun run build` before checking the bundle budget.')
  process.exit(1)
}

if (!existsSync(budgetPath)) {
  console.error(`[bundle-budget] budget config not found: ${budgetPath}`)
  process.exit(1)
}

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))
const metrics = collectBundleBudgetMetrics({ distDir })
const result = analyzeBundleBudget(metrics, budget)

console.log(formatBundleBudgetReport(result))

if (result.status !== 'passed') {
  process.exit(1)
}
