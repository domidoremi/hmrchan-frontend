/**
 * Vite 构建配置文件
 *
 * 主要配置：
 * - Vue 3 插件和开发工具
 * - 图片优化和关键 CSS 内联
 * - 依赖预构建优化
 * - 生产环境构建优化
 * - 代码分割策略（细粒度分割，优化缓存）
 * - 开发服务器配置和预热
 *
 * @see https://vite.dev/config/
 */

import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import type { IncomingMessage } from 'node:http'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { imagetools } from 'vite-imagetools'
import { criticalCSSPlugin } from './vite-plugin-critical-css'

type DevProxyServer = {
  on(event: 'proxyRes', listener: (proxyRes: IncomingMessage) => void): void
}

/** 构建时间戳，用于缓存破坏 */
const BUILD_TIME = new Date().toISOString()

/** 获取 Git commit hash */
function getBuildHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

const BUILD_HASH = getBuildHash()

/**
 * Cloudflare Pages 配置文件复制插件
 * 将 _headers 和 _redirects 复制到 dist 目录
 */
function cloudflarePagesPlugin(): Plugin {
  return {
    name: 'cloudflare-pages',
    apply: 'build',
    closeBundle() {
      const files = ['_headers', '_redirects']
      const outDir = resolve(process.cwd(), 'dist')

      for (const file of files) {
        const src = resolve(process.cwd(), file)
        const dest = resolve(outDir, file)

        // 检查源文件是否存在
        if (!existsSync(src)) {
          console.warn(`⚠️ ${file} not found, skipping`)
          continue
        }

        try {
          copyFileSync(src, dest)
          console.log(`✅ Copied ${file} to dist/`)
        } catch (error) {
          console.warn(`⚠️ Failed to copy ${file}:`, error)
        }
      }
    },
  }
}

