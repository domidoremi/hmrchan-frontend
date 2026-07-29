/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string

  readonly VITE_API_ENDPOINT?: string

  readonly VITE_API_URL?: string

  readonly VITE_IDENTITY_API_BASE_URL?: string

  readonly VITE_COMMUNITY_API_BASE_URL?: string

  readonly VITE_CONTENT_API_BASE_URL?: string
  /** Vite dev server host */
  readonly VITE_DEV_HOST?: string

  readonly VITE_FRONTEND_ORIGIN?: string

  readonly VITE_APP_NAME?: string

  readonly VITE_APP_DESCRIPTION?: string

  readonly VITE_CLIENT_CONTRACT_VERSION?: string

  readonly VITE_TURNSTILE_SITE_KEY?: string

  readonly VITE_ENABLE_CF_BEACON?: string
  /** Cloudflare Browser Insights token */
  readonly VITE_CF_BEACON_TOKEN?: string

  readonly VITE_ENABLE_CLIENT_REPORTS?: string

  readonly VITE_ENABLE_DEVTOOLS?: string

  readonly VITE_ENABLE_DEBUG?: string

  readonly VITE_ENABLE_CLIENT_INIT?: string

  readonly VITE_ENABLE_SCHEDULE_API?: string

  readonly VITE_ENABLE_DATA_PREFETCH?: string

  readonly VITE_ENABLE_DEFERRED_ANIMATION_STYLES?: string

  readonly VITE_ENABLE_ADVANCED_FINGERPRINT?: string

  readonly VITE_SOURCEMAP?: string

  readonly VITE_DISABLE_PREVIEW_PROXY?: string

  readonly VITE_GOOGLE_AUTH_ENABLED?: string

  readonly VITE_ANTI_TAMPER_MODE?: string

  readonly VITE_ANTI_TAMPER_ALLOW_DEV?: string

  readonly VITE_DISABLE_CONTEXT_MENU?: string

  readonly VITE_SHOW_CONSOLE_GUARD_BANNER?: string

  readonly VITE_ENABLE_OBFUSCATION?: string

  readonly VITE_OBFUSCATION_PROFILE?: string

  readonly VITE_OBFUSCATION_STRING_ARRAY?: string

  readonly VITE_OBFUSCATION_STRING_ARRAY_ENCODING?: string

  readonly VITE_OBFUSCATION_ANTI_FORMATTING?: string

  readonly VITE_OBFUSCATION_INFINITE_DEBUGGER?: string

  readonly VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL?: string

  readonly VITE_OBFUSCATION_CODE_ENCRYPTION?: string

  readonly VITE_OBFUSCATION_CONTROL_FLOW?: string

  readonly VITE_OBFUSCATION_DEAD_CODE?: string

  readonly VITE_LOG_LEVEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

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
