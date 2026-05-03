/**
 * Vite Plugin: Subresource Integrity (SRI)
 *
 * 构建完成后为 dist 中所有 HTML 文件里的 <script> 和 <link> 标签
 * 注入 integrity 属性（SHA-384 哈希），防止资源被篡改。
 *
 * 仅处理同源资源（/assets/... 路径），跳过外部 URL。
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
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

function walkHtmlFiles(rootDir: string): string[] {
  const htmlFiles: string[] = []

  for (const entry of readdirSync(rootDir)) {
    const absolutePath = join(rootDir, entry)
    const stats = statSync(absolutePath)

    if (stats.isDirectory()) {
      htmlFiles.push(...walkHtmlFiles(absolutePath))
      continue
    }

    if (absolutePath.toLowerCase().endsWith('.html')) {
      htmlFiles.push(absolutePath)
    }
  }

  return htmlFiles
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
      if (!existsSync(outputDir)) {
        console.warn('[SRI] output directory not found, skipping')
        return
      }

      let count = 0
      const htmlFiles = walkHtmlFiles(outputDir)

      if (htmlFiles.length === 0) {
        console.warn('[SRI] no HTML files found in output directory, skipping')
        return
      }

      for (const htmlPath of htmlFiles) {
        let html = readFileSync(htmlPath, 'utf-8')

        // 匹配 <script src="/assets/..."> 标签（含 type="module"）
        html = html.replace(
          /<script\b([^>]*)\bsrc="(\/assets\/[^"]+)"([^>]*)>/g,
          (match, before, src, after) => {
            if (match.includes('integrity=')) return match
            const filePath = resolve(process.cwd(), outDir, src.slice(1))
            const integrity = computeIntegrity(filePath, algorithm)
            if (!integrity) return match
            count++
            return `<script${before}src="${src}"${after} integrity="${integrity}">`
          }
        )

        // 匹配 <link rel="stylesheet" href="/assets/..."> 标签
        html = html.replace(
          /<link\b([^>]*)\bhref="(\/assets\/[^"]+\.css)"([^>]*)>/g,
          (match, before, href, after) => {
            if (match.includes('integrity=')) return match
            const filePath = resolve(process.cwd(), outDir, href.slice(1))
            const integrity = computeIntegrity(filePath, algorithm)
            if (!integrity) return match
            count++
            return `<link${before}href="${href}"${after} integrity="${integrity}">`
          }
        )

        // 匹配 <link rel="modulepreload" href="/assets/..."> 标签
        html = html.replace(
          /<link\b([^>]*)\bhref="(\/assets\/[^"]+\.js)"([^>]*)>/g,
          (match, before, href, after) => {
            if (match.includes('integrity=')) return match
            const filePath = resolve(process.cwd(), outDir, href.slice(1))
            const integrity = computeIntegrity(filePath, algorithm)
            if (!integrity) return match
            count++
            return `<link${before}href="${href}"${after} integrity="${integrity}">`
          }
        )

        writeFileSync(htmlPath, html, 'utf-8')
      }

      if (verbose) {
        console.log(`✅ SRI: ${count} resources tagged with ${algorithm} integrity`)
      }
    },
  }
}
