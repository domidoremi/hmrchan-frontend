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
import { execSync } from 'node:child_process'
import type { ClientRequest, IncomingMessage } from 'node:http'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { imagetools } from 'vite-imagetools'
import {
  asyncCssPlugin,
  criticalCSSPlugin,
  obfuscationPlugin,
  serviceWorkerBuildPlugin,
  sriPlugin,
  staticPrerenderPlugin,
} from './build/vite/plugins'
import { getSwCacheVersion } from './build/vite/swCacheVersion'

type DevProxyServer = {
  on(event: 'proxyRes', listener: (proxyRes: IncomingMessage) => void): void
  on(event: 'proxyReq', listener: (proxyReq: ClientRequest, req: IncomingMessage) => void): void
}

const DEV_PROXY_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

function normalizeProxyRequestHeaders(proxyReq: ClientRequest, req: IncomingMessage): void {
  const incomingUserAgent = req.headers['user-agent']
  const normalizedUserAgent =
    typeof incomingUserAgent === 'string' && !incomingUserAgent.includes('HeadlessChrome')
      ? incomingUserAgent
      : DEV_PROXY_BROWSER_UA

  proxyReq.setHeader('user-agent', normalizedUserAgent)
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
const SW_CACHE_VERSION = getSwCacheVersion()
const DEFAULT_CLIENT_CONTRACT_VERSION = '2026-04-13.p1'

type EnvMap = Record<string, string | undefined>

function parseBoolEnv(env: EnvMap, name: string, defaultValue = false): boolean {
  const raw = env[name]
  if (raw === undefined) return defaultValue
  return raw.trim().toLowerCase() === 'true'
}

function parseIntEnv(env: EnvMap, name: string, defaultValue = 0): number {
  const raw = env[name]
  if (!raw) return defaultValue
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function parseStringArrayEncoding(raw: string | undefined): 'none' | 'base64' | 'rc4' {
  const value = raw?.trim().toLowerCase()
  if (value === 'none' || value === 'base64' || value === 'rc4') return value
  return 'base64'
}

function parseSourcemapEnv(raw: string | undefined): boolean | 'hidden' {
  const value = raw?.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'hidden') return 'hidden'
  return false
}

function normalizeProxyTarget(rawTarget: string | undefined, fallbackTarget: string): string {
  const target = rawTarget?.trim() || fallbackTarget
  return target.replace(/\/+$/, '')
}

const OBFUSCATED_CHUNK_PATTERNS = [
  /^(?:auth|Auth)(?:$|[-_.]|[A-Z])/,
  /^(?:clientSecurity|ClientSecurity)/,
  /^(?:security|Security)/,
  /^(?:webauthn|Webauthn)/,
  /^(?:profile|Profile)/,
  /^(?:settings|Settings)/,
  /^(?:devices|Devices)/,
  /^(?:useVideoSettings|UseVideoSettings)/,
]

function stripChunkHash(fileName: string): string {
  const baseName = fileName.split('/').pop() ?? fileName
  return baseName.replace(/-[A-Za-z0-9]+\.js$/, '')
}

function shouldObfuscateChunk(fileName: string): boolean {
  if (!fileName.startsWith('assets/js/') || !fileName.endsWith('.js')) {
    return false
  }

  const chunkName = stripChunkHash(fileName)
  return OBFUSCATED_CHUNK_PATTERNS.some((pattern) => pattern.test(chunkName))
}

function createProxyConfig(apiTarget: string) {
  return {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      secure: true,
      followRedirects: true,
      configure: (proxy: DevProxyServer) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          normalizeProxyRequestHeaders(proxyReq, req)
        })
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
        return url.pathname + url.search
      },
    },
    '/uploads': {
      target: apiTarget,
      changeOrigin: true,
      secure: true,
      followRedirects: true,
    },
  }
}

