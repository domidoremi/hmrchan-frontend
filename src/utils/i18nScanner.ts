/**
 * i18n 扫描工具
 * 用于检测硬编码文本和验证 i18n 键值命名规范
 */

/**
 * i18n 键值命名规范
 * 格式: category.subcategory.key
 * 例如: page.home.title, common.button.save, error.network.timeout
 */

// 标准的 i18n 键值前缀
export const I18N_KEY_PREFIXES = [
  'app',
  'nav',
  'platform',
  'post',
  'posts',
  'search',
  'filter',
  'auth',
  'favorite',
  'settings',
  'common',
  'author',
  'profile',
  'access',
  'upload',
  'error',
  'errors',
  'aria',
  'cookies',
  'preferences',
  'offline',
  'privacy',
] as const

export type I18nKeyPrefix = (typeof I18N_KEY_PREFIXES)[number]

/**
 * 验证 i18n 键值是否符合命名规范
 */
export function validateI18nKey(key: string): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // 检查是否为空
  if (!key || key.trim() === '') {
    issues.push('Key is empty')
    return { valid: false, issues }
  }

  // 检查格式: category.subcategory.key
  const parts = key.split('.')
  if (parts.length < 2) {
    issues.push('Key should have at least 2 parts (category.key)')
  }

  // 检查是否使用标准前缀
  const prefix = parts[0] as I18nKeyPrefix
  if (!I18N_KEY_PREFIXES.includes(prefix)) {
    issues.push(`Unknown prefix "${prefix}". Should be one of: ${I18N_KEY_PREFIXES.join(', ')}`)
  }

  // 检查命名规范: camelCase
  const invalidParts = parts.filter((part) => {
    // 允许 camelCase 和 kebab-case
    return !/^[a-z][a-zA-Z0-9-]*$/.test(part)
  })

  if (invalidParts.length > 0) {
    issues.push(`Invalid naming: ${invalidParts.join(', ')}. Use camelCase or kebab-case`)
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * 建议的 i18n 键值（基于文本内容）
 */
export function suggestI18nKey(text: string, context?: string): string {
  // 清理文本
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')

  // 根据上下文推荐前缀
  let prefix = 'common'

  if (context) {
    const contextLower = context.toLowerCase()
    if (contextLower.includes('button')) prefix = 'common'
    else if (contextLower.includes('error')) prefix = 'error'
    else if (contextLower.includes('nav')) prefix = 'nav'
    else if (contextLower.includes('auth') || contextLower.includes('login')) prefix = 'auth'
    else if (contextLower.includes('post')) prefix = 'post'
    else if (contextLower.includes('setting')) prefix = 'settings'
  }

  // 截断过长的键值
  const maxLength = 30
  const truncated = cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned

  return `${prefix}.${truncated}`
}

/**
 * 检测可能的硬编码文本
 * 注意: 这是一个简单的启发式检测，可能有误报
 */
export function detectHardcodedText(code: string): Array<{
  text: string
  line: number
  column: number
  suggestion: string
}> {
  const results: Array<{
    text: string
    line: number
    column: number
    suggestion: string
  }> = []

  // 匹配模板字符串中的文本
  // 排除: $t(), {{ $t() }}, v-bind, :, @, 数字, 单个字符
  const patterns = [
    // Vue 模板中的文本
    />([A-Z][a-zA-Z\s]{3,})</g,
    // 字符串字面量（排除 i18n 调用）
    /['"]([A-Z][a-zA-Z\s]{3,})['"]/g,
  ]

  const lines = code.split('\n')

  lines.forEach((line, lineIndex) => {
    // 跳过包含 $t 或 t( 的行（已经使用 i18n）
    if (line.includes('$t(') || line.includes('t(') || line.includes('useI18n')) {
      return
    }

    // 跳过注释
    if (
      line.trim().startsWith('//') ||
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*')
    ) {
      return
    }

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1]?.trim()
        if (!text) continue

        // 过滤掉一些常见的非文本内容
        if (
          /^\d+$/.test(text) || // 纯数字
          text.length < 3 || // 太短
          /^[A-Z_]+$/.test(text) || // 常量名
          /^[a-z]+$/.test(text) // 小写单词（可能是变量）
        ) {
          continue
        }

        results.push({
          text,
          line: lineIndex + 1,
          column: match.index || 0,
          suggestion: suggestI18nKey(text),
        })
      }
    })
  })

  return results
}

/**
 * 生成 i18n 扫描报告
 */
export function generateI18nReport(files: Array<{ path: string; content: string }>): {
  totalFiles: number
  filesWithIssues: number
  hardcodedTexts: Array<{
    file: string
    text: string
    line: number
    suggestion: string
  }>
  summary: string
} {
  const hardcodedTexts: Array<{
    file: string
    text: string
    line: number
    suggestion: string
  }> = []

  files.forEach((file) => {
    const detected = detectHardcodedText(file.content)
    detected.forEach((item) => {
      hardcodedTexts.push({
        file: file.path,
        text: item.text,
        line: item.line,
        suggestion: item.suggestion,
      })
    })
  })

  const filesWithIssues = new Set(hardcodedTexts.map((item) => item.file)).size

  const summary = `
📊 i18n Scan Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Files Scanned: ${files.length}
Files with Issues: ${filesWithIssues}
Hardcoded Texts Found: ${hardcodedTexts.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${filesWithIssues > 0 ? '⚠️  Issues found. Please review and add i18n keys.' : '✅ No issues found!'}
  `.trim()

  return {
    totalFiles: files.length,
    filesWithIssues,
    hardcodedTexts,
    summary,
  }
}

/**
 * 在开发环境打印 i18n 键值规范指南
 */
export function printI18nGuide(): void {
  if (!import.meta.env.DEV) return

  console.group('📖 i18n Key Naming Guide')
  console.log('Format: category.subcategory.key')
  console.log('')
  console.log('Standard Prefixes:')
  I18N_KEY_PREFIXES.forEach((prefix) => {
    console.log(`  - ${prefix}`)
  })
  console.log('')
  console.log('Examples:')
  console.log('  ✅ page.home.title')
  console.log('  ✅ common.button.save')
  console.log('  ✅ error.network.timeout')
  console.log('  ✅ auth.login.success')
  console.log('')
  console.log('  ❌ homeTitle (missing category)')
  console.log('  ❌ page_home_title (use dots, not underscores)')
  console.log('  ❌ PageHomeTitle (use camelCase, not PascalCase)')
  console.groupEnd()
}
