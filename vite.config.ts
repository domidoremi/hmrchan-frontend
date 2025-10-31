import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
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
            // Vue核心库
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            // 图标库单独分割
            if (id.includes('lucide-vue-next')) {
              return 'icons'
            }
            // Masonry布局库
            if (id.includes('masonry-layout')) {
              return 'masonry'
            }
            // i18n和dayjs
            if (id.includes('vue-i18n') || id.includes('dayjs')) {
              return 'utils'
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
})
