/**
 * 比较不同构建配置的性能
 *
 * 使用方法：
 * node scripts/compare-build-configs.js
 */

console.log('📊 构建配置性能对比\n')
console.log('='.repeat(60))

const configs = [
  {
    name: '当前配置（优化后）',
    features: [
      '✅ sourcemap: false',
      '✅ reportCompressedSize: false',
      '✅ minify: esbuild',
      '✅ cssMinify: esbuild',
      '✅ 精细的代码分割',
      '✅ 优化的 optimizeDeps',
    ],
    estimatedTime: '40-60s',
    pros: ['构建速度快', '打包体积小', '代码分割合理'],
    cons: ['无 sourcemap（生产环境通常不需要）'],
  },
  {
    name: '开发友好配置',
    features: [
      '⚠️  sourcemap: true',
      '✅ reportCompressedSize: false',
      '✅ minify: esbuild',
      '✅ cssMinify: esbuild',
      '✅ 精细的代码分割',
      '✅ 优化的 optimizeDeps',
    ],
    estimatedTime: '60-90s',
    pros: ['有 sourcemap，便于调试', '打包体积小'],
    cons: ['构建时间增加 30-50%', 'sourcemap 文件占用空间'],
  },
  {
    name: '最快构建配置',
    features: [
      '✅ sourcemap: false',
      '✅ reportCompressedSize: false',
      '✅ minify: esbuild',
      '✅ cssMinify: esbuild',
      '⚠️  简化的代码分割',
      '✅ 优化的 optimizeDeps',
    ],
    estimatedTime: '30-45s',
    pros: ['构建速度最快', '配置简单'],
    cons: ['打包体积可能较大', '首次加载可能较慢'],
  },
  {
    name: '最小体积配置',
    features: [
      '✅ sourcemap: false',
      '✅ reportCompressedSize: false',
      '⚠️  minify: terser',
      '✅ cssMinify: esbuild',
      '✅ 精细的代码分割',
      '✅ 优化的 optimizeDeps',
    ],
    estimatedTime: '90-120s',
    pros: ['打包体积最小', '代码压缩率最高'],
    cons: ['构建时间最长', 'terser 比 esbuild 慢 10-100 倍'],
  },
]

configs.forEach((config, index) => {
  console.log(`\n${index + 1}. ${config.name}`)
  console.log('-'.repeat(60))

  console.log('\n   特性:')
  config.features.forEach((feature) => {
    console.log(`      ${feature}`)
  })

  console.log(`\n   预计构建时间: ${config.estimatedTime}`)

  console.log('\n   优点:')
  config.pros.forEach((pro) => {
    console.log(`      ✅ ${pro}`)
  })

  console.log('\n   缺点:')
  config.cons.forEach((con) => {
    console.log(`      ⚠️  ${con}`)
  })
})

console.log('\n' + '='.repeat(60))
console.log('\n💡 推荐配置\n')
console.log('根据不同场景选择合适的配置：\n')

console.log('1. 生产环境（推荐）：')
console.log('   - 使用"当前配置（优化后）"')
console.log('   - 平衡构建速度和打包体积')
console.log('   - 适合 CI/CD 自动化构建\n')

console.log('2. 开发调试：')
console.log('   - 使用"开发友好配置"')
console.log('   - 启用 sourcemap 便于调试')
console.log('   - 适合需要调试生产构建的场景\n')

console.log('3. 快速迭代：')
console.log('   - 使用"最快构建配置"')
console.log('   - 牺牲一些打包优化换取构建速度')
console.log('   - 适合频繁构建测试的场景\n')

console.log('4. 性能优先：')
console.log('   - 使用"最小体积配置"')
console.log('   - 追求最小的打包体积')
console.log('   - 适合对加载性能要求极高的场景\n')

console.log('='.repeat(60))
console.log('\n📚 更多信息：')
console.log('   - docs/dev-experience-optimization.md')
console.log('   - Vite 构建优化文档: https://vitejs.dev/guide/build.html')
console.log('\n🔧 测试构建性能：')
console.log('   node scripts/measure-build-time.js\n')
