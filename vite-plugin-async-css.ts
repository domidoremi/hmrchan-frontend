import type { Plugin } from 'vite'

/**
 * 将入口样式表转换为 preload + 非阻塞 stylesheet
 * 仅在构建产物中生效，避免 dev 环境行为差异。
 */
export function asyncCssPlugin(): Plugin {
  return {
    name: 'vite-plugin-async-css',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/<link\s+([^>]*\brel=["']stylesheet["'][^>]*)>/gi, (_full, attrs) => {
        if (/\bdata-no-async-css\b/i.test(attrs)) {
          return `<link ${attrs}>`
        }

        const preloadAttrs = attrs.replace(/\brel=(["'])stylesheet\1/i, 'rel="preload" as="style"')

        let asyncAttrs = attrs.replace(/\brel=(["'])stylesheet\1/i, 'rel="stylesheet"')
        if (!/\bmedia=/.test(asyncAttrs)) {
          asyncAttrs += ' media="print" onload="this.media=\'all\'"'
        }

        return `<link ${preloadAttrs}>\n    <link ${asyncAttrs}>`
      })
    },
  }
}
