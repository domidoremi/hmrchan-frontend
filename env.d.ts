/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基础 URL */
  readonly VITE_API_BASE_URL?: string
  /** API 端点 */
  readonly VITE_API_ENDPOINT?: string
  /** API URL (代理路径) */
  readonly VITE_API_URL?: string
  /** 身份域 API 基础 URL（开发/预览代理覆盖） */
  readonly VITE_IDENTITY_API_BASE_URL?: string
  /** 社区域 API 基础 URL（开发/预览代理覆盖） */
  readonly VITE_COMMUNITY_API_BASE_URL?: string
  /** 内容域 API 基础 URL（开发/预览代理覆盖） */
  readonly VITE_CONTENT_API_BASE_URL?: string
  /** Vite dev server host */
  readonly VITE_DEV_HOST?: string
  /** 前端消息通信主源 */
  readonly VITE_FRONTEND_ORIGIN?: string
  /** 应用名称 */
  readonly VITE_APP_NAME?: string
  /** 应用描述 */
  readonly VITE_APP_DESCRIPTION?: string
  /** 共享客户端契约版本 */
  readonly VITE_CLIENT_CONTRACT_VERSION?: string
  /** Turnstile 站点密钥 */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** 是否显式启用 Cloudflare Browser Insights beacon */
  readonly VITE_ENABLE_CF_BEACON?: string
  /** Cloudflare Browser Insights token */
  readonly VITE_CF_BEACON_TOKEN?: string
  /** 是否启用客户端报告 */
  readonly VITE_ENABLE_CLIENT_REPORTS?: string
  /** 启用 DevTools */
  readonly VITE_ENABLE_DEVTOOLS?: string
  /** 启用调试输出 */
  readonly VITE_ENABLE_DEBUG?: string
  /** 是否执行客户端初始化请求 */
  readonly VITE_ENABLE_CLIENT_INIT?: string
  /** 是否启用日程接口请求 */
  readonly VITE_ENABLE_SCHEDULE_API?: string
  /** 是否启用后台数据预取 */
  readonly VITE_ENABLE_DATA_PREFETCH?: string
  /** 是否延迟加载动画样式 */
  readonly VITE_ENABLE_DEFERRED_ANIMATION_STYLES?: string
  /** 是否启用 FingerprintJS 高熵指纹 */
  readonly VITE_ENABLE_ADVANCED_FINGERPRINT?: string
  /** 构建时 sourcemap 设置 */
  readonly VITE_SOURCEMAP?: string
  /** 是否禁用 Pages preview proxy */
  readonly VITE_DISABLE_PREVIEW_PROXY?: string
  /** 是否启用 Google 登录入口 */
  readonly VITE_GOOGLE_AUTH_ENABLED?: string
  /** Anti-tamper 模式：off|warn|balanced|strict */
  readonly VITE_ANTI_TAMPER_MODE?: string
  /** 是否允许在开发环境启用 anti-tamper（默认 false） */
  readonly VITE_ANTI_TAMPER_ALLOW_DEV?: string
  /** strict 模式下是否禁用右键菜单 */
  readonly VITE_DISABLE_CONTEXT_MENU?: string
  /** 是否显示控制台防护横幅 */
  readonly VITE_SHOW_CONSOLE_GUARD_BANNER?: string
  /** 是否启用构建混淆 */
  readonly VITE_ENABLE_OBFUSCATION?: string
  /** 混淆强度配置：safe|aggressive */
  readonly VITE_OBFUSCATION_PROFILE?: string
  /** 是否启用字符串阵列化 */
  readonly VITE_OBFUSCATION_STRING_ARRAY?: string
  /** 字符串阵列编码：none|base64|rc4 */
  readonly VITE_OBFUSCATION_STRING_ARRAY_ENCODING?: string
  /** 是否启用 anti-formatting（self-defending） */
  readonly VITE_OBFUSCATION_ANTI_FORMATTING?: string
  /** 是否启用 infinite debugger（debugProtection） */
  readonly VITE_OBFUSCATION_INFINITE_DEBUGGER?: string
  /** debugProtection 触发间隔（ms） */
  readonly VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL?: string
  /** 前端代码伪加密（基于字符串 RC4 包裹） */
  readonly VITE_OBFUSCATION_CODE_ENCRYPTION?: string
  /** 是否开启控制流平坦化 */
  readonly VITE_OBFUSCATION_CONTROL_FLOW?: string
  /** 是否开启废代码注入 */
  readonly VITE_OBFUSCATION_DEAD_CODE?: string
  /** 日志级别 */
  readonly VITE_LOG_LEVEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 编译时常量 */
declare const __BUILD_TIME__: string
declare const __BUILD_HASH__: string
declare const __PROD__: boolean
declare const __DEV__: boolean
declare const __SW_CACHE_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'javascript-obfuscator' {
  const JavaScriptObfuscator: {
    obfuscate: (
      sourceCode: string,
      options: Record<string, unknown>
    ) => {
      getObfuscatedCode: () => string
    }
  }

  export default JavaScriptObfuscator
}
