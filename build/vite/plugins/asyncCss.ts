import type { Plugin } from 'vite'

/**
 * Converts entry stylesheets into preload links followed by regular stylesheets.
 *
 * The previous media="print" plus inline onload approach conflicted with the strict CSP,
 * leaving the main stylesheet in print mode and rendering only critical CSS.
 *
 * Keep preload discovery, then load a regular stylesheet to preserve availability and CSP compatibility.
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
