/**
 * 分析热更新性能和组件依赖关系
 *
 * 使用方法：
 * node scripts/analyze-hmr-performance.js
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

console.log('🔍 分析热更新性能和组件依赖关系...\n')

const srcDir = './src'
const issues = []
const recommendations = []

// 1. 检查组件文件大小
console.log('📊 1. 检查组件文件大小')
console.log('='.repeat(50))

function analyzeFileSize(dir, basePath = '') {
  const files = readdirSync(dir)
  const largeFiles = []

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      largeFiles.push(...analyzeFileSize(fullPath, join(basePath, file)))
    } else if (file.endsWith('.vue') || file.endsWith('.ts')) {
      const sizeKB = (stat.size / 1024).toFixed(2)
      const relativePath = join(basePath, file)

      if (stat.size > 300 * 1024) {
        // > 300KB
        largeFiles.push({ path: relativePath, size: sizeKB, severity: 'high' })
      } else if (stat.size > 200 * 1024) {
        // > 200KB
        largeFiles.push({ path: relativePath, size: sizeKB, severity: 'medium' })
      }
    }
  }

  return largeFiles
}

const largeFiles = analyzeFileSize(join(srcDir, 'components')).concat(
  analyzeFileSize(join(srcDir, 'views')),
)

if (largeFiles.length > 0) {
  console.log('⚠️  发现大型文件（可能影响热更新速度）：\n')
  largeFiles.sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
  largeFiles.forEach(({ path, size, severity }) => {
    const icon = severity === 'high' ? '🔴' : '🟡'
    console.log(`   ${icon} ${path}: ${size} KB`)
  })
  issues.push(`发现 ${largeFiles.length} 个大型文件`)
  recommendations.push('考虑拆分大型组件为多个小组件')
} else {
  console.log('✅ 所有组件文件大小合理\n')
}

// 2. 检查 <script setup> 使用情况
console.log('\n📊 2. 检查 <script setup> 使用情况')
console.log('='.repeat(50))

function checkScriptSetup(dir, basePath = '') {
  const files = readdirSync(dir)
  const results = { setup: 0, options: 0, files: [] }

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      const subResults = checkScriptSetup(fullPath, join(basePath, file))
      results.setup += subResults.setup
      results.options += subResults.options
      results.files.push(...subResults.files)
    } else if (file.endsWith('.vue')) {
      const content = readFileSync(fullPath, 'utf-8')
      const relativePath = join(basePath, file)

      if (content.includes('<script setup')) {
        results.setup++
      } else if (content.includes('<script')) {
        results.options++
        results.files.push(relativePath)
      }
    }
  }

  return results
}

const scriptResults = checkScriptSetup(join(srcDir, 'components'))
const viewResults = checkScriptSetup(join(srcDir, 'views'))

const totalSetup = scriptResults.setup + viewResults.setup
const totalOptions = scriptResults.options + viewResults.options
const total = totalSetup + totalOptions
const setupPercentage = ((totalSetup / total) * 100).toFixed(1)

console.log(`\n组件统计：`)
console.log(`   - 使用 <script setup>: ${totalSetup} (${setupPercentage}%)`)
console.log(`   - 使用 Options API: ${totalOptions} (${(100 - setupPercentage).toFixed(1)}%)`)

if (totalOptions > 0) {
  console.log(`\n⚠️  以下组件未使用 <script setup>（建议迁移以提升热更新性能）：\n`)
  const allOptionsFiles = [...scriptResults.files, ...viewResults.files]
  allOptionsFiles.slice(0, 10).forEach((file) => {
    console.log(`   - ${file}`)
  })
  if (allOptionsFiles.length > 10) {
    console.log(`   ... 还有 ${allOptionsFiles.length - 10} 个文件`)
  }
  issues.push(`${totalOptions} 个组件未使用 <script setup>`)
  recommendations.push('逐步迁移组件到 <script setup> 语法')
}

// 3. 检查导入模式
console.log('\n📊 3. 检查导入模式')
console.log('='.repeat(50))

function analyzeImports(dir, basePath = '') {
  const files = readdirSync(dir)
  const importIssues = []

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      importIssues.push(...analyzeImports(fullPath, join(basePath, file)))
    } else if (file.endsWith('.vue') || file.endsWith('.ts')) {
      const content = readFileSync(fullPath, 'utf-8')
      const relativePath = join(basePath, file)

      // 检查是否导入整个 store
      if (content.match(/import\s+{\s*use\w+Store\s*}\s+from\s+['"]@\/stores['"]/)) {
        const hasStoreToRefs = content.includes('storeToRefs')
        if (!hasStoreToRefs && content.includes('const store =')) {
          importIssues.push({
            file: relativePath,
            issue: '导入整个 store 但未使用 storeToRefs',
            type: 'store',
          })
        }
      }

      // 检查是否有大型库的全量导入
      if (content.includes('import * as')) {
        importIssues.push({
          file: relativePath,
          issue: '使用 import * 全量导入',
          type: 'wildcard',
        })
      }

      // 检查是否导入了大型图标库
      if (content.match(/import\s+{[^}]{100,}}\s+from\s+['"]lucide-vue-next['"]/)) {
        importIssues.push({
          file: relativePath,
          issue: '一次性导入大量图标',
          type: 'icons',
        })
      }
    }
  }

  return importIssues
}

const importIssues = analyzeImports(join(srcDir, 'components')).concat(
  analyzeImports(join(srcDir, 'views')),
)

if (importIssues.length > 0) {
  console.log(`\n⚠️  发现 ${importIssues.length} 个导入问题：\n`)

  const storeIssues = importIssues.filter((i) => i.type === 'store')
  const wildcardIssues = importIssues.filter((i) => i.type === 'wildcard')
  const iconIssues = importIssues.filter((i) => i.type === 'icons')

  if (storeIssues.length > 0) {
    console.log(`   🔴 Store 导入问题 (${storeIssues.length})：`)
    storeIssues.slice(0, 5).forEach(({ file, issue }) => {
      console.log(`      - ${file}: ${issue}`)
    })
    if (storeIssues.length > 5) {
      console.log(`      ... 还有 ${storeIssues.length - 5} 个文件`)
    }
  }

  if (wildcardIssues.length > 0) {
    console.log(`\n   🟡 全量导入问题 (${wildcardIssues.length})：`)
    wildcardIssues.slice(0, 5).forEach(({ file }) => {
      console.log(`      - ${file}`)
    })
    if (wildcardIssues.length > 5) {
      console.log(`      ... 还有 ${wildcardIssues.length - 5} 个文件`)
    }
  }

  if (iconIssues.length > 0) {
    console.log(`\n   🟡 图标导入问题 (${iconIssues.length})：`)
    iconIssues.slice(0, 5).forEach(({ file }) => {
      console.log(`      - ${file}`)
    })
    if (iconIssues.length > 5) {
      console.log(`      ... 还有 ${iconIssues.length - 5} 个文件`)
    }
  }

  issues.push(`${importIssues.length} 个导入模式问题`)
  recommendations.push('优化导入方式，使用 storeToRefs 和按需导入')
} else {
  console.log('✅ 导入模式良好\n')
}

// 4. 检查全局样式导入
console.log('\n📊 4. 检查全局样式导入')
console.log('='.repeat(50))

function checkGlobalStyles(dir, basePath = '') {
  const files = readdirSync(dir)
  const styleIssues = []

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      styleIssues.push(...checkGlobalStyles(fullPath, join(basePath, file)))
    } else if (file.endsWith('.vue')) {
      const content = readFileSync(fullPath, 'utf-8')
      const relativePath = join(basePath, file)

      // 检查是否在组件中导入全局样式
      if (content.match(/@import\s+['"]@\/styles\/(variables|global|theme)/)) {
        styleIssues.push(relativePath)
      }
    }
  }

  return styleIssues
}

const styleIssues = checkGlobalStyles(join(srcDir, 'components'))

if (styleIssues.length > 0) {
  console.log(`\n⚠️  ${styleIssues.length} 个组件导入了全局样式：\n`)
  styleIssues.slice(0, 10).forEach((file) => {
    console.log(`   - ${file}`)
  })
  if (styleIssues.length > 10) {
    console.log(`   ... 还有 ${styleIssues.length - 10} 个文件`)
  }
  issues.push(`${styleIssues.length} 个组件导入全局样式`)
  recommendations.push('避免在组件中导入全局样式，使用 scoped 样式')
} else {
  console.log('✅ 没有组件导入全局样式\n')
}

// 5. 总结和建议
console.log('\n' + '='.repeat(50))
console.log('📋 分析总结')
console.log('='.repeat(50))

if (issues.length === 0) {
  console.log('\n✅ 太棒了！没有发现明显的热更新性能问题。\n')
} else {
  console.log('\n⚠️  发现以下问题：\n')
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`)
  })
}

if (recommendations.length > 0) {
  console.log('\n💡 优化建议：\n')
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`)
  })
}

console.log('\n📚 更多信息请参考：')
console.log('   - docs/dev-experience-optimization.md')
console.log('   - Vite HMR 文档: https://vitejs.dev/guide/api-hmr.html')

console.log('\n🔧 测试热更新速度：')
console.log('   1. 启动开发服务器: npm run dev')
console.log('   2. 修改组件文件')
console.log('   3. 观察控制台的 HMR 更新时间')
console.log('   4. 使用 DEBUG=vite:hmr npm run dev 查看详细日志\n')
