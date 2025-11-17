#!/usr/bin/env node
/**
 * 打包分析脚本 - 分析构建产物大小和分布
 */

import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, '../dist')

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 递归获取目录下所有文件
 */
async function getFiles(dir, files = []) {
  const items = await readdir(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = join(dir, item.name)

    if (item.isDirectory()) {
      await getFiles(fullPath, files)
    } else {
      const stats = await stat(fullPath)
      files.push({
        path: fullPath.replace(distDir + '/', ''),
        size: stats.size,
        ext: extname(item.name),
      })
    }
  }

  return files
}

/**
 * 分析文件分布
 */
function analyzeFiles(files) {
  const byType = {}
  const byCategory = {
    js: [],
    css: [],
    images: [],
    fonts: [],
    html: [],
    other: [],
  }

  let totalSize = 0

  for (const file of files) {
    totalSize += file.size

    // 按扩展名分类
    byType[file.ext] = (byType[file.ext] || 0) + file.size

    // 按类别分类
    if (file.ext === '.js') {
      byCategory.js.push(file)
    } else if (file.ext === '.css') {
      byCategory.css.push(file)
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(file.ext)) {
      byCategory.images.push(file)
    } else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(file.ext)) {
      byCategory.fonts.push(file)
    } else if (file.ext === '.html') {
      byCategory.html.push(file)
    } else {
      byCategory.other.push(file)
    }
  }

  return { byType, byCategory, totalSize }
}

/**
 * 打印分析报告
 */
function printReport(analysis) {
  console.log('\n' + '='.repeat(80))
  console.log('📦 打包产物分析报告')
  console.log('='.repeat(80))

  // 总体积
  console.log(`\n📊 总体积: ${formatSize(analysis.totalSize)}`)

  // 按扩展名统计
  console.log('\n📁 按文件类型统计:')
  const sortedTypes = Object.entries(analysis.byType).sort((a, b) => b[1] - a[1])

  for (const [ext, size] of sortedTypes) {
    const percentage = ((size / analysis.totalSize) * 100).toFixed(1)
    console.log(`  ${ext.padEnd(10)} ${formatSize(size).padStart(12)}  (${percentage}%)`)
  }

  // JavaScript 文件详情
  console.log('\n📜 JavaScript 文件 (前15个最大的):')
  const jsFiles = analysis.byCategory.js.sort((a, b) => b.size - a.size).slice(0, 15)

  for (const file of jsFiles) {
    console.log(`  ${formatSize(file.size).padStart(10)}  ${file.path}`)
  }

  // CSS 文件详情
  console.log('\n🎨 CSS 文件:')
  const cssFiles = analysis.byCategory.css.sort((a, b) => b.size - a.size)

  for (const file of cssFiles) {
    console.log(`  ${formatSize(file.size).padStart(10)}  ${file.path}`)
  }

  // 优化建议
  console.log('\n💡 优化建议:')
  const largeChunks = analysis.byCategory.js.filter((f) => f.size > 200 * 1024)

  if (largeChunks.length > 0) {
    console.log('  ⚠️  发现大文件 (>200KB):')
    for (const chunk of largeChunks) {
      console.log(`     - ${chunk.path} (${formatSize(chunk.size)})`)
    }
    console.log('     建议: 考虑进一步拆分这些chunk或使用动态导入')
  } else {
    console.log('  ✅ 没有发现超大文件 (<200KB)')
  }

  // Gzip 估算
  const estimatedGzipSize = analysis.totalSize * 0.3 // 粗略估计gzip后30%
  console.log(`\n🗜️  预估Gzip后总体积: ~${formatSize(estimatedGzipSize)}`)

  console.log('\n' + '='.repeat(80))
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('正在分析打包产物...')

    const files = await getFiles(distDir)
    const analysis = analyzeFiles(files)

    printReport(analysis)
  } catch (error) {
    console.error('❌ 分析失败:', error.message)
    process.exit(1)
  }
}

main()
