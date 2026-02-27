/**
 * 转换表情图片为 WebP 格式
 * 运行: node scripts/convert-expressions.mjs
 */

import sharp from 'sharp'
import { readdir, mkdir } from 'fs/promises'
import { join, parse } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// 中文文件名 -> 英文文件名映射
const nameMapping = {
  '可怜': 'kawaii',
  '吃惊': 'surprised',
  '坐': 'sitting',
  '生气': 'angry',
  '疑惑': 'confused',
  '睡觉': 'sleeping',
  // 新增表情
  '11': 'laughing',
  '图层 1': 'thinking',
  '图层 2': 'happy',
  '站': 'standing',
  '跑步': 'running',
}

const sourceDir = join(rootDir, '图片')
const targetDir = join(rootDir, 'public', 'images', 'expressions')

async function convertImages() {
  console.log('🎨 开始转换表情图片...\n')

  // 确保目标目录存在
  await mkdir(targetDir, { recursive: true })

  // 读取源目录（优先）和目标目录中的 PNG 文件
  const sourceFiles = await readdir(sourceDir).catch(() => [])
  const targetFiles = await readdir(targetDir).catch(() => [])

  const sourcePngs = sourceFiles.filter(f => f.endsWith('.png'))
  const targetPngs = targetFiles.filter(f => f.endsWith('.png'))

  const pngFiles = [...new Set([...sourcePngs, ...targetPngs])]

  console.log(`📁 找到 ${pngFiles.length} 个 PNG 文件\n`)

  for (const file of pngFiles) {
    const { name } = parse(file)
    const englishName = nameMapping[name] || name

    // 优先从源目录读取，否则从目标目录读取
    const sourcePath = join(sourceDir, file)
    const targetSourcePath = join(targetDir, file)
    const inputPath = sourcePngs.includes(file) ? sourcePath : targetSourcePath
    const targetPath = join(targetDir, `${englishName}.webp`)

    try {
      const info = await sharp(inputPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(targetPath)

      const originalSize = (await sharp(inputPath).metadata()).size
      const newSize = info.size
      const saved = ((1 - newSize / originalSize) * 100).toFixed(1)

      console.log(`✅ ${name}.png → ${englishName}.webp`)
      console.log(`   原始: ${(originalSize / 1024).toFixed(1)}KB`)
      console.log(`   WebP: ${(newSize / 1024).toFixed(1)}KB`)
      console.log(`   节省: ${saved}%\n`)
    } catch (err) {
      console.error(`❌ 转换失败: ${file}`)
      console.error(`   错误: ${err.message}\n`)
    }
  }

  console.log('🎉 转换完成!')
  console.log(`📂 输出目录: ${targetDir}`)
}

convertImages().catch(console.error)
