import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

// Inlines a validated reset-layer subset so first paint is usable before full CSS loads.

interface CriticalCSSOptions {
  path?: string
  minify?: boolean
  verbose?: boolean
  enableInDev?: boolean
}

const CRITICAL_LAYER_PREAMBLE =
  '@layer reset,foundation,semantics,components,scene-roles,presets,enhancers,utilities,overrides;'
const CRITICAL_LAYER_NAME = 'reset'
const UNSAFE_CRITICAL_RESET_PATTERN = /\*,\*::before,\*::after\{[^}]*padding:0(?:[;}])[^}]*\}/i

export function minifyCSS(css: string): string {
  return css

    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s*!important/g, '!important')

    .replace(/:\s*0(?:px|em|rem|%|vh|vw|vmin|vmax)/g, ':0')
    .replace(/:\s*0\s+0\s+0\s+0(?![.\d])/g, ':0')
    .replace(/:\s*0\s+0(?![.\d])/g, ':0')

    .replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/gi, '#$1$2$3')

    .replace(/;(?=})/g, '')

    .replace(/[^{}]+\{\}/g, '')
    .trim()
}

export function validateCriticalCSS(css: string): void {
  if (!css) {
    throw new Error('Critical CSS is empty')
  }

  if (UNSAFE_CRITICAL_RESET_PATTERN.test(css)) {
    throw new Error(
      'Critical CSS contains an unsafe universal padding reset. Scope the reset or move it into layered main styles instead.'
    )
  }
}

export function toLayeredCriticalCSS(css: string): string {
  return `${CRITICAL_LAYER_PREAMBLE}@layer ${CRITICAL_LAYER_NAME}{${css}}`
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
  let cssHash = ''

  return {
    name: 'vite-plugin-critical-css',
    enforce: 'post',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    buildStart() {
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

        cssHash = Buffer.from(rawCSS).toString('base64').slice(0, 8)

        const minifiedCSS = minify ? minifyCSS(rawCSS) : rawCSS

        validateCriticalCSS(minifiedCSS)
        criticalCSS = toLayeredCriticalCSS(minifiedCSS)

        if (verbose) {
          const sizeKB = (minifiedCSS.length / 1024).toFixed(2)
          const originalKB = (rawCSS.length / 1024).toFixed(2)
          const saved = ((1 - minifiedCSS.length / rawCSS.length) * 100).toFixed(1)

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

      if (!criticalCSS.includes('@layer')) {
        throw new Error('Critical CSS must be emitted as layered CSS')
      }

      const styleTag = `<style id="critical-css" data-hash="${cssHash}">${criticalCSS}</style>`
      const styleBlock = `\n    ${styleTag}\n    <!-- Critical CSS inlined for FCP optimization -->`

      const charsetMetaRegex = /<meta\s+[^>]*charset\s*=\s*["']?[^"'>\s]+["']?[^>]*>\s*/i
      if (charsetMetaRegex.test(html)) {
        return html.replace(charsetMetaRegex, (matched) => `${matched}${styleBlock}\n`)
      }

      return html.replace(/<head([^>]*)>/i, `<head$1>${styleBlock}`)
    },
  }
}
