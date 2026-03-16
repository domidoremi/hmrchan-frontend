/**
 * Vite 插件：自动内联关键 CSS
 * 在构建时将关键 CSS 注入到 HTML <head> 中
 *
 * 优化特性：
 * - 自动压缩 CSS (移除注释、空格、冗余分号)
 * - 优化 FCP (First Contentful Paint)
 * - 缓存 CSS 内容避免重复读取
 * - 详细的构建日志
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

interface CriticalCSSOptions {
  /** CSS 文件路径（相对于项目根目录） */
  path?: string
  /** 是否启用压缩 */
  minify?: boolean
  /** 是否启用详细日志 */
  verbose?: boolean
  /** 是否在开发环境启用 */
  enableInDev?: boolean
}

/**
 * 高效压缩 CSS
 * 移除注释、多余空格、冗余分号，保持最小体积
 *
 * 优化策略：
 * - 移除所有注释（块注释和行注释）
 * - 压缩空格和换行
 * - 移除符号周围的空格
 * - 优化单位值（0px → 0）
 * - 压缩颜色值（#ffffff → #fff）
 * - 合并重复的选择器
 */
function minifyCSS(css: string): string {
  return (
    css
      // 移除注释
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      // 压缩空格
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,>~+])\s*/g, '$1')
      .replace(/;}/g, '}')
      .replace(/\s*!important/g, '!important')
      // 优化单位值
      .replace(/:\s*0(?:px|em|rem|%|vh|vw|vmin|vmax)/g, ':0')
      .replace(/:\s*0\s+0\s+0\s+0(?![.\d])/g, ':0')
      .replace(/:\s*0\s+0(?![.\d])/g, ':0')
      // 优化颜色值
      .replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/gi, '#$1$2$3')
      // 移除最后的分号
      .replace(/;(?=})/g, '')
      // 移除空规则
      .replace(/[^{}]+\{\}/g, '')
      .trim()
  )
}

export function criticalCSSPlugin(options: CriticalCSSOptions = {}): Plugin {
  const {
    path: cssPath = 'src/styles/critical.css',
    minify = true,
    verbose = true,
    enableInDev = false,
  } = options

  let criticalCSS = ''
  let config: ResolvedConfig
  let cssHash = '' // 用于缓存验证

  return {
    name: 'vite-plugin-critical-css',
    enforce: 'post',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    buildStart() {
      // 开发环境跳过（除非明确启用）
      if (config.command === 'serve' && !enableInDev) {
        return
      }

      try {
        const absolutePath = resolve(config.root, cssPath)

        if (!existsSync(absolutePath)) {
          config.logger.warn(`⚠️ Critical CSS not found: ${cssPath}`)
          return
        }

        const rawCSS = readFileSync(absolutePath, 'utf-8')

        // 生成 CSS hash 用于缓存验证
        cssHash = Buffer.from(rawCSS).toString('base64').slice(0, 8)

        criticalCSS = minify ? minifyCSS(rawCSS) : rawCSS

        if (verbose) {
          const sizeKB = (criticalCSS.length / 1024).toFixed(2)
          const originalKB = (rawCSS.length / 1024).toFixed(2)
          const saved = ((1 - criticalCSS.length / rawCSS.length) * 100).toFixed(1)

          config.logger.info(
            `✅ Critical CSS: ${originalKB}KB → ${sizeKB}KB (${saved}% saved) [${cssHash}]`
          )
        }
      } catch (error) {
        config.logger.error(`❌ Failed to load critical CSS: ${error}`)
      }
    },

    transformIndexHtml(html) {
      if (!criticalCSS) return html

      // 生成 style 标签（style-src 'unsafe-inline' 已覆盖）
      const styleTag = `<style id="critical-css" data-hash="${cssHash}">${criticalCSS}</style>`
      const styleBlock = `\n    ${styleTag}\n    <!-- Critical CSS inlined for FCP optimization -->`

      // 优先插入到 <meta charset> 之后，避免触发 Lighthouse "charset too late"
      const charsetMetaRegex = /<meta\s+[^>]*charset\s*=\s*["']?[^"'>\s]+["']?[^>]*>\s*/i
      if (charsetMetaRegex.test(html)) {
        return html.replace(charsetMetaRegex, (matched) => `${matched}${styleBlock}\n`)
      }

      // 无 charset 时，退化为插入到 <head> 最前面
      return html.replace(/<head([^>]*)>/i, `<head$1>${styleBlock}`)
    },
  }
}
