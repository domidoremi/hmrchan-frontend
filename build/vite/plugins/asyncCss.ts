import type { Plugin } from 'vite'

/**
 * Emits both a preload hint and a normal stylesheet link. The former
 * media=print/onload technique violated strict CSP and could leave production
 * pages with critical CSS only.
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
