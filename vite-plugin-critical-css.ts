/**
 * Vite 插件：自动内联关键 CSS
 * 在构建时将关键 CSS 注入到 HTML <head> 中
 *
 * 优化特性：
 * - 自动压缩 CSS (移除注释、空格、冗余分号)
 * - 支持 CSP nonce 占位符
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
  /** CSP nonce 占位符 */
  noncePlaceholder?: string
}

/**
 * 高效压缩 CSS
 * 移除注释、多余空格、冗余分号，保持最小体积
 */
function minifyCSS(css: string): string {
  return (
    css
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
      .replace(/\/\/[^\n]*/g, '') // 移除行注释
      .replace(/\s+/g, ' ') // 压缩连续空格
      .replace(/\s*([{}:;,>~+])\s*/g, '$1') // 移除符号周围空格
      .replace(/;}/g, '}') // 移除最后一个分号
      .replace(/\s*!important/g, '!important') // 压缩 !important
      // 额外优化
      .replace(/:\s*0px/g, ':0') // 0px → 0
      .replace(/:\s*0em/g, ':0') // 0em → 0
      .replace(/:\s*0%/g, ':0') // 0% → 0
      .replace(/:\s*0\s+0\s+0\s+0/g, ':0') // 0 0 0 0 → 0
      .trim()
  )
}

export function criticalCSSPlugin(options: CriticalCSSOptions = {}): Plugin {
  const {
    path: cssPath = 'src/styles/critical.css',
    minify = true,
    noncePlaceholder = '__CSP_NONCE__',
  } = options

  let criticalCSS = ''
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-critical-css',
    enforce: 'post',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    buildStart() {
      try {
        const absolutePath = resolve(config.root, cssPath)

        if (!existsSync(absolutePath)) {
          config.logger.warn(`⚠️ Critical CSS not found: ${cssPath}`)
          return
        }

        const rawCSS = readFileSync(absolutePath, 'utf-8')
        criticalCSS = minify ? minifyCSS(rawCSS) : rawCSS

        const sizeKB = (criticalCSS.length / 1024).toFixed(2)
        const originalKB = (rawCSS.length / 1024).toFixed(2)
        const saved = ((1 - criticalCSS.length / rawCSS.length) * 100).toFixed(1)

        config.logger.info(`✅ Critical CSS: ${originalKB}KB → ${sizeKB}KB (${saved}% saved)`)
      } catch (error) {
        config.logger.error(`❌ Failed to load critical CSS: ${error}`)
      }
    },

    transformIndexHtml(html) {
      if (!criticalCSS) return html

      // 生成带 nonce 占位符的 style 标签（用于 CSP）
      const styleTag = `<style id="critical-css" nonce="${noncePlaceholder}">${criticalCSS}</style>`

      // 插入到 <head> 的最前面，确保最先加载
      return html.replace(
        /<head([^>]*)>/i,
        `<head$1>\n    ${styleTag}\n    <!-- Critical CSS inlined for FCP optimization -->`
      )
    },
  }
}
