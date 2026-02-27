/**
 * 统一缩放表情图片尺寸
 * 运行: node scripts/resize-expressions.mjs
 */

import sharp from 'sharp'
import { readdir, mkdir } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const targetDir = join(__dirname, '..', 'public', 'images', 'expressions')
const outputDir = join(targetDir, 'resized') // 输出到子目录

// 目标高度（像素）
const TARGET_HEIGHT = 400
const WEBP_QUALITY = 92

async function resizeImages() {
  console.log('📐 开始统一缩放表情图片...\n')
  console.log(`🎯 目标高度: ${TARGET_HEIGHT}px`)
  console.log(`🎨 WebP 质量: ${WEBP_QUALITY}\n`)

  // 创建输出目录
  await mkdir(outputDir, { recursive: true })

  const files = await readdir(targetDir)
  const webpFiles = files.filter(f => f.endsWith('.webp'))

  console.log(`📁 找到 ${webpFiles.length} 个 WebP 文件\n`)

  for (const file of webpFiles) {
    const filePath = join(targetDir, file)
    const outputPath = join(outputDir, file)
    const meta = await sharp(filePath).metadata()

    // 如果高度已经接近目标，直接复制
    if (meta.height && Math.abs(meta.height - TARGET_HEIGHT) < 50) {
      console.log(`⏭️  ${file} (${meta.width}x${meta.height}) - 尺寸合适，直接复制`)
      const fs = await import('fs/promises')
      await fs.copyFile(filePath, outputPath)
      continue
    }

    try {
      // 缩放到目标高度，保持宽高比
      const info = await sharp(filePath)
        .resize(null, TARGET_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true // 不放大小图
        })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toFile(outputPath)

      console.log(`✅ ${file}`)
      console.log(`   ${meta.width}x${meta.height} → ${info.width}x${info.height}`)
      console.log(`   大小: ${(info.size / 1024).toFixed(1)}KB\n`)
    } catch (err) {
      console.error(`❌ 处理失败: ${file}`)
      console.error(`   错误: ${err.message}\n`)
    }
  }

  console.log('🎉 缩放完成!')
  console.log(`📂 输出目录: ${outputDir}`)
  console.log('💡 请手动将 resized 目录中的文件复制到 expressions 目录')
}

resizeImages().catch(console.error)
