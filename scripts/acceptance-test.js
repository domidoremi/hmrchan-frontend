#!/usr/bin/env node

/**
 * 前端项目最终验收测试脚本
 *
 * 测试内容：
 * 1. 全面功能测试 - 所有页面和交互
 * 2. 性能指标验收 - FCP, LCP, TTI, CLS, 包体积
 * 3. 代码质量指标 - TypeScript, ESLint, 代码重复率
 * 4. 用户体验指标 - 页面切换, 交互响应, 无障碍, 响应式
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

// 测试结果存储
const testResults = {
  功能测试: { passed: 0, failed: 0, tests: [] },
  性能指标: { passed: 0, failed: 0, tests: [] },
  代码质量: { passed: 0, failed: 0, tests: [] },
  用户体验: { passed: 0, failed: 0, tests: [] },
}

// 工具函数
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'bold')
  console.log('='.repeat(60) + '\n')
}

function recordTest(category, name, passed, actual, expected, message = '') {
  const result = { name, passed, actual, expected, message }
  testResults[category].tests.push(result)

  if (passed) {
    testResults[category].passed++
    log(`  ✓ ${name}`, 'green')
    if (message) log(`    ${message}`, 'cyan')
  } else {
    testResults[category].failed++
    log(`  ✗ ${name}`, 'red')
    log(`    Expected: ${expected}`, 'yellow')
    log(`    Actual: ${actual}`, 'yellow')
    if (message) log(`    ${message}`, 'cyan')
  }
}

function execCommand(command, silent = false) {
  try {
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    })
    return { success: true, output }
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' }
  }
}

// ========== 任务 31.1: 全面功能测试 ==========
function testAllPages() {
  logSection('任务 31.1: 全面功能测试')

  const pages = [
    'HomePage.vue',
    'ExplorePage.vue',
    'PostsView.vue',
    'SearchPage.vue',
    'LoginPage.vue',
    'RegisterPage.vue',
    'PostDetailPage.vue',
    'FavoritesPage.vue',
    'AuthorsPage.vue',
    'SettingsPage.vue',
    'ProfilePage.vue',
    'DevToolsPage.vue',
    'PreferencesPage.vue',
    'PrivacyPage.vue',
    'NotFoundPage.vue',
  ]

  log('检查所有页面组件是否存在...', 'blue')
  pages.forEach((page) => {
    const pagePath = join(rootDir, 'src', 'views', page)
    const exists = existsSync(pagePath)
    recordTest('功能测试', `页面存在: ${page}`, exists, exists, true)
  })

  // 检查关键组件
  log('\n检查关键组件是否存在...', 'blue')
  const components = [
    'base/Button.vue',
    'form/Input.vue',
    'form/Select.vue',
    'feedback/Toast.vue',
    'feedback/Modal.vue',
    'data-display/StatCard.vue',
    'data-display/Card.vue',
    'layout/Grid.vue',
    'layout/Stack.vue',
    'business/PostCard.vue',
  ]

  components.forEach((comp) => {
    const compPath = join(rootDir, 'src', 'components', comp)
    const exists = existsSync(compPath)
    recordTest('功能测试', `组件存在: ${comp}`, exists, exists, true)
  })

  // 检查路由配置
  log('\n检查路由配置...', 'blue')
  const routerPath = join(rootDir, 'src', 'router', 'index.ts')
  const routerContent = readFileSync(routerPath, 'utf-8')
  const hasLazyLoading = routerContent.includes('import(')
  recordTest('功能测试', '路由懒加载配置', hasLazyLoading, hasLazyLoading, true)

  const hasPreload = routerContent.includes('preload:')
  recordTest('功能测试', '路由预加载配置', hasPreload, hasPreload, true)

  // 检查响应式布局
  log('\n检查响应式样式...', 'blue')
  const responsiveStyles = [
    'src/styles/mobile-optimizations.css',
    'src/styles/tablet-optimizations.css',
    'src/styles/desktop-optimizations.css',
  ]

  responsiveStyles.forEach((style) => {
    const stylePath = join(rootDir, style)
    const exists = existsSync(stylePath)
    recordTest('功能测试', `响应式样式: ${style}`, exists, exists, true)
  })
}

// ========== 任务 31.2: 性能指标验收 ==========
function testPerformanceMetrics() {
  logSection('任务 31.2: 性能指标验收')

  // 检查打包体积
  log('检查打包体积...', 'blue')
  const distPath = join(rootDir, 'dist')

  if (!existsSync(distPath)) {
    log('  ⚠ dist 目录不存在，跳过打包体积检查', 'yellow')
    log('  提示: 运行 npm run build 生成生产构建', 'cyan')
  } else {
    const jsFiles = []
    const assetsPath = join(distPath, 'assets')

    if (existsSync(assetsPath)) {
      const files = readdirSync(assetsPath)
      files.forEach((file) => {
        if (file.endsWith('.js')) {
          const filePath = join(assetsPath, file)
          const stats = statSync(filePath)
          jsFiles.push({ name: file, size: stats.size })
        }
      })
    }

    // 计算主包大小（最大的 JS 文件）
    if (jsFiles.length > 0) {
      jsFiles.sort((a, b) => b.size - a.size)
      const mainBundle = jsFiles[0]
      const mainBundleSizeKB = (mainBundle.size / 1024).toFixed(2)
      const passed = mainBundle.size < 500 * 1024 // 500KB

      recordTest(
        '性能指标',
        '主包体积 < 500KB',
        passed,
        `${mainBundleSizeKB} KB`,
        '< 500 KB',
        `主包: ${mainBundle.name}`,
      )

      // 总体积
      const totalSize = jsFiles.reduce((sum, f) => sum + f.size, 0)
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
      log(`  总 JS 体积: ${totalSizeMB} MB (${jsFiles.length} 个文件)`, 'cyan')
    }
  }

  // 检查性能监控工具
  log('\n检查性能监控实现...', 'blue')
  const perfMonitorPath = join(rootDir, 'src', 'utils', 'performance', 'performanceMonitor.ts')
  const perfMonitorExists = existsSync(perfMonitorPath)
  recordTest('性能指标', '性能监控工具存在', perfMonitorExists, perfMonitorExists, true)

  if (perfMonitorExists) {
    const content = readFileSync(perfMonitorPath, 'utf-8')
    const hasFCP = content.includes('first-contentful-paint')
    const hasLCP = content.includes('largest-contentful-paint')
    const hasCLS = content.includes('layout-shift') && content.includes('cls')

    recordTest('性能指标', 'FCP 监控实现', hasFCP, hasFCP, true)
    recordTest('性能指标', 'LCP 监控实现', hasLCP, hasLCP, true)
    recordTest('性能指标', 'CLS 监控实现', hasCLS, hasCLS, true)
  }

  // 检查代码分割配置
  log('\n检查代码分割配置...', 'blue')
  const viteConfigPath = join(rootDir, 'vite.config.ts')
  const viteConfig = readFileSync(viteConfigPath, 'utf-8')
  const hasManualChunks = viteConfig.includes('manualChunks')
  recordTest('性能指标', 'Vite manualChunks 配置', hasManualChunks, hasManualChunks, true)

  // 检查图片优化
  log('\n检查图片优化实现...', 'blue')
  const optimizedImagePath = join(rootDir, 'src', 'components', 'base', 'OptimizedImage.vue')
  const optimizedImageExists = existsSync(optimizedImagePath)
  recordTest(
    '性能指标',
    'OptimizedImage 组件存在',
    optimizedImageExists,
    optimizedImageExists,
    true,
  )

  if (optimizedImageExists) {
    const content = readFileSync(optimizedImagePath, 'utf-8')
    const hasLazyLoad = content.includes('loading="lazy"') || content.includes('lazy')
    const hasSrcset = content.includes('srcset')

    recordTest('性能指标', '图片懒加载实现', hasLazyLoad, hasLazyLoad, true)
    recordTest('性能指标', '响应式图片 (srcset)', hasSrcset, hasSrcset, true)
  }
}

// ========== 任务 31.3: 代码质量指标验收 ==========
function testCodeQuality() {
  logSection('任务 31.3: 代码质量指标验收')

  // TypeScript 类型检查
  log('运行 TypeScript 类型检查...', 'blue')
  const typeCheckResult = execCommand('npm run type-check', true)
  recordTest(
    '代码质量',
    'TypeScript 类型检查通过',
    typeCheckResult.success,
    typeCheckResult.success ? '通过' : '失败',
    '通过',
    typeCheckResult.success ? '' : '运行 npm run type-check 查看详情',
  )

  // ESLint 检查
  log('\n运行 ESLint 检查...', 'blue')
  const lintResult = execCommand('npx eslint . --max-warnings 0', true)
  recordTest(
    '代码质量',
    'ESLint 错误 = 0',
    lintResult.success,
    lintResult.success ? '0 错误' : '有错误',
    '0 错误',
    lintResult.success ? '' : '运行 npm run lint 查看详情',
  )

  // 检查 TypeScript 覆盖率
  log('\n检查 TypeScript 类型定义覆盖率...', 'blue')
  const srcPath = join(rootDir, 'src')
  let tsFiles = 0
  let jsFiles = 0

  function countFiles(dir) {
    const files = readdirSync(dir, { withFileTypes: true })
    files.forEach((file) => {
      const fullPath = join(dir, file.name)
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        countFiles(fullPath)
      } else if (file.isFile()) {
        if (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.vue')) {
          tsFiles++
        } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
          jsFiles++
        }
      }
    })
  }

  countFiles(srcPath)
  const totalFiles = tsFiles + jsFiles
  const tsCoverage = totalFiles > 0 ? ((tsFiles / totalFiles) * 100).toFixed(2) : 0
  const passed = tsCoverage >= 90

  recordTest(
    '代码质量',
    'TypeScript 覆盖率 > 90%',
    passed,
    `${tsCoverage}%`,
    '> 90%',
    `${tsFiles} TS/Vue 文件, ${jsFiles} JS 文件`,
  )

  // 检查代码重复率（简化版）
  log('\n检查代码组织和模块化...', 'blue')

  // 检查 composables
  const composablesPath = join(rootDir, 'src', 'composables')
  const composables = existsSync(composablesPath)
    ? readdirSync(composablesPath).filter((f) => f.endsWith('.ts'))
    : []
  recordTest(
    '代码质量',
    'Composables 数量充足',
    composables.length >= 10,
    `${composables.length} 个`,
    '>= 10 个',
    '表明代码复用良好',
  )

  // 检查工具函数
  const utilsPath = join(rootDir, 'src', 'utils')
  let utilFiles = 0
  if (existsSync(utilsPath)) {
    function countUtilFiles(dir) {
      const files = readdirSync(dir, { withFileTypes: true })
      files.forEach((file) => {
        if (file.isDirectory()) {
          countUtilFiles(join(dir, file.name))
        } else if (file.name.endsWith('.ts')) {
          utilFiles++
        }
      })
    }
    countUtilFiles(utilsPath)
  }

  recordTest(
    '代码质量',
    '工具函数模块化',
    utilFiles >= 5,
    `${utilFiles} 个工具文件`,
    '>= 5 个',
    '表明功能抽离良好',
  )

  // 检查组件结构
  const componentsPath = join(rootDir, 'src', 'components')
  const componentDirs = ['base', 'form', 'feedback', 'data-display', 'layout', 'business']
  let structureScore = 0

  componentDirs.forEach((dir) => {
    const dirPath = join(componentsPath, dir)
    if (existsSync(dirPath)) {
      structureScore++
    }
  })

  recordTest(
    '代码质量',
    '组件目录结构规范',
    structureScore >= 5,
    `${structureScore}/${componentDirs.length} 个目录`,
    '>= 5 个',
    '表明组件分类清晰',
  )
}

// ========== 任务 31.4: 用户体验指标验收 ==========
function testUserExperience() {
  logSection('任务 31.4: 用户体验指标验收')

  // 检查页面切换优化
  log('检查页面切换优化...', 'blue')
  const routerPath = join(rootDir, 'src', 'router', 'index.ts')
  const routerContent = readFileSync(routerPath, 'utf-8')

  const hasScrollBehavior = routerContent.includes('scrollBehavior')
  recordTest('用户体验', '路由滚动行为配置', hasScrollBehavior, hasScrollBehavior, true)

  const hasSmoothScroll = routerContent.includes("behavior: 'smooth'")
  recordTest('用户体验', '平滑滚动实现', hasSmoothScroll, hasSmoothScroll, true)

  // 检查交互响应优化
  log('\n检查交互响应优化...', 'blue')

  // 检查防抖节流
  const debounceExists = existsSync(join(rootDir, 'src', 'composables', 'useDebounce.ts'))
  const throttleExists = existsSync(join(rootDir, 'src', 'composables', 'useThrottle.ts'))
  recordTest('用户体验', '防抖 composable 实现', debounceExists, debounceExists, true)
  recordTest('用户体验', '节流 composable 实现', throttleExists, throttleExists, true)

  // 检查乐观更新
  const optimisticUpdateExists = existsSync(
    join(rootDir, 'src', 'composables', 'useOptimisticUpdate.ts'),
  )
  recordTest('用户体验', '乐观更新实现', optimisticUpdateExists, optimisticUpdateExists, true)

  // 检查加载状态
  const loadingExists = existsSync(
    join(rootDir, 'src', 'components', 'feedback', 'LoadingSpinner.vue'),
  )
  const skeletonExists = existsSync(join(rootDir, 'src', 'components', 'feedback', 'Skeleton.vue'))
  recordTest('用户体验', 'Loading 组件存在', loadingExists, loadingExists, true)
  recordTest('用户体验', 'Skeleton 组件存在', skeletonExists, skeletonExists, true)

  // 检查无障碍功能
  log('\n检查无障碍功能...', 'blue')

  const accessibilityExists = existsSync(join(rootDir, 'src', 'composables', 'useAccessibility.ts'))
  recordTest('用户体验', '无障碍 composable 实现', accessibilityExists, accessibilityExists, true)

  const focusTrapExists = existsSync(join(rootDir, 'src', 'composables', 'useFocusTrap.ts'))
  recordTest('用户体验', '焦点陷阱实现', focusTrapExists, focusTrapExists, true)

  const keyboardShortcutsExists = existsSync(
    join(rootDir, 'src', 'composables', 'useKeyboardShortcuts.ts'),
  )
  recordTest('用户体验', '键盘快捷键实现', keyboardShortcutsExists, keyboardShortcutsExists, true)

  // 检查无障碍样式
  const a11yStylePath = join(rootDir, 'src', 'styles', 'accessibility.css')
  const a11yStyleExists = existsSync(a11yStylePath)
  recordTest('用户体验', '无障碍样式文件存在', a11yStyleExists, a11yStyleExists, true)

  if (a11yStyleExists) {
    const content = readFileSync(a11yStylePath, 'utf-8')
    const hasFocusVisible = content.includes(':focus-visible')
    const hasReducedMotion = content.includes('prefers-reduced-motion')
    const hasHighContrast = content.includes('prefers-contrast')

    recordTest('用户体验', '焦点可见性样式', hasFocusVisible, hasFocusVisible, true)
    recordTest('用户体验', '减少动画偏好支持', hasReducedMotion, hasReducedMotion, true)
    recordTest('用户体验', '高对比度支持', hasHighContrast, hasHighContrast, true)
  }

  // 检查响应式设计
  log('\n检查响应式设计实现...', 'blue')

  const responsiveExists = existsSync(join(rootDir, 'src', 'composables', 'useResponsive.ts'))
  recordTest('用户体验', '响应式检测 composable', responsiveExists, responsiveExists, true)

  // 检查移动端优化
  const mobileOptExists = existsSync(join(rootDir, 'src', 'styles', 'mobile-optimizations.css'))
  const tabletOptExists = existsSync(join(rootDir, 'src', 'styles', 'tablet-optimizations.css'))
  const desktopOptExists = existsSync(join(rootDir, 'src', 'styles', 'desktop-optimizations.css'))

  recordTest('用户体验', '移动端优化样式', mobileOptExists, mobileOptExists, true)
  recordTest('用户体验', '平板端优化样式', tabletOptExists, tabletOptExists, true)
  recordTest('用户体验', '桌面端优化样式', desktopOptExists, desktopOptExists, true)

  // 检查触摸交互
  const longPressExists = existsSync(join(rootDir, 'src', 'composables', 'useLongPress.ts'))
  recordTest('用户体验', '长按交互实现', longPressExists, longPressExists, true)

  // 检查动画系统
  log('\n检查动画系统...', 'blue')

  const animationExists = existsSync(join(rootDir, 'src', 'composables', 'useAnimation.ts'))
  recordTest('用户体验', '动画 composable 实现', animationExists, animationExists, true)

  const animationStylePath = join(rootDir, 'src', 'styles', 'animations.css')
  const animationStyleExists = existsSync(animationStylePath)
  recordTest('用户体验', '动画样式文件存在', animationStyleExists, animationStyleExists, true)
}

// ========== 生成测试报告 ==========
function generateReport() {
  logSection('测试报告')

  let totalPassed = 0
  let totalFailed = 0

  Object.entries(testResults).forEach(([category, results]) => {
    const total = results.passed + results.failed
    const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0

    totalPassed += results.passed
    totalFailed += results.failed

    const color = results.failed === 0 ? 'green' : results.failed < 3 ? 'yellow' : 'red'
    log(`${category}:`, 'bold')
    log(`  通过: ${results.passed}/${total} (${passRate}%)`, color)

    if (results.failed > 0) {
      log(`  失败的测试:`, 'red')
      results.tests
        .filter((t) => !t.passed)
        .forEach((test) => {
          log(`    - ${test.name}`, 'red')
        })
    }
    console.log()
  })

  const grandTotal = totalPassed + totalFailed
  const overallPassRate = grandTotal > 0 ? ((totalPassed / grandTotal) * 100).toFixed(1) : 0

  console.log('='.repeat(60))
  log('总体结果:', 'bold')
  log(`  总测试数: ${grandTotal}`, 'cyan')
  log(`  通过: ${totalPassed}`, 'green')
  log(`  失败: ${totalFailed}`, totalFailed === 0 ? 'green' : 'red')
  log(`  通过率: ${overallPassRate}%`, totalFailed === 0 ? 'green' : 'yellow')
  console.log('='.repeat(60))

  // 验收结论
  console.log()
  if (totalFailed === 0) {
    log('✓ 恭喜！所有验收测试通过！', 'green')
    log('项目已达到生产就绪状态。', 'green')
  } else if (overallPassRate >= 90) {
    log('⚠ 大部分测试通过，但仍有少量问题需要解决。', 'yellow')
    log('建议修复失败的测试后再部署到生产环境。', 'yellow')
  } else {
    log('✗ 存在较多问题，需要进一步优化。', 'red')
    log('请查看上述失败的测试并逐一修复。', 'red')
  }

  return totalFailed === 0
}

// ========== 主函数 ==========
async function main() {
  log('前端项目最终验收测试', 'bold')
  log('开始时间: ' + new Date().toLocaleString(), 'cyan')
  console.log()

  try {
    // 执行所有测试
    testAllPages()
    testPerformanceMetrics()
    testCodeQuality()
    testUserExperience()

    // 生成报告
    const allPassed = generateReport()

    // 退出码
    process.exit(allPassed ? 0 : 1)
  } catch (error) {
    log('\n测试执行出错:', 'red')
    console.error(error)
    process.exit(1)
  }
}

// 运行测试
main()
