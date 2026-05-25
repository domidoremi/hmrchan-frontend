import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult, AuditStatus } from './types'

const BASELINE_LOCALE = 'zh-CN'
const LOCALES_DIR = 'src/i18n/locales'
const INLINE_I18N_FILE = 'src/i18n/index.ts'

type NestedRecord = { [key: string]: string | NestedRecord }

interface LocaleCatalog {
  localeMap: Map<string, Set<string>>
  sourceKind: 'json' | 'inline'
  sourcePath: string
}

/**
 * Recursively extract all dot-separated keys from a nested JSON object.
 */
function extractKeys(obj: NestedRecord, prefix = ''): Set<string> {
  const keys = new Set<string>()
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const k of extractKeys(value as NestedRecord, fullKey)) {
        keys.add(k)
      }
    } else {
      keys.add(fullKey)
    }
  }
  return keys
}

/**
 * Load locale JSON files when present, otherwise read the current inline messages map.
 */
async function loadLocales(projectRoot: string): Promise<LocaleCatalog> {
  const localesPath = join(projectRoot, LOCALES_DIR)
  const localeMap = new Map<string, Set<string>>()

  if (!existsSync(localesPath)) {
    return {
      localeMap: await loadInlineLocales(projectRoot),
      sourceKind: 'inline',
      sourcePath: INLINE_I18N_FILE,
    }
  }

  const files = await readdir(localesPath)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const locale = file.replace('.json', '')
    const content = await readFile(join(localesPath, file), 'utf-8')
    try {
      const json = JSON.parse(content) as NestedRecord
      localeMap.set(locale, extractKeys(json))
    } catch {
      // Will be reported as an issue
      localeMap.set(locale, new Set())
    }
  }

  if (localeMap.size > 0) {
    return { localeMap, sourceKind: 'json', sourcePath: LOCALES_DIR }
  }

  return {
    localeMap: await loadInlineLocales(projectRoot),
    sourceKind: 'inline',
    sourcePath: INLINE_I18N_FILE,
  }
}

