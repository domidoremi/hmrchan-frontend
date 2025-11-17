import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { criticalCSSPlugin } from './vite-plugin-critical-css'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueJsx(),
    // 仅在开发环境启用 DevTools
    ...(mode === 'development' ? [vueDevTools()] : []),
    // 生产环境内联关键 CSS
    ...(mode === 'production' ? [criticalCSSPlugin()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 依赖优化
  optimizeDeps: {
    // 精确指定需要预构建的核心依赖
    include: [
      'vue',
      'vue-router',
      'pinia',
      'pinia-plugin-persistedstate',
      'axios',
      'dayjs',
      'vue-i18n',
      '@vueuse/core',
      '@vueuse/shared',
    ],
    // 排除不需要预构建的依赖（按需加载）
    exclude: [
      'vite-plugin-vue-devtools',
      'lucide-vue-next', // 图标库按需加载，不预构建
      'plyr', // 媒体播放器按需加载
      'photoswipe', // 图片查看器按需加载
      'masonry-layout', // 瀑布流布局按需加载
      'gsap', // 动画库按需加载
    ],
    // 强制预构建，避免二次预构建
    force: false,
    // 优化依赖扫描 - 只扫描关键入口
    entries: ['./src/main.ts', './src/views/HomePage.vue'],
    // 启用依赖扫描缓存
    holdUntilCrawlEnd: false, // 不等待扫描完成，加快启动
  },
  build: {
    // 生产环境优化
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    sourcemap: false, // 禁用 sourcemap 以加快构建速度
    // 移除 console 和 debugger
    ...(mode === 'production' && {
      esbuildOptions: {
        drop: ['console', 'debugger'],
        legalComments: 'none', // 移除注释
        treeShaking: true,
        // 优化构建性能
        logLevel: 'error', // 减少日志输出
        // 优化标识符命名以减小体积
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        // 更激进的压缩
        keepNames: false,
      },
    }),
    // 优化模块外部化
    modulePreload: {
      polyfill: false, // 关闭polyfill减小体积
    },
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ========== 优化策略 ==========
          // 1. 核心库独立缓存（变化频率低）
          // 2. 第三方库按大小和使用频率分割
          // 3. 业务代码按页面/功能分割
          // 4. 目标：首屏<100KB，单chunk<200KB
          if (id.includes('node_modules')) {
            // ========== 核心库分割（最高优先级） ==========
            // Vue 核心运行时 - 最常用，单独分割
            if (id.includes('@vue/runtime-dom') || id.includes('@vue/runtime-core')) {
              return 'vue-runtime'
            }
            // Vue 响应式系统 - 独立分割以便缓存
            if (id.includes('@vue/reactivity')) {
              return 'vue-reactivity'
            }
            // Vue 共享工具
            if (id.includes('@vue/shared')) {
              return 'vue-shared'
            }

            // ========== 路由和状态管理（高优先级） ==========
            // Vue Router - 路由系统
            if (id.includes('vue-router')) {
              return 'vue-router'
            }
            // Pinia - 状态管理
            if (id.includes('pinia')) {
              return 'pinia'
            }

            // ========== UI 和交互库（按需加载） ==========
            // 图标库 - 体积大，单独分割
            if (id.includes('lucide-vue-next')) {
              return 'icons'
            }
            // GSAP 动画库 - 按需加载
            if (id.includes('gsap')) {
              return 'animations'
            }
            // Plyr 播放器 - 仅媒体页面使用
            if (id.includes('plyr')) {
              return 'media-player'
            }
            // PhotoSwipe 查看器 - 仅详情页使用
            if (id.includes('photoswipe')) {
              return 'photo-viewer'
            }
            // Masonry 布局库 - 仅桌面端瀑布流使用
            if (id.includes('masonry-layout')) {
              return 'masonry'
            }

            // ========== 工具库（中等优先级） ==========
            // Vue I18n - 国际化
            if (id.includes('vue-i18n')) {
              return 'i18n'
            }
            // Day.js - 日期处理
            if (id.includes('dayjs')) {
              return 'dayjs'
            }
            // Axios - HTTP 客户端（大文件，单独分割）
            if (id.includes('axios')) {
              return 'vendor-axios'
            }
            // VueUse - 组合式工具集
            if (id.includes('@vueuse/core')) {
              return 'vueuse-core'
            }
            if (id.includes('@vueuse/shared')) {
              return 'vueuse-shared'
            }

            // 其他第三方依赖
            return 'vendor'
          }

          // ========== 应用代码分割 ==========
          // 页面组件 - 按页面独立分割
          if (id.includes('/src/views/')) {
            const match = id.match(/\/views\/(.+?)\.vue/)
            if (match) {
              const pageName = match[1].toLowerCase()
              // 关键页面单独分割
              if (['homepage', 'explorepage', 'postsview'].includes(pageName)) {
                return `page-${pageName}`
              }
              // PostDetailPage 单独分割（包含PhotoSwipe和VideoPlayer）
              if (pageName === 'postdetailpage') {
                return 'page-postdetail'
              }
              // ProfilePage 单独分割
              if (pageName === 'profilepage') {
                return 'page-profile'
              }
              // 其他次要页面分组
              return 'pages-other'
            }
          }

          // 业务组件 - 细化分割
          if (id.includes('/src/components/business/')) {
            // PostCard单独分割（大组件，高频使用）
            if (id.includes('PostCard')) {
              return 'component-postcard'
            }
            // 其他业务组件
            return 'components-business'
          }

          // UI组件 - 保持细粒度分割
          if (id.includes('/src/components/ui/')) {
            // PhotoSwipe查看器（仅详情页）
            if (id.includes('/ui/viewer/PhotoSwipe')) {
              return 'viewer-photoswipe'
            }
            // VideoPlayer组件（详情页+列表）
            if (id.includes('/ui/video/VideoPlayer')) {
              return 'viewer-video'
            }
            // 其他查看器组件
            if (id.includes('/ui/viewer')) {
              return 'components-viewer'
            }
            // 卡片组件
            if (id.includes('/ui/card')) {
              return 'components-card'
            }
            // 按钮和输入组件
            if (id.includes('/ui/button') || id.includes('/ui/input')) {
              return 'components-input'
            }
            // 反馈组件（加载、提示等）
            if (id.includes('/ui/feedback') || id.includes('/ui/indicator')) {
              return 'components-feedback'
            }
            // 其他UI组件
            return 'components-ui'
          }

          // 布局组件
          if (id.includes('/src/components/layout/')) {
            return 'components-layout'
          }

          // 基础组件
          if (id.includes('/src/components/base/')) {
            return 'components-base'
          }

          // Composables - 按功能分组
          if (id.includes('/src/composables/')) {
            return 'composables'
          }

          // API 服务层 - 细化分割
          if (id.includes('/src/api/')) {
            // API客户端基础配置
            if (id.includes('/api/client')) {
              return 'api-client'
            }
            // API服务 - 按模块分割
            if (id.includes('/api/services')) {
              return 'api-services'
            }
            // 其他API工具
            return 'api-utils'
          }

          // Stores - 状态管理模块
          if (id.includes('/src/stores/')) {
            return 'stores'
          }

          // 工具函数 - 细化分割
          if (id.includes('/src/utils/')) {
            // 媒体处理工具（体积较大）
            if (id.includes('/utils/media')) {
              return 'utils-media'
            }
            // 其他工具
            return 'utils'
          }
        },
        // 优化文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.')
          const ext = info?.[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash][extname]'
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash][extname]'
          } else if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    // 资源优化
    chunkSizeWarningLimit: 500, // 降低警告阈值，促进更细的分割
    assetsInlineLimit: 4096, // 小于 4KB 的资源内联为base64
    // 压缩配置
    cssCodeSplit: true, // CSS代码分割
    cssMinify: 'esbuild', // 使用 esbuild 压缩 CSS（更快）
    reportCompressedSize: false, // 禁用压缩大小报告，加快构建
    // 优化输出
    emptyOutDir: true, // 清理输出目录
    // 优化导入分析
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs'],
      // 优化转换性能
      strictRequires: true,
      transformMixedEsModules: true,
    },
    // 优化CSS处理
    cssTarget: 'esnext', // CSS目标版本
    // 启用实验性优化
    ...(mode === 'production' && {
      // 优化CSS导入
      cssCodeSplit: true,
      // 优化资源处理
      assetsDir: 'assets',
      // 启用构建缓存（实验性）
      manifest: true, // 生成manifest.json
    }),
  },
  server: {
    port: 5173,
    // 预热常用文件以加快首次访问
    warmup: {
      clientFiles: [
        // 核心入口文件
        './src/main.ts',
        './src/App.vue',
        // 关键页面组件
        './src/views/HomePage.vue',
        './src/views/ExplorePage.vue',
        // 核心布局组件
        './src/components/layout/MainLayout.vue',
        './src/components/layout/AppNavbar.vue',
        // 高频业务组件
        './src/components/business/PostCard.vue',
        // 核心 composables
        './src/composables/useAuth.ts',
        './src/composables/useTheme.ts',
      ],
    },
    // 开发服务器性能优化
    fs: {
      // 限制文件系统访问范围，提升性能
      strict: true,
      // 允许访问的目录
      allow: ['..'],
    },
    // 预转换已知的 CommonJS 依赖
    preTransformRequests: true,
    proxy: {
      // 开发环境代理API请求
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 代理上传文件（头像等）
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}))
