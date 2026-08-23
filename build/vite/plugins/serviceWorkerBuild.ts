import { resolve } from 'node:path'
import { build, type Plugin, type ResolvedConfig } from 'vite'
import { getSwCacheVersion } from '../swCacheVersion.ts'

interface ServiceWorkerBuildPluginOptions {
  entry?: string
  outputFile?: string
}

export function serviceWorkerBuildPlugin(options: ServiceWorkerBuildPluginOptions = {}): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-service-worker-build',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    async closeBundle() {
      const root = config.root
      const swEntry = resolve(root, options.entry ?? 'src/sw/index.ts')
      const outputFile = options.outputFile ?? 'sw.js'
      const swCacheVersion = getSwCacheVersion(root)

      await build({
        configFile: false,
        root,
        publicDir: false,
        logLevel: config.logLevel,
        mode: config.mode,
        resolve: {
          alias: config.resolve.alias,
        },
        define: {
          __SW_CACHE_VERSION__: JSON.stringify(swCacheVersion),
          __BUILD_HASH__: JSON.stringify(''),
          __BUILD_TIME__: JSON.stringify(''),
          __PROD__: true,
          __DEV__: false,
        },
        build: {
          target: config.build.target,
          outDir: config.build.outDir,
          emptyOutDir: false,
          sourcemap: config.build.sourcemap,
          minify: config.build.minify,
          cssCodeSplit: false,
          reportCompressedSize: false,
          lib: {
            entry: swEntry,
            name: 'HmrchanServiceWorker',
            formats: ['iife'],
            fileName: () => 'sw',
          },
          rollupOptions: {
            output: {
              entryFileNames: outputFile,
              extend: false,
            },
          },
        },
      })
    },
  }
}
