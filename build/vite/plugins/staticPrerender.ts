import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { createPrerenderedHtml, STATIC_PRERENDER_ROUTES } from '../../../src/edge/prerenderHtml'

type PrerenderRouteTarget = {
  path: string
  outputFile: string
}

function toRouteTargets(): PrerenderRouteTarget[] {
  const staticTargets = STATIC_PRERENDER_ROUTES.map((path) => ({
    path,
    // Emit flat HTML files so Cloudflare Pages serves `/route` directly
    // instead of canonicalizing collection pages to `/route/`.
    outputFile: path === '/' ? 'index.html' : `${path.replace(/^\/+/, '')}.html`,
  }))

  return [
    ...staticTargets,
    {
      path: '/404',
      outputFile: '404.html',
    },
    {
      path: '/404',
      outputFile: '404/index.html',
    },
  ]
}

export function staticPrerenderPlugin(): Plugin {
  let outDir = 'dist'

  return {
    name: 'vite-plugin-static-prerender',
    apply: 'build',

    configResolved(config) {
      outDir = config.build.outDir || 'dist'
    },

    writeBundle() {
      const outputDir = resolve(process.cwd(), outDir)
      const indexPath = resolve(outputDir, 'index.html')

      if (!existsSync(indexPath)) {
        console.warn('[static-prerender] index.html not found in output directory, skipping')
        return
      }

      const template = readFileSync(indexPath, 'utf-8')
      const targets = toRouteTargets()

      for (const target of targets) {
        const prerendered = createPrerenderedHtml(template, target.path)
        const outputPath = resolve(outputDir, target.outputFile)
        mkdirSync(dirname(outputPath), { recursive: true })
        writeFileSync(outputPath, prerendered, 'utf-8')
      }

      console.log(
        `✅ Static prerendered ${targets.length} HTML artifacts for public routes and 404 fallback`
      )
    },
  }
}
