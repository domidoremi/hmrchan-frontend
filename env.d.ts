/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基础 URL */
  readonly VITE_API_BASE_URL?: string
  /** API 端点 */
  readonly VITE_API_ENDPOINT?: string
  /** API URL (代理路径) */
  readonly VITE_API_URL?: string
  /** 应用名称 */
  readonly VITE_APP_NAME?: string
  /** 应用描述 */
  readonly VITE_APP_DESCRIPTION?: string
  /** Turnstile 站点密钥 */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** 启用 DevTools */
  readonly VITE_ENABLE_DEVTOOLS?: string
  /** 日志级别 */
  readonly VITE_LOG_LEVEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 编译时常量 */
declare const __BUILD_TIME__: string
declare const __PROD__: boolean
declare const __DEV__: boolean

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
