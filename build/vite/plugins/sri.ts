/**
 * Vite Plugin: Subresource Integrity (SRI)
 *
 * 构建完成后为 dist/index.html 中的 <script> 和 <link> 标签
 * 注入 integrity 属性（SHA-384 哈希），防止资源被篡改。
 *
 * 仅处理同源资源（/assets/... 路径），跳过外部 URL。
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

interface SRIPluginOptions {
  /** 哈希算法，默认 sha384 */
  algorithm?: 'sha256' | 'sha384' | 'sha512'
  /** 是否启用详细日志 */
  verbose?: boolean
}

function computeIntegrity(filePath: string, algorithm: string): string | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath)
  const hash = createHash(algorithm).update(content).digest('base64')
  return `${algorithm}-${hash}`
}

function collectHtmlFiles(directory: string): string[] {
  if (!existsSync(directory)) return []

  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry)
    if (statSync(absolutePath).isDirectory()) {
      files.push(...collectHtmlFiles(absolutePath))
    } else if (absolutePath.endsWith('.html')) {
      files.push(absolutePath)
    }
  }
  return files
}

export function injectSriIntoHtml(
  html: string,
  outputDir: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'
): { html: string; count: number } {
  let count = 0

  const injectIntegrity = (match: string, before: string, source: string, after: string) => {
    if (match.includes('integrity=')) return match
    const integrity = computeIntegrity(resolve(outputDir, source.slice(1)), algorithm)
    if (!integrity) return match
    count += 1
    return { match, before, source, after, integrity }
  }

  const withScriptIntegrity = html.replace(
    /<script\b([^>]*)\bsrc="(\/assets\/[^"]+)"([^>]*)>/g,
    (match, before, src, after) => {
      const result = injectIntegrity(match, before, src, after)
      return typeof result === 'string'
        ? result
        : `<script${result.before}src="${result.source}"${result.after} integrity="${result.integrity}">`
    }
  )

  const withLinkIntegrity = withScriptIntegrity.replace(
    /<link\b([^>]*)\bhref="(\/assets\/[^"]+\.(?:css|js))"([^>]*)>/g,
    (match, before, href, after) => {
      const result = injectIntegrity(match, before, href, after)
      return typeof result === 'string'
        ? result
        : `<link${result.before}href="${result.source}"${result.after} integrity="${result.integrity}">`
    }
  )

  return { html: withLinkIntegrity, count }
}

export function sriPlugin(options: SRIPluginOptions = {}): Plugin {
  const { algorithm = 'sha384', verbose = true } = options
  let outDir = 'dist'

  return {
    name: 'vite-plugin-sri',
    apply: 'build',
    enforce: 'post',

    configResolved(config) {
      outDir = config.build.outDir || 'dist'
    },

    closeBundle() {
      const outputDir = resolve(process.cwd(), outDir)
      const htmlPaths = collectHtmlFiles(outputDir)
      if (htmlPaths.length === 0) {
        console.warn('[SRI] No HTML files found, skipping')
        return
      }

      let count = 0
      for (const htmlPath of htmlPaths) {
        const source = readFileSync(htmlPath, 'utf-8')
        const result = injectSriIntoHtml(source, outputDir, algorithm)
        if (result.count > 0) {
          writeFileSync(htmlPath, result.html, 'utf-8')
          count += result.count
        }
      }

      if (verbose) {
        console.log(
          `✅ SRI: ${count} resources tagged with ${algorithm} integrity across ${htmlPaths.length} HTML files`
        )
      }
    },
  }
}