export default defineConfig(({ mode }: { mode: string }) => {
  const isProd = mode === 'production'
  const isDev = mode === 'development'

  return {
    /**
     * 插件配置
     */
    plugins: [
      /** Vue 3 单文件组件支持 */
      vue({
        script: {
          /** 启用响应式语法糖 */
          defineModel: true,
          /** 启用 props 解构 */
          propsDestructure: true,
        },
        template: {
          /** 生产环境移除模板注释 */
          compilerOptions: {
            comments: !isProd,
          },
        },
      }),

      /** Vue JSX/TSX 语法支持 */
      vueJsx(),

      /** 开发环境启用 Vue DevTools */
      ...(isDev ? [vueDevTools()] : []),

      /** 图片优化：自动转 WebP，质量 85% */
      imagetools({
        defaultDirectives: (url) => {
          if (url.searchParams.has('format')) {
            return new URLSearchParams()
          }
          return new URLSearchParams({
            format: 'webp',
            quality: '85',
          })
        },
      }),

      /** 生产环境内联关键 CSS */
      ...(isProd ? [criticalCSSPlugin()] : []),

      /** Cloudflare Pages 配置文件复制 */
      ...(isProd ? [cloudflarePagesPlugin()] : []),
    ],

    /**
     * 路径解析配置
     */
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    /**
     * 编译时常量替换
     * 用于 Tree-shaking 和运行时优化
     */
    define: {
      /** 编译时间戳 */
      __BUILD_TIME__: JSON.stringify(BUILD_TIME),
      /** Git commit hash */
      __BUILD_HASH__: JSON.stringify(BUILD_HASH),
      /** 生产环境标识 */
      __PROD__: isProd,
      /** 开发环境标识 */
      __DEV__: isDev,
      /** Vue 生产环境优化标识 */
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },

    /**
     * 依赖预构建优化配置
     *
     * 优化策略：
     * - 预构建高频使用的核心依赖，加快开发服务器启动
     * - 排除按需加载的大型库，避免不必要的预构建
     * - 精确指定扫描入口，减少扫描时间
     */
    optimizeDeps: {
      /**
       * 需要预构建的核心依赖
       * 这些依赖在应用启动时就会被使用，预构建可以提升性能
       */
      include: [
        'vue',
        'vue-router',
        'pinia',
        'pinia-plugin-persistedstate',
        'vue-i18n',
        // 关键优化：预构建 lucide-vue-next 避免 1500+ 个单独请求
        'lucide-vue-next',
      ],

      /**
       * 排除预构建的依赖
       * 这些依赖按需加载，不需要预构建
       */
      exclude: ['vite-plugin-vue-devtools', 'gsap'],

      /** 是否强制重新预构建 */
      force: false,

      /** 依赖扫描入口 */
      entries: ['./src/main.ts', './src/views/HomePage.vue'],

      /** 立即启动，不等待扫描完成 */
      holdUntilCrawlEnd: false,
    },

    /**
     * Oxc 配置 (Vite 8 默认使用 Oxc 替代 esbuild)
     * Oxc 是用 Rust 编写的高性能 JavaScript 工具链
     */
    oxc: {
      /** 编译目标 */
      target: 'esnext',
      /** 启用所有优化 */
      minify: {
        compress: {
          /** 移除 console 语句 */
          drop_console: isProd,
          /** 移除 debugger 语句 */
          drop_debugger: isProd,
          /** 移除未使用的代码 */
          dead_code: true,
          /** 内联常量 */
          evaluate: true,
          /** 合并变量声明 */
          join_vars: true,
          /** 循环优化 */
          loops: true,
          /** 移除未使用的函数参数 */
          unused: true,
        },
        /** 启用变量名混淆 */
        mangle: isProd,
      },
    },

    /**
     * 构建配置
     *
     * 优化策略：
     * - 使用 ESNext 目标，生成现代化代码
     * - 使用 Oxc 进行快速压缩和转换
     * - 生产环境移除 console 和 debugger
     * - 细粒度代码分割，优化缓存策略
     * - 优化资源处理和文件命名
     */
    build: {
      /** 构建目标，使用最新的 ES 特性 */
      target: 'esnext',

      /** 禁用 sourcemap 以加快构建速度和减小体积 */
      sourcemap: false,

      /**
       * 生产环境代码压缩配置
       * Vite 8 使用 Oxc Minifier（已在 oxc 配置中设置）
       */
      minify: isProd,

      /**
       * 模块预加载配置
       * 关闭 polyfill 以减小体积
       */
      modulePreload: {
        polyfill: false,
      },

      /** chunk 大小警告阈值（KB） */
      chunkSizeWarningLimit: 500,

      /** 小于 4KB 的资源内联为 base64 */
      assetsInlineLimit: 4096,

      /** 启用 CSS 代码分割 */
      cssCodeSplit: true,

      /** 使用 Lightning CSS 压缩 (Vite 8 默认) */
      cssMinify: 'lightningcss' as const,

      /** CSS 目标版本 */
      cssTarget: 'esnext',

      /** 启用 CSS 树摇 */
      cssTreeShaking: true,

      /** 禁用压缩大小报告，加快构建速度 */
      reportCompressedSize: false,

      /** 构建前清空输出目录 */
      emptyOutDir: true,

      /**
       * 生产环境额外配置
       */
      ...(isProd && {
        assetsDir: 'assets',
        manifest: true,
      }),

      /**
       * Rolldown 打包配置
       * Rolldown 是用 Rust 编写的高性能打包器
       */
      rolldownOptions: {
        /** 外部依赖（不打包） */
        external: ['@/views/ComponentsShowcase.vue'],

        /** Tree-shaking 配置 */
        treeshake: {
          /** 启用模块副作用检测 */
          moduleSideEffects: 'no-external' as const,
          /** 移除未使用的导出 */
          propertyReadSideEffects: false as const,
          /** 移除未使用的代码 */
          unknownGlobalSideEffects: false,
        },

        output: {
          /**
           * 代码分割策略
           * 使用 Rolldown 的 codeSplitting 替代 manualChunks
           */
          codeSplitting: {
            groups: [
              // Vue 核心库（最稳定，变化最少）
              { test: /vue\/dist|@vue\/runtime/, name: 'vue-runtime' },
              { test: /@vue\/reactivity|@vue\/shared/, name: 'vue-reactivity' },
              { test: /@vue\//, name: 'vue-core' },

              // 路由和状态管理
              { test: /vue-router/, name: 'vue-router' },
              { test: /pinia/, name: 'pinia' },

              // i18n 独立
              { test: /vue-i18n|@intlify/, name: 'i18n' },

              // 图标库
              { test: /lucide-vue-next/, name: 'icons' },

              // GSAP 动画库
              { test: /gsap/, name: 'gsap' },

              // 其他 node_modules 依赖
              { test: /node_modules/, name: 'vendor' },
            ],
          },

          /** JS chunk 文件命名 */
          chunkFileNames: 'assets/js/[name]-[hash].js',

          /** 入口文件命名 */
          entryFileNames: 'assets/js/[name]-[hash].js',

          /**
           * 静态资源文件命名
           * 根据文件类型分类存放
           */
          assetFileNames: (assetInfo: { name?: string }) => {
            const name = assetInfo.name || ''

            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }

            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }

            if (name.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]'
            }

            return 'assets/[name]-[hash][extname]'
          },
        },
      },
    },

    /**
     * 开发服务器配置
     */
    server: {
      port: 5173,
      host: true,
      strictPort: false,

      /** 文件预热 - 预加载关键文件加速首次访问 */
      warmup: {
        clientFiles: [
          './src/main.ts',
          './src/App.vue',
          './src/views/HomePage.vue',
          './src/views/ExplorePage.vue',
          './src/components/layout/AppNavbar.vue',
          './src/stores/auth.ts',
          './src/stores/theme.ts',
        ],
      },

      /** 启用 CORS */
      cors: true,

      /** 文件系统安全配置 */
      fs: {
        strict: true,
        allow: ['..'],
        deny: ['.env', '.env.*', '*.pem', '*.key'],
      },

      preTransformRequests: true,

      /** API 代理 */
      proxy: {
        '/api': {
          target: 'https://api.momichan.xyz',
          changeOrigin: true,
          secure: true,
          followRedirects: true,
          configure: (proxy: DevProxyServer) => {
            proxy.on('proxyRes', (proxyRes) => {
              const setCookie = proxyRes.headers['set-cookie']
              if (setCookie && Array.isArray(setCookie)) {
                proxyRes.headers['set-cookie'] = setCookie.map((cookie) =>
                  cookie.replace(/;\s*Secure/gi, '')
                )
              }
            })
          },
          rewrite: (path: string) => {
            const url = new URL(path, 'http://localhost')
            if (!url.pathname.endsWith('/')) {
              return url.pathname + '/' + url.search
            }
            return path
          },
        },
        '/uploads': {
          target: 'https://api.momichan.xyz',
          changeOrigin: true,
          secure: true,
          followRedirects: true,
        },
      },
    },

    /**
     * 预览服务器配置
     */
    preview: {
      port: 4173,
      strictPort: true,
    },

    /**
     * Worker 配置
     */
    worker: {
      format: 'es' as const,
      rollupOptions: {
        output: {
          format: 'es' as const,
        },
      },
    },

    /**
     * JSON 处理优化
     */
    json: {
      /** 命名导出，支持 tree-shaking */
      namedExports: true,
      /** 小 JSON 直接内联 */
      stringify: true,
    },

    /**
     * 实验性功能
     */
    experimental: {
      /** 启用渲染内置 HTML */
      renderBuiltUrl: (filename: string) => {
        // 对于关键资源使用相对路径
        if (filename.includes('critical') || filename.includes('main')) {
          return `./${filename}`
        }
        return `/${filename}`
      },
    },
  }
})
