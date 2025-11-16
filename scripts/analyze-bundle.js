/**
 * Bundle Analysis Script
 * 打包分析脚本
 *
 * Analyzes the production build output to identify:
 * - Large chunks that need optimization
 * - Unused dependencies
 * - Duplicate code
 * - Optimization opportunities
 */

import { readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DIST_DIR = join(__dirname, '../dist')
const SIZE_THRESHOLD_KB = 100 // Warn for chunks larger than 100KB
const TOTAL_SIZE_TARGET_KB = 500 // Target total JS size

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function getColorForSize(sizeKB, threshold) {
  if (sizeKB > threshold * 2) return colors.red
  if (sizeKB > threshold) return colors.yellow
  return colors.green
}

function analyzeDirectory(dir, results = { js: [], css: [], images: [], fonts: [], other: [] }) {
  try {
    const files = readdirSync(dir)

    for (const file of files) {
      const filePath = join(dir, file)
      const stat = statSync(filePath)

      if (stat.isDirectory()) {
        analyzeDirectory(filePath, results)
      } else {
        const ext = extname(file).toLowerCase()
        const size = stat.size
        const relativePath = filePath.replace(DIST_DIR, '')

        const fileInfo = {
          name: file,
          path: relativePath,
          size,
          sizeKB: size / 1024,
        }

        if (ext === '.js') {
          results.js.push(fileInfo)
        } else if (ext === '.css') {
          results.css.push(fileInfo)
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
          results.images.push(fileInfo)
        } else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
          results.fonts.push(fileInfo)
        } else {
          results.other.push(fileInfo)
        }
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error analyzing directory:${colors.reset}`, error.message)
  }

  return results
}

function printSection(title, items, threshold = SIZE_THRESHOLD_KB) {
  if (items.length === 0) return

  console.log(`\n${colors.bold}${colors.cyan}${title}${colors.reset}`)
  console.log('─'.repeat(80))

  // Sort by size descending
  const sorted = [...items].sort((a, b) => b.size - a.size)

  let totalSize = 0
  for (const item of sorted) {
    totalSize += item.size
    const color = getColorForSize(item.sizeKB, threshold)
    const warning = item.sizeKB > threshold ? ' ⚠️' : ''
    console.log(`${color}${formatSize(item.size).padEnd(12)}${colors.reset} ${item.name}${warning}`)
  }

  console.log('─'.repeat(80))
  console.log(`${colors.bold}Total: ${formatSize(totalSize)}${colors.reset}`)
}

function analyzeChunkNames(jsFiles) {
  const categories = {
    vendor: [],
    pages: [],
    components: [],
    core: [],
    other: [],
  }

  for (const file of jsFiles) {
    const name = file.name.toLowerCase()

    if (name.includes('vendor') || name.includes('node_modules')) {
      categories.vendor.push(file)
    } else if (name.includes('page-') || name.includes('view-')) {
      categories.pages.push(file)
    } else if (name.includes('component')) {
      categories.components.push(file)
    } else if (
      name.includes('vue-') ||
      name.includes('router') ||
      name.includes('pinia') ||
      name.includes('index')
    ) {
      categories.core.push(file)
    } else {
      categories.other.push(file)
    }
  }

  return categories
}

function generateRecommendations(results) {
  const recommendations = []

  // Check total JS size
  const totalJSSize = results.js.reduce((sum, file) => sum + file.size, 0)
  const totalJSSizeKB = totalJSSize / 1024

  if (totalJSSizeKB > TOTAL_SIZE_TARGET_KB) {
    recommendations.push({
      type: 'warning',
      message: `Total JS size (${formatSize(totalJSSize)}) exceeds target (${TOTAL_SIZE_TARGET_KB}KB)`,
      suggestions: [
        'Consider lazy loading more routes',
        'Review and remove unused dependencies',
        'Enable tree-shaking for all libraries',
      ],
    })
  }

  // Check for large chunks
  const largeChunks = results.js.filter((file) => file.sizeKB > SIZE_THRESHOLD_KB)
  if (largeChunks.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `Found ${largeChunks.length} large chunks (>${SIZE_THRESHOLD_KB}KB)`,
      suggestions: [
        'Split large chunks into smaller pieces',
        'Use dynamic imports for heavy components',
        'Review manualChunks configuration',
      ],
    })
  }

  // Check for duplicate libraries
  const libCounts = {}
  for (const file of results.js) {
    const match = file.name.match(/^([a-z-]+)-/)
    if (match) {
      const lib = match[1]
      libCounts[lib] = (libCounts[lib] || 0) + 1
    }
  }

  const duplicates = Object.entries(libCounts).filter(([, count]) => count > 1)
  if (duplicates.length > 0) {
    recommendations.push({
      type: 'info',
      message: `Potential duplicate chunks detected: ${duplicates.map(([lib]) => lib).join(', ')}`,
      suggestions: ['Review code splitting strategy', 'Ensure proper chunk deduplication'],
    })
  }

  // Check CSS size
  const totalCSSSize = results.css.reduce((sum, file) => sum + file.size, 0)
  const totalCSSSizeKB = totalCSSSize / 1024

  if (totalCSSSizeKB > 100) {
    recommendations.push({
      type: 'info',
      message: `CSS size (${formatSize(totalCSSSize)}) is relatively large`,
      suggestions: [
        'Consider using CSS-in-JS or scoped styles',
        'Remove unused CSS with PurgeCSS',
        'Enable CSS code splitting',
      ],
    })
  }

  return recommendations
}

function printRecommendations(recommendations) {
  if (recommendations.length === 0) {
    console.log(`\n${colors.green}${colors.bold}✅ No issues found!${colors.reset}`)
    return
  }

  console.log(`\n${colors.bold}${colors.magenta}📋 Recommendations${colors.reset}`)
  console.log('─'.repeat(80))

  for (const rec of recommendations) {
    const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️'
    const color = rec.type === 'warning' ? colors.yellow : colors.blue

    console.log(`\n${icon} ${color}${rec.message}${colors.reset}`)
    if (rec.suggestions && rec.suggestions.length > 0) {
      console.log('   Suggestions:')
      for (const suggestion of rec.suggestions) {
        console.log(`   • ${suggestion}`)
      }
    }
  }
}

function main() {
  console.log(`${colors.bold}${colors.cyan}`)
  console.log('╔════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                         Bundle Analysis Report                            ║')
  console.log('╚════════════════════════════════════════════════════════════════════════════╝')
  console.log(colors.reset)

  try {
    const results = analyzeDirectory(DIST_DIR)

    // Print JavaScript analysis
    printSection('📦 JavaScript Files', results.js, SIZE_THRESHOLD_KB)

    // Print categorized chunks
    const categories = analyzeChunkNames(results.js)
    console.log(`\n${colors.bold}${colors.cyan}Chunk Categories:${colors.reset}`)
    console.log(`  Core: ${categories.core.length} files`)
    console.log(`  Vendor: ${categories.vendor.length} files`)
    console.log(`  Pages: ${categories.pages.length} files`)
    console.log(`  Components: ${categories.components.length} files`)
    console.log(`  Other: ${categories.other.length} files`)

    // Print other assets
    printSection('🎨 CSS Files', results.css, 50)
    printSection('🖼️  Images', results.images, 200)
    printSection('🔤 Fonts', results.fonts, 100)

    // Calculate totals
    const totalSize =
      results.js.reduce((sum, f) => sum + f.size, 0) +
      results.css.reduce((sum, f) => sum + f.size, 0) +
      results.images.reduce((sum, f) => sum + f.size, 0) +
      results.fonts.reduce((sum, f) => sum + f.size, 0) +
      results.other.reduce((sum, f) => sum + f.size, 0)

    console.log(
      `\n${colors.bold}${colors.cyan}Total Bundle Size: ${formatSize(totalSize)}${colors.reset}`,
    )

    // Generate and print recommendations
    const recommendations = generateRecommendations(results)
    printRecommendations(recommendations)

    console.log('\n')
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message)
    process.exit(1)
  }
}

main()
