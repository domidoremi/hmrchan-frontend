import type { Plugin } from 'vite'

/**
 * 将入口样式表转换为 preload + 常规 stylesheet。
 *
 * 说明：
 * - 旧方案依赖 `media="print" + onload="this.media='all'"` 规避首屏阻塞；
 * - 但站点当前使用严格 CSP，禁止内联事件处理器，导致 onload 无法执行；
 * - 结果是主样式表长期停留在 print 媒体类型，页面只剩 critical CSS，表现为“样式几乎全部丢失”。
 *
 * 因此这里保留 preload，但恢复为正常 stylesheet，优先保证线上可用性与 CSP 兼容性。
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

        const stylesheetAttrs = attrs.replace(/\brel=(["'])stylesheet\1/i, 'rel="stylesheet"')

        return `<link ${preloadAttrs}>\n    <link ${stylesheetAttrs}>`
      })
    },
  }
}
