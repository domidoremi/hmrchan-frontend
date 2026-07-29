#!/usr/bin/env node

import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import { resolve, basename } from 'path'

const SOURCE_ICON = process.argv[2]
const OUTPUT_DIR = resolve(process.cwd(), 'public/icons')

if (!SOURCE_ICON) {
  console.error('❌ 错误：请提供源图标文件路径')
  console.log('')
  console.log('使用方法：')
  console.log('  node scripts/generate-icons.js <source-icon.png>')
  console.log('')
  console.log('示例：')
  console.log('  node scripts/generate-icons.js source-icon-512.png')
  process.exit(1)
}

if (!existsSync(SOURCE_ICON)) {
  console.error(`❌ 错误：源图标文件不存在: ${SOURCE_ICON}`)
  process.exit(1)
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png', purpose: 'Android 小图标' },
  { size: 96, name: 'icon-96x96.png', purpose: 'Android 中图标' },
  { size: 128, name: 'icon-128x128.png', purpose: 'Android 大图标' },
  { size: 144, name: 'icon-144x144.png', purpose: 'Windows 磁贴' },
  { size: 152, name: 'icon-152x152.png', purpose: 'iOS Safari' },
  { size: 192, name: 'icon-192x192.png', purpose: 'Android 标准' },
  { size: 384, name: 'icon-384x384.png', purpose: 'Android 高清' },
  { size: 512, name: 'icon-512x512.png', purpose: 'Android 超高清' },
]

const CONFIG = {
  MASKABLE: {
    ICON_RATIO: 0.8,
    PADDING_RATIO: 0.1,
    BACKGROUND_COLOR: { r: 139, g: 92, b: 246, alpha: 1 }, // #8b5cf6
  },
  SHORTCUT: {
    SIZE: 96,
    BORDER_RADIUS: 20,
    FONT_SIZE: 48,
  },
}

const SHORTCUT_ICONS = [
  { name: 'shortcut-home.png', emoji: '🏠', color: '#8b5cf6' },
  { name: 'shortcut-explore.png', emoji: '🔍', color: '#06b6d4' },
  { name: 'shortcut-favorites.png', emoji: '❤️', color: '#ef4444' },
  { name: 'shortcut-settings.png', emoji: '⚙️', color: '#6b7280' },
]

async function generateStandardIcons() {
  console.log('📦 生成标准图标...')
  console.log('')

  for (const { size, name, purpose } of ICON_SIZES) {
    const outputPath = resolve(OUTPUT_DIR, name)

    try {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath)

      console.log(`✅ ${name.padEnd(25)} ${size}x${size}  ${purpose}`)
    } catch (error) {
      console.error(`❌ 生成 ${name} 失败:`, error.message)
    }
  }
}

async function generateMaskableIcons() {
  console.log('')
  console.log('🎭 生成 Maskable 图标...')
  console.log('')

  const maskableSizes = [
    { size: 192, name: 'icon-maskable-192x192.png' },
    { size: 512, name: 'icon-maskable-512x512.png' },
  ]

  for (const { size, name } of maskableSizes) {
    const outputPath = resolve(OUTPUT_DIR, name)

    try {
      const iconSize = Math.floor(size * CONFIG.MASKABLE.ICON_RATIO)
      const padding = Math.floor(size * CONFIG.MASKABLE.PADDING_RATIO)

      const resizedIcon = await sharp(SOURCE_ICON)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: CONFIG.MASKABLE.BACKGROUND_COLOR,
        },
      })
        .composite([
          {
            input: resizedIcon,
            top: padding,
            left: padding,
          },
        ])
        .png()
        .toFile(outputPath)

      console.log(`✅ ${name.padEnd(30)} ${size}x${size}  Maskable`)
    } catch (error) {
      console.error(`❌ 生成 ${name} 失败:`, error.message)
    }
  }
}

async function generateShortcutIcons() {
  console.log('')
  console.log('🔗 生成快捷方式图标...')
  console.log('')

  const { SIZE, BORDER_RADIUS, FONT_SIZE } = CONFIG.SHORTCUT

  for (const { name, emoji, color } of SHORTCUT_ICONS) {
    const outputPath = resolve(OUTPUT_DIR, name)

    try {
      const svg = `
        <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${SIZE}" height="${SIZE}" rx="${BORDER_RADIUS}" fill="${color}"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="${FONT_SIZE}">${emoji}</text>
        </svg>
      `

      await sharp(Buffer.from(svg)).png().toFile(outputPath)

      console.log(`✅ ${name.padEnd(25)} ${SIZE}x${SIZE}  ${emoji}`)
    } catch (error) {
      console.error(`❌ 生成 ${name} 失败:`, error.message)
    }
  }
}

async function validateSourceIcon() {
  try {
    const metadata = await sharp(SOURCE_ICON).metadata()

    console.log('📋 源图标信息：')
    console.log(`   文件: ${basename(SOURCE_ICON)}`)
    console.log(`   尺寸: ${metadata.width}x${metadata.height}`)
    console.log(`   格式: ${metadata.format}`)
    console.log(`   通道: ${metadata.channels}`)
    console.log('')

    if (metadata.width < 512 || metadata.height < 512) {
      console.warn('⚠️  警告：源图标尺寸小于 512x512，可能影响大尺寸图标质量')
      console.log('')
    }

    if (metadata.format !== 'png') {
      console.warn('⚠️  警告：建议使用 PNG 格式的源图标')
      console.log('')
    }

    return true
  } catch (error) {
    console.error('❌ 无法读取源图标:', error.message)
    return false
  }
}

async function main() {
  console.log('🎨 PWA 图标生成器')
  console.log('═'.repeat(60))
  console.log('')

  const isValid = await validateSourceIcon()
  if (!isValid) {
    process.exit(1)
  }

  try {
    await Promise.all([generateStandardIcons(), generateMaskableIcons(), generateShortcutIcons()])

    console.log('')
    console.log('═'.repeat(60))
    console.log('✅ 所有图标生成完成！')
    console.log('')
    console.log('📁 输出目录:', OUTPUT_DIR)
    console.log('')
    console.log('💡 下一步：')
    console.log('  1. 检查生成的图标质量')
    console.log('  2. 使用 https://maskable.app 测试 maskable 图标')
    console.log('  3. 提交到 Git 仓库')
  } catch (error) {
    console.error('❌ 生成图标时出错:', error.message)
    process.exit(1)
  }
}

main()
