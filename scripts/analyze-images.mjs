/**
 * 分析表情图片质量与尺寸
 */

import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const targetDir = join(__dirname, '..', 'public', 'images', 'expressions')

async function analyzeImages() {
  console.log('📊 表情图片质量与尺寸分析\n')
  console.log('| 文件 | 尺寸 | 大小 | B/px |')
  console.log('|------|------|------|------|')

  const files = await readdir(targetDir)
  const webpFiles = files.filter(f => f.endsWith('.webp'))

  for (const file of webpFiles) {
    const filePath = join(targetDir, file)
    const meta = await sharp(filePath).metadata()
    const stats = await stat(filePath)
    const sizeKB = (stats.size / 1024).toFixed(1)
    const pixels = meta.width * meta.height
    const bytesPerPixel = stats.size / pixels

    console.log(`| ${file} | ${meta.width}x${meta.height} | ${sizeKB}KB | ${bytesPerPixel.toFixed(2)} |`)
  }

  console.log('\n💡 质量说明:')
  console.log('   - B/px < 0.5: 高压缩/可能模糊')
  console.log('   - B/px 0.5-1.0: 平衡质量')
  console.log('   - B/px > 1.0: 高质量/细节丰富')
}

analyzeImages().catch(console.error)
