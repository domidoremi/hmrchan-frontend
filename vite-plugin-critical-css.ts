/**
 * Vite 插件：自动内联关键 CSS
 * 在构建时将关键 CSS 注入到 HTML <head> 中
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { Plugin } from 'vite'

export function criticalCSSPlugin(): Plugin {
  let criticalCSS = ''

  return {
    name: 'vite-plugin-critical-css',

    // 在构建开始时读取关键 CSS
    buildStart() {
      try {
        const criticalCSSPath = join(__dirname, 'src/styles/critical.css')
        criticalCSS = readFileSync(criticalCSSPath, 'utf-8')

        // 压缩 CSS（移除注释和多余空格）
        criticalCSS = criticalCSS
          .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
          .replace(/\s+/g, ' ') // 压缩空格
          .replace(/\s*([{}:;,])\s*/g, '$1') // 移除符号周围空格
          .trim()

        console.log(`✅ Critical CSS loaded: ${(criticalCSS.length / 1024).toFixed(2)} KB`)
      } catch {
        console.warn('⚠️ Critical CSS file not found, skipping...')
      }
    },

    // 在生成 HTML 时注入关键 CSS
    transformIndexHtml(html) {
      if (!criticalCSS) return html

      // 在 </head> 前插入关键 CSS
      const styleTag = `
    <style id="critical-css">
      ${criticalCSS}
    </style>
    <!-- Critical CSS inlined for faster First Contentful Paint -->
  `

      return html.replace('</head>', `${styleTag}</head>`)
    },
  }
}