async function loadInlineLocales(projectRoot: string): Promise<Map<string, Set<string>>> {
  const filePath = join(projectRoot, INLINE_I18N_FILE)
  const localeMap = new Map<string, Set<string>>()
  if (!existsSync(filePath)) return localeMap

  const lines = (await readFile(filePath, 'utf-8')).split(/\r?\n/)
  const stack: Array<{ key: string; indent: number }> = []
  let insideMessages = false

  for (const line of lines) {
    if (!insideMessages) {
      if (/^const messages\s*=\s*\{\s*$/.test(line)) insideMessages = true
      continue
    }

    if (/^\}\s*$/.test(line)) break

    const match = line.match(/^(\s*)(['"]?[\w-]+['"]?)\s*:\s*(.*)$/)
    if (!match) continue

    const indent = match[1].length
    const key = match[2].replace(/^['"]|['"]$/g, '')
    const valueStart = match[3].trim()

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (valueStart.startsWith('{')) {
      stack.push({ key, indent })
      if (stack.length === 1 && !localeMap.has(key)) {
        localeMap.set(key, new Set())
      }
      continue
    }

    const locale = stack[0]?.key
    if (!locale) continue

    const path = [...stack.slice(1).map((entry) => entry.key), key].join('.')
    localeMap.get(locale)?.add(path)
  }

  return localeMap
}

/**
 * Compare locale keys against the baseline, returning missing and extra keys.
 */
function compareKeys(
  baselineKeys: Set<string>,
  localeKeys: Set<string>
): { missing: string[]; extra: string[] } {
  const missing: string[] = []
  const extra: string[] = []

  for (const key of baselineKeys) {
    if (!localeKeys.has(key)) missing.push(key)
  }
  for (const key of localeKeys) {
    if (!baselineKeys.has(key)) extra.push(key)
  }

  return { missing: missing.sort(), extra: extra.sort() }
}

/**
 * Recursively find all .vue files under a directory.
 */
async function findVueFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
      results.push(...(await findVueFiles(fullPath)))
    } else if (entry.name.endsWith('.vue')) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * Check if a string looks like a valid i18n key (e.g. "nav.home", "common.loading").
 * Filters out false positives from import(), emit(), querySelector(), etc.
 */
function isLikelyI18nKey(key: string): boolean {
  // Must contain at least one dot (i18n keys are namespaced)
  if (!key.includes('.')) return false
  // Must only contain word chars, dots, and hyphens
  if (!/^[\w.:-]+$/.test(key)) return false
  // Exclude file paths and imports
  if (key.includes('/') || key.endsWith('.vue') || key.endsWith('.ts') || key.endsWith('.js'))
    return false
  // Exclude CSS selectors
  if (key.startsWith('.') || key.startsWith('#')) return false
  return true
}

/**
 * Extract i18n keys used in Vue files via $t('...') and t('...') calls.
 */
async function extractUsedKeys(projectRoot: string): Promise<Set<string>> {
  const srcDir = join(projectRoot, 'src')
  const vueFiles = await findVueFiles(srcDir)
  const usedKeys = new Set<string>()

  // Match $t('key') / $t("key") — always an i18n call
  const dollarTPattern = /\$t\(\s*['"]([^'"]+)['"]/g
  // Match standalone t('key') / t("key") — only when preceded by a word boundary
  // (avoids matching import(), emit(), getElement(), etc.)
  const tPattern = /(?<![.\w])t\(\s*['"]([^'"]+)['"]/g

  for (const file of vueFiles) {
    const content = await readFile(file, 'utf-8')

    let match: RegExpExecArray | null
    while ((match = dollarTPattern.exec(content)) !== null) {
      const key = match[1]
      if (isLikelyI18nKey(key)) usedKeys.add(key)
    }
    dollarTPattern.lastIndex = 0

    while ((match = tPattern.exec(content)) !== null) {
      const key = match[1]
      if (isLikelyI18nKey(key)) usedKeys.add(key)
    }
    tPattern.lastIndex = 0
  }

  return usedKeys
}

const i18nAudit: AuditModule = {
  name: 'i18n',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []

    // 1. Load locale keys
    const { localeMap, sourceKind, sourcePath } = await loadLocales(options.projectRoot)

    if (localeMap.size === 0) {
      return {
        module: 'i18n',
        status: 'fail',
        issues: [
          {
            severity: 'error',
            message: `No locale files found in ${LOCALES_DIR} and no inline messages found in ${INLINE_I18N_FILE}`,
          },
        ],
        summary: 'No locale messages found',
        duration: Date.now() - start,
      }
    }

    const baselineKeys = localeMap.get(BASELINE_LOCALE)
    if (!baselineKeys) {
      return {
        module: 'i18n',
        status: 'fail',
        issues: [
          {
            severity: 'error',
            message: `Baseline locale "${BASELINE_LOCALE}" not found in ${sourcePath}`,
          },
        ],
        summary: `Baseline locale ${BASELINE_LOCALE} missing`,
        duration: Date.now() - start,
      }
    }

    // 2. Compare each locale against baseline
    for (const [locale, keys] of localeMap) {
      if (locale === BASELINE_LOCALE) continue

      const { missing, extra } = compareKeys(baselineKeys, keys)

      for (const key of missing) {
        issues.push({
          severity: 'error',
          message: `Missing key "${key}" in locale "${locale}"`,
          file: sourceKind === 'json' ? `${LOCALES_DIR}/${locale}.json` : sourcePath,
          rule: 'missing-key',
        })
      }

      for (const key of extra) {
        issues.push({
          severity: 'warning',
          message: `Extra key "${key}" in locale "${locale}" (not in ${BASELINE_LOCALE})`,
          file: sourceKind === 'json' ? `${LOCALES_DIR}/${locale}.json` : sourcePath,
          rule: 'extra-key',
        })
      }
    }

    // 3. Scan .vue files for used keys and check against all locales
    const usedKeys = await extractUsedKeys(options.projectRoot)
    const allLocaleNames = [...localeMap.keys()]

    for (const key of usedKeys) {
      for (const locale of allLocaleNames) {
        const keys = localeMap.get(locale)!
        // Check if the key or any parent prefix exists (for dynamic sub-keys like `schedule.categories.${x}`)
        if (!keys.has(key) && !hasParentPrefix(keys, key)) {
          issues.push({
            severity: 'warning',
            message: `Key "${key}" used in templates but missing in locale "${locale}"`,
            rule: 'unused-template-key',
          })
        }
      }
    }

    // Determine status
    const errorCount = issues.filter((i) => i.severity === 'error').length
    const warningCount = issues.filter((i) => i.severity === 'warning').length

    let status: AuditStatus = 'pass'
    if (errorCount > 0) status = 'fail'
    else if (warningCount > 0) status = 'warn'

    const summary =
      status === 'pass'
        ? 'All locale messages are consistent'
        : `Found ${errorCount} error(s) and ${warningCount} warning(s) across ${localeMap.size} locales`

    if (options.verbose && issues.length > 0) {
      for (const issue of issues) {
        const loc = issue.file ? ` (${issue.file})` : ''
        console.log(`    [${issue.rule}] ${issue.message}${loc}`)
      }
    }

    return {
      module: 'i18n',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

/**
 * Check if any key in the set is a prefix of the given key.
 * This handles dynamic sub-keys like `schedule.categories.${category}`.
 */
function hasParentPrefix(keys: Set<string>, key: string): boolean {
  const parts = key.split('.')
  for (let i = 1; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('.')
    // If the prefix itself is a key pointing to an object, the sub-key may be dynamic
    if (keys.has(prefix)) return false // prefix is a leaf, not an object
  }
  // Check if any key in the set starts with the key as prefix (meaning it's a valid namespace)
  for (const k of keys) {
    if (k.startsWith(key + '.')) return true
  }
  return false
}

export default i18nAudit
