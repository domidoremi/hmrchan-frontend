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

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { imagetools } from 'vite-imagetools'
import { criticalCSSPlugin } from './vite-plugin-critical-css'

/** 构建时间戳，用于缓存破坏 */
const BUILD_TIME = new Date().toISOString()

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
        if (existsSync(src)) {
          copyFileSync(src, dest)
          console.log(`✅ Copied ${file} to dist/`)
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
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
        'ky',
        'dayjs',
        'vue-i18n',
        '@vueuse/core',
        '@vueuse/shared',
      ],

      /**
       * 排除预构建的依赖
       * 这些依赖按需加载，不需要预构建
       */
      exclude: [
        'vite-plugin-vue-devtools',
        'lucide-vue-next',
        'photoswipe',
        'masonry-layout',
        'gsap',
      ],

      /** 是否强制重新预构建 */
      force: false,

      /** 依赖扫描入口 */
      entries: ['./src/main.ts', './src/views/HomePage.vue'],

      /** 立即启动，不等待扫描完成 */
      holdUntilCrawlEnd: false,
    },

    /**
     * esbuild 配置
     */
    esbuild: {
      target: 'esnext',
      supported: {
        'top-level-await': true,
      },
    },

    /**
     * 构建配置
     *
     * 优化策略：
     * - 使用 ESNext 目标，生成现代化代码
     * - 使用 esbuild 进行快速压缩
     * - 生产环境移除 console 和 debugger
     * - 细粒度代码分割，优化缓存策略
     * - 优化资源处理和文件命名
     */
    build: {
      /** 构建目标，使用最新的 ES 特性 */
      target: 'esnext',

      /** 代码压缩工具，esbuild 速度更快 */
      minify: mode === 'production' ? 'esbuild' : false,

      /** 禁用 sourcemap 以加快构建速度和减小体积 */
      sourcemap: false,

      /**
       * esbuild 压缩配置
       * 生产环境移除 console、debugger 和注释
       */
      ...(mode === 'production' && {
        esbuildOptions: {
          /** 移除 console 和 debugger 语句 */
          drop: ['console', 'debugger'],

          /** 移除代码中的法律注释 */
          legalComments: 'none',

          /** 启用 Tree Shaking */
          treeShaking: true,

          /** 只输出错误日志，减少构建输出 */
          logLevel: 'error',

          /** 压缩标识符名称 */
          minifyIdentifiers: true,

          /** 压缩语法结构 */
          minifySyntax: true,

          /** 压缩空白字符 */
          minifyWhitespace: true,

          /** 不保留函数和类名，进一步减小体积 */
          keepNames: false,
        },
      }),

      /**
       * 模块预加载配置
       * 关闭 polyfill 以减小体积
       */
      modulePreload: {
        polyfill: false,
      },

      /**
       * Rollup 打包配置
       * 主要用于配置代码分割策略
       */
      rollupOptions: {
        output: {
          /**
           * 手动代码分割策略
           *
           * 分割原则：
           * 1. 核心库独立缓存（变化频率低）
           * 2. 第三方库按大小和使用频率分割
           * 3. 业务代码按页面/功能分割
           * 4. 目标：首屏 < 100KB，单 chunk < 200KB
           *
           * @param id - 模块 ID（文件路径）
           * @returns chunk 名称
           */
          manualChunks(id) {
            /** 第三方依赖分割 */
            if (id.includes('node_modules')) {
              /**
               * Vue 核心库分割（最高优先级）
               * 将 Vue 运行时、响应式系统、共享工具分别打包
               * 这些库变化频率低，独立分割有利于长期缓存
               */
              if (id.includes('@vue/runtime-dom') || id.includes('@vue/runtime-core')) {
                return 'vue-runtime'
              }
              if (id.includes('@vue/reactivity')) {
                return 'vue-reactivity'
              }
              if (id.includes('@vue/shared')) {
                return 'vue-shared'
              }

              /**
               * 路由和状态管理（高优先级）
               * 应用启动时必需的核心依赖
               */
              if (id.includes('vue-router')) {
                return 'vue-router'
              }
              if (id.includes('pinia')) {
                return 'pinia'
              }

              /**
               * UI 和交互库（按需加载）
               * 这些库体积较大，按需加载可以减小首屏体积
               */
              if (id.includes('lucide-vue-next')) {
                return 'icons'
              }
              if (id.includes('gsap')) {
                return 'animations'
              }
              if (id.includes('photoswipe')) {
                return 'photo-viewer'
              }
              if (id.includes('masonry-layout')) {
                return 'masonry'
              }

              /**
               * 工具库（中等优先级）
               * 常用但不是启动必需的工具库
               */
              if (id.includes('vue-i18n')) {
                return 'i18n'
              }
              if (id.includes('dayjs')) {
                return 'dayjs'
              }
              if (id.includes('axios')) {
                return 'vendor-axios'
              }
              if (id.includes('@vueuse/core')) {
                return 'vueuse-core'
              }
              if (id.includes('@vueuse/shared')) {
                return 'vueuse-shared'
              }
              /**
               * HTTP 客户端库（独立分割）
               * ky 是 fetch 封装库，独立分割便于缓存
               */
              if (id.includes('node_modules/ky')) {
                return 'http-client'
              }

              /** 其他第三方依赖统一打包 */
              return 'vendor'
            }

            /**
             * 应用代码分割
             * 按页面和功能模块进行细粒度分割
             */

            /** 页面组件 - 按页面独立分割，实现路由级别的懒加载 */
            if (id.includes('/src/views/')) {
              const match = id.match(/\/views\/(.+?)\.vue/)
              if (match) {
                const pageName = match[1].toLowerCase()
                /** 关键页面单独分割 */
                if (['homepage', 'explorepage', 'postsview'].includes(pageName)) {
                  return `page-${pageName}`
                }
                if (pageName === 'postdetailpage') {
                  return 'page-postdetail'
                }
                if (pageName === 'profilepage') {
                  return 'page-profile'
                }
                /** 其他次要页面分组 */
                return 'pages-other'
              }
            }

            /** 业务组件 - 按使用频率分割 */
            if (id.includes('/src/components/business/')) {
              if (id.includes('PostCard')) {
                return 'component-postcard'
              }
              return 'components-business'
            }

            /** UI 组件 - 按功能类型分割 */
            if (id.includes('/src/components/ui/')) {
              if (id.includes('/ui/viewer/PhotoSwipe')) {
                return 'viewer-photoswipe'
              }
              if (id.includes('/ui/viewer')) {
                return 'components-viewer'
              }
              if (id.includes('/ui/card')) {
                return 'components-card'
              }
              if (id.includes('/ui/button') || id.includes('/ui/input')) {
                return 'components-input'
              }
              if (id.includes('/ui/feedback') || id.includes('/ui/indicator')) {
                return 'components-feedback'
              }
              return 'components-ui'
            }

            /** 布局组件 */
            if (id.includes('/src/components/layout/')) {
              return 'components-layout'
            }

            /** 基础组件 */
            if (id.includes('/src/components/base/')) {
              return 'components-base'
            }

            /** 组合式函数 */
            if (id.includes('/src/composables/')) {
              return 'composables'
            }

            /** API 服务层 - 按模块分割 */
            if (id.includes('/src/api/')) {
              if (id.includes('/api/client')) {
                return 'api-client'
              }
              if (id.includes('/api/services')) {
                return 'api-services'
              }
              return 'api-utils'
            }

            /** 状态管理 */
            if (id.includes('/src/stores/')) {
              return 'stores'
            }

            /** 工具函数 - 按功能分割 */
            if (id.includes('/src/utils/')) {
              if (id.includes('/utils/media')) {
                return 'utils-media'
              }
              /** 缓存工具独立分割（体积较大） */
              if (id.includes('/src/utils/cache')) {
                return 'utils-cache'
              }
              /** 存储工具独立分割 */
              if (id.includes('/src/utils/storage')) {
                return 'utils-storage'
              }
              return 'utils'
            }
          },

          /**
           * 输出文件命名规则
           * 使用 hash 确保文件变化时缓存失效
           */

          /** JS chunk 文件命名 */
          chunkFileNames: 'assets/js/[name]-[hash].js',

          /** 入口文件命名 */
          entryFileNames: 'assets/js/[name]-[hash].js',

          /**
           * 静态资源文件命名
           * 根据文件类型分类存放到不同目录
           */
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.')
            const ext = info?.[info.length - 1]

            /** 图片资源 */
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || '')) {
              return 'assets/images/[name]-[hash][extname]'
            }

            /** 字体资源 */
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return 'assets/fonts/[name]-[hash][extname]'
            }

            /** CSS 文件 */
            if (ext === 'css') {
              return 'assets/css/[name]-[hash][extname]'
            }

            /** 其他资源 */
            return 'assets/[name]-[hash][extname]'
          },
        },
      },

      /**
       * 资源处理配置
       */

      /** chunk 大小警告阈值（KB），降低阈值促进更细的分割 */
      chunkSizeWarningLimit: 500,

      /** 小于 4KB 的资源内联为 base64，减少 HTTP 请求 */
      assetsInlineLimit: 4096,

      /**
       * CSS 处理配置
       */

      /** 启用 CSS 代码分割，每个异步 chunk 生成独立的 CSS 文件 */
      cssCodeSplit: true,

      /** 使用 esbuild 压缩 CSS，速度更快 */
      cssMinify: 'esbuild',

      /** CSS 目标版本 */
      cssTarget: 'esnext',

      /**
       * 构建性能优化
       */

      /** 禁用压缩大小报告，加快构建速度 */
      reportCompressedSize: false,

      /** 构建前清空输出目录 */
      emptyOutDir: true,

      /**
       * CommonJS 模块处理配置
       * 优化 CommonJS 模块的转换性能
       */
      commonjsOptions: {
        /** 只处理 node_modules 中的 CommonJS 模块 */
        include: [/node_modules/],

        /** 支持的文件扩展名 */
        extensions: ['.js', '.cjs'],

        /** 严格的 require 处理 */
        strictRequires: true,

        /** 转换混合的 ES 模块 */
        transformMixedEsModules: true,
      },

      /**
       * 生产环境额外配置
       */
      ...(mode === 'production' && {
        /** 资源输出目录 */
        assetsDir: 'assets',

        /** 生成 manifest.json 文件，用于资源映射 */
        manifest: true,
      }),
    },

    /**
     * 开发服务器配置
     */
    server: {
      port: 5173,

      /** 文件预热 */
      warmup: {
        clientFiles: [
          './src/main.ts',
          './src/App.vue',
          './src/views/HomePage.vue',
          './src/views/ExplorePage.vue',
          './src/components/layout/MainLayout.vue',
          './src/components/layout/AppNavbar.vue',
          './src/components/business/PostCard.vue',
          './src/stores/useAuth.ts',
          './src/stores/useTheme.ts',
        ],
      },

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
          rewrite: (path) => {
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
      format: 'es',
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
  }
})
