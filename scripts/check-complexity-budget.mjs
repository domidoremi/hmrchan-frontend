import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  analyzeComplexityBudget,
  collectComplexityMetrics,
  formatComplexityBudgetReport,
} from './lib/complexity-budget.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const budgetPath = path.resolve(
  rootDir,
  process.env.COMPLEXITY_BUDGET_FILE ?? 'scripts/config/complexity-budget.json'
)

if (!existsSync(budgetPath)) {
  console.error(`[complexity-budget] budget config not found: ${budgetPath}`)
  process.exit(1)
}

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))
const metrics = collectComplexityMetrics({ rootDir })
const result = analyzeComplexityBudget(metrics, budget)

console.log(formatComplexityBudgetReport(result))

if (result.status !== 'passed') {
  process.exit(1)
}
