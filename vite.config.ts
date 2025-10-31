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
  // vite-ssg 配置
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    includedRoutes: [
      '/',
      '/explore',
      '/authors',
      '/privacy',
      '/preferences',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // 依赖优化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios'],
    exclude: ['vite-plugin-vue-devtools']
  },
  build: {
    // 生产环境优化
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue核心库（排除 devtools）
            if (id.includes('@vue/runtime') || id.includes('@vue/reactivity') || id.includes('@vue/shared')) {
              return 'vue-core'
            }
            // Pinia 和 Router
            if (id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            // 图标库单独分割（按需加载）
            if (id.includes('lucide-vue-next')) {
              return 'icons'
            }
            // Masonry布局库（仅桌面端使用）
            if (id.includes('masonry-layout')) {
              return 'masonry'
            }
            // i18n和dayjs
            if (id.includes('vue-i18n') || id.includes('dayjs')) {
              return 'utils'
            }
            // Axios
            if (id.includes('axios')) {
              return 'api'
            }
            // VueUse（按需加载）
            if (id.includes('@vueuse')) {
              return 'vueuse'
            }
            // 其他依赖
            return 'vendor'
          }
        },
      },
    },
    // 资源优化
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
    // 压缩配置
    cssCodeSplit: true,
    reportCompressedSize: false, // 加快构建速度
  },
  server: {
    port: 5173,
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