export default defineConfig(async ({ mode }: { mode: string }) => {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ''),
  }
  const isProd = mode === 'production'
  const isDev = mode === 'development'
  const obfuscationEnabled = parseBoolEnv(env, 'VITE_ENABLE_OBFUSCATION', false)
  const asyncMainCss = parseBoolEnv(env, 'VITE_ASYNC_MAIN_CSS', true)
  const disablePreviewProxy = parseBoolEnv(env, 'VITE_DISABLE_PREVIEW_PROXY', false)
  const devtoolsEnabled = isDev && parseBoolEnv(env, 'VITE_ENABLE_DEVTOOLS', false)
  const sourcemapMode = isProd ? false : parseSourcemapEnv(env.VITE_SOURCEMAP)
  const apiProxyTarget = normalizeProxyTarget(env.VITE_API_BASE_URL, 'https://api.momichan.xyz')
  const sharedProxyConfig = createProxyConfig(apiProxyTarget)
  const obfuscationProfile = env.VITE_OBFUSCATION_PROFILE === 'aggressive' ? 'aggressive' : 'safe'
  const obfuscationControlFlow = parseBoolEnv(env, 'VITE_OBFUSCATION_CONTROL_FLOW', false)
  const obfuscationDeadCode = parseBoolEnv(env, 'VITE_OBFUSCATION_DEAD_CODE', false)
  const obfuscationStringArray = parseBoolEnv(env, 'VITE_OBFUSCATION_STRING_ARRAY', true)
  const obfuscationStringArrayEncoding = parseStringArrayEncoding(
    env.VITE_OBFUSCATION_STRING_ARRAY_ENCODING
  )
  const obfuscationAntiFormatting = parseBoolEnv(env, 'VITE_OBFUSCATION_ANTI_FORMATTING', false)
  const obfuscationInfiniteDebugger = parseBoolEnv(env, 'VITE_OBFUSCATION_INFINITE_DEBUGGER', false)
  const obfuscationInfiniteDebuggerInterval = parseIntEnv(
    env,
    'VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL',
    0
  )
  const obfuscationCodeEncryption = parseBoolEnv(env, 'VITE_OBFUSCATION_CODE_ENCRYPTION', false)
  const devtoolsPlugins = devtoolsEnabled
    ? [(await import('vite-plugin-vue-devtools')).default()]
    : []

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
      ...devtoolsPlugins,

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

      /** 生产环境内联关键 CSS + SW 版本注入 + SRI 完整性校验 + 可选混淆 */
      ...(isProd
        ? [
            criticalCSSPlugin(),
            serviceWorkerBuildPlugin(),
            sriPlugin(),
            staticPrerenderPlugin(),
            ...(asyncMainCss ? [asyncCssPlugin()] : []),
            obfuscationPlugin({
              enabled: obfuscationEnabled,
              profile: obfuscationProfile,
              // Keep obfuscation opt-in and scoped to explicit security-sensitive chunks only.
              include: shouldObfuscateChunk,
              stringArray: obfuscationStringArray,
              stringArrayEncoding: obfuscationStringArrayEncoding,
              antiFormatting: obfuscationAntiFormatting,
              infiniteDebugger: obfuscationInfiniteDebugger,
              infiniteDebuggerInterval: obfuscationInfiniteDebuggerInterval,
              codeEncryption: obfuscationCodeEncryption,
              controlFlowFlattening: obfuscationControlFlow,
              deadCodeInjection: obfuscationDeadCode,
            }),
          ]
        : []),

      /** 生产环境压缩 HTML：移除注释、多余空行和缩进 */
      ...(isProd
        ? [
            {
              name: 'vite-plugin-html-minify',
              enforce: 'post' as const,
              transformIndexHtml(html: string) {
                return (
                  html
                    // 保留 IE 条件注释（<!--[if ...]>），移除其余 HTML 注释
                    .replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '')
                    // 压缩连续空行为单个换行
                    .replace(/\n\s*\n/g, '\n')
                    // 移除行首多余空格（保留 2 空格缩进结构）
                    .replace(/^\s{4,}/gm, (m) => '  '.repeat(Math.floor(m.length / 2)))
                    .trim() + '\n'
                )
              },
            },
          ]
        : []),
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
      /** Frontend/backend lockstep contract version */
      __CLIENT_CONTRACT_VERSION__: JSON.stringify(
        (
          env.VITE_CLIENT_CONTRACT_VERSION ||
          env.CLIENT_CONTRACT_VERSION ||
          DEFAULT_CLIENT_CONTRACT_VERSION
        ).trim()
      ),
      /** Service Worker cache version */
      __SW_CACHE_VERSION__: JSON.stringify(SW_CACHE_VERSION),
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
        // 关键优化：预构建 @lucide/vue 避免 1500+ 个单独请求
        '@lucide/vue',
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

      /** 生产环境默认不输出 sourcemap；仅在显式设置 VITE_SOURCEMAP 时启用调试映射 */
      sourcemap: sourcemapMode,

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
              { test: /@lucide\/vue/, name: 'icons' },

              // GSAP 动画库
              { test: /gsap/, name: 'gsap' },

              // 重型库：按需加载，独立分块避免阻塞首屏
              { test: /three/, name: 'three' },
              { test: /lottie-web/, name: 'lottie' },
              { test: /@rive-app/, name: 'rive' },
              { test: /@fingerprintjs/, name: 'fingerprint' },

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
      proxy: sharedProxyConfig,
    },

    /**
     * 预览服务器配置
     */
    preview: {
      port: 4173,
      strictPort: true,
      proxy: disablePreviewProxy ? {} : sharedProxyConfig,
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
