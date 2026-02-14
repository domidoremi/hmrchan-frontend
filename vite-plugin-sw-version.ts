/**
 * Vite Plugin: Service Worker Version Injection
 *
 * 在构建完成后，将 dist/sw.js 中的 __SW_CACHE_VERSION__ 占位符
 * 替换为基于 package.json 版本 + git hash + 构建号生成的版本字符串。
 *
 * 这样 public/sw.js 源文件永远不会被修改，避免 git 脏树问题。
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'
import type { Plugin } from 'vite'

const PLACEHOLDER = '__SW_CACHE_VERSION__'

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return Date.now().toString(36).slice(-7)
  }
}

function getGitCommitCount(): string {
  try {
    return execSync('git rev-list --count HEAD').toString().trim()
  } catch {
    return '0'
  }
}

export function swVersionPlugin(): Plugin {
  let outDir = 'dist'

  return {
    name: 'vite-plugin-sw-version',
    apply: 'build',

    configResolved(config) {
      outDir = config.build.outDir || 'dist'
    },

    closeBundle() {
      const swPath = resolve(process.cwd(), outDir, 'sw.js')

      if (!existsSync(swPath)) {
        console.warn('[sw-version] sw.js not found in output directory, skipping')
        return
      }

      const content = readFileSync(swPath, 'utf-8')

      if (!content.includes(PLACEHOLDER)) {
        console.warn('[sw-version] Placeholder not found in sw.js, skipping')
        return
      }

      // Read version from package.json
      const pkg = JSON.parse(
        readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
      )
      const version = (pkg.version || '0.0.0').replace(/\./g, '-')
      const hash = getGitHash()
      const buildNum = getGitCommitCount()

      const cacheVersion = `v${version}-${hash}-b${buildNum}`

      writeFileSync(swPath, content.replace(PLACEHOLDER, cacheVersion), 'utf-8')

      console.log(`✅ SW version injected: ${cacheVersion}`)
    },
  }
}
