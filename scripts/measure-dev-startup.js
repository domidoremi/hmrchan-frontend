/**
 * 测量开发服务器启动时间
 *
 * 使用方法：
 * node scripts/measure-dev-startup.js
 */

import { spawn } from 'child_process'
import { performance } from 'perf_hooks'

console.log('📊 开始测量开发服务器启动时间...\n')

const startTime = performance.now()
let serverReadyTime = null
let firstPageLoadTime = null

const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  shell: true,
})

viteProcess.stdout.on('data', (data) => {
  const output = data.toString()
  process.stdout.write(output)

  // 检测服务器就绪
  if (output.includes('Local:') && !serverReadyTime) {
    serverReadyTime = performance.now()
    const duration = ((serverReadyTime - startTime) / 1000).toFixed(2)
    console.log(`\n✅ 服务器启动完成: ${duration}s`)
    console.log(`\n📈 启动性能分析:`)
    console.log(`   - 服务器启动时间: ${duration}s`)

    // 评估性能
    if (duration < 3) {
      console.log(`   - 性能评级: 🟢 优秀 (< 3s)`)
    } else if (duration < 5) {
      console.log(`   - 性能评级: 🟡 良好 (3-5s)`)
    } else {
      console.log(`   - 性能评级: 🔴 需要优化 (> 5s)`)
    }

    console.log(`\n💡 优化建议:`)
    if (duration >= 3) {
      console.log(`   - 检查 optimizeDeps.include 配置`)
      console.log(`   - 考虑减少预构建依赖数量`)
      console.log(`   - 使用 warmup 预热关键文件`)
      console.log(`   - 检查是否有大型依赖可以延迟加载`)
    } else {
      console.log(`   - 当前启动速度已经很好！`)
    }

    console.log(`\n按 Ctrl+C 停止服务器`)
  }
})

viteProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString())
})

viteProcess.on('close', (code) => {
  console.log(`\n服务器已停止 (退出码: ${code})`)
  process.exit(code)
})

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n正在停止服务器...')
  viteProcess.kill('SIGINT')
})
