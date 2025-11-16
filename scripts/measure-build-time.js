/**
 * 测量构建时间和分析构建性能
 *
 * 使用方法：
 * node scripts/measure-build-time.js
 */

import { spawn } from 'child_process'
import { performance } from 'perf_hooks'
import { existsSync, statSync, readdirSync } from 'fs'
import { join } from 'path'

console.log('📊 开始测量构建时间...\n')

const startTime = performance.now()
let buildCompleteTime = null

// 清理旧的构建产物
console.log('🧹 清理旧的构建产物...')
if (existsSync('./dist')) {
  const cleanProcess = spawn('rmdir', ['/s', '/q', 'dist'], {
    stdio: 'inherit',
    shell: true,
  })

  cleanProcess.on('close', () => {
    console.log('✅ 清理完成\n')
    startBuild()
  })
} else {
  startBuild()
}

function startBuild() {
  console.log('🔨 开始构建...\n')

  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'pipe',
    shell: true,
  })

  buildProcess.stdout.on('data', (data) => {
    process.stdout.write(data.toString())
  })

  buildProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString())
  })

  buildProcess.on('close', (code) => {
    if (code === 0) {
      buildCompleteTime = performance.now()
      const duration = ((buildCompleteTime - startTime) / 1000).toFixed(2)

      console.log(`\n✅ 构建完成: ${duration}s`)

      // 分析构建产物
      analyzeBuildOutput(duration)
    } else {
      console.error(`\n❌ 构建失败 (退出码: ${code})`)
      process.exit(code)
    }
  })
}

function analyzeBuildOutput(buildTime) {
  console.log(`\n📈 构建性能分析:`)
  console.log(`${'='.repeat(50)}`)

  // 1. 构建时间评估
  console.log(`\n1. 构建时间: ${buildTime}s`)
  if (buildTime < 60) {
    console.log(`   性能评级: 🟢 优秀 (< 60s)`)
  } else if (buildTime < 120) {
    console.log(`   性能评级: 🟡 良好 (60-120s)`)
  } else {
    console.log(`   性能评级: 🔴 需要优化 (> 120s)`)
  }

  // 2. 分析构建产物大小
  if (existsSync('./dist')) {
    console.log(`\n2. 构建产物分析:`)

    const distSize = getDirectorySize('./dist')
    console.log(`   总大小: ${formatSize(distSize)}`)

    // 分析 JS 文件
    const jsDir = './dist/assets/js'
    if (existsSync(jsDir)) {
      const jsFiles = readdirSync(jsDir)
      const jsSize = getDirectorySize(jsDir)
      console.log(`   JS 文件: ${jsFiles.length} 个, ${formatSize(jsSize)}`)

      // 找出最大的 JS 文件
      const largestJs = findLargestFiles(jsDir, 5)
      if (largestJs.length > 0) {
        console.log(`\n   最大的 JS 文件:`)
        largestJs.forEach(({ name, size }) => {
          console.log(`      - ${name}: ${formatSize(size)}`)
        })
      }
    }

    // 分析 CSS 文件
    const cssDir = './dist/assets/css'
    if (existsSync(cssDir)) {
      const cssFiles = readdirSync(cssDir)
      const cssSize = getDirectorySize(cssDir)
      console.log(`\n   CSS 文件: ${cssFiles.length} 个, ${formatSize(cssSize)}`)
    }

    // 分析图片文件
    const imgDir = './dist/assets/images'
    if (existsSync(imgDir)) {
      const imgFiles = readdirSync(imgDir)
      const imgSize = getDirectorySize(imgDir)
      console.log(`   图片文件: ${imgFiles.length} 个, ${formatSize(imgSize)}`)
    }
  }

  // 3. 优化建议
  console.log(`\n3. 优化建议:`)

  if (buildTime >= 60) {
    console.log(`   ⚠️  构建时间较长，建议:`)
    console.log(`      - 检查 rollupOptions 配置`)
    console.log(`      - 考虑禁用 sourcemap`)
    console.log(`      - 考虑禁用 reportCompressedSize`)
    console.log(`      - 优化代码分割策略`)
    console.log(`      - 检查是否有大型依赖可以优化`)
  } else {
    console.log(`   ✅ 构建速度良好！`)
  }

  // 4. 下一步
  console.log(`\n4. 下一步:`)
  console.log(`   - 运行 npm run build:analyze 查看详细的打包分析`)
  console.log(`   - 查看 docs/dev-experience-optimization.md 了解更多优化建议`)
  console.log(`   - 定期监控构建时间，跟踪性能趋势`)

  console.log(`\n${'='.repeat(50)}\n`)
}

function getDirectorySize(dir) {
  let size = 0

  try {
    const files = readdirSync(dir)

    for (const file of files) {
      const filePath = join(dir, file)
      const stat = statSync(filePath)

      if (stat.isDirectory()) {
        size += getDirectorySize(filePath)
      } else {
        size += stat.size
      }
    }
  } catch (error) {
    // 忽略错误
  }

  return size
}

function findLargestFiles(dir, count = 5) {
  const files = []

  try {
    const fileList = readdirSync(dir)

    for (const file of fileList) {
      const filePath = join(dir, file)
      const stat = statSync(filePath)

      if (stat.isFile()) {
        files.push({ name: file, size: stat.size })
      }
    }

    files.sort((a, b) => b.size - a.size)
    return files.slice(0, count)
  } catch (error) {
    return []
  }
}

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}
