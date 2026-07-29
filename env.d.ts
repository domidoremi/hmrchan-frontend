/// <reference types="vite/client" />

/*
 * Keep this list aligned with the tracked VITE_* keys in .env.example and .env.development.
 * Some keys are consumed by browser code through import.meta.env, while others are read
 * by Vite config or local validation scripts before bundling.
 */
interface ImportMetaEnv {
  /** Base API URL */
  readonly VITE_API_BASE_URL?: string
  /** Identity API base URL override for the local dev/preview proxy */
  readonly VITE_IDENTITY_API_BASE_URL?: string
  /** Community API base URL override for the local dev/preview proxy */
  readonly VITE_COMMUNITY_API_BASE_URL?: string
  /** Content API base URL override for the local dev/preview proxy */
  readonly VITE_CONTENT_API_BASE_URL?: string
  /** Turnstile site key */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** Enables advanced FingerprintJS OSS browser fingerprinting; defaults to a lightweight fallback */
  readonly VITE_ENABLE_ADVANCED_FINGERPRINT?: string
  /** Shared release contract hash; production builds must inject it explicitly */
  readonly VITE_CLIENT_CONTRACT_VERSION?: string
  /** Enables debug output */
  readonly VITE_ENABLE_DEBUG?: string
  /** Enables DevTools */
  readonly VITE_ENABLE_DEVTOOLS?: string
  /** Enables client initialization during application startup */
  readonly VITE_ENABLE_CLIENT_INIT?: string
  /** Enables schedule API requests */
  readonly VITE_ENABLE_SCHEDULE_API?: string
  /** Enables background data prefetching */
  readonly VITE_ENABLE_DATA_PREFETCH?: string
  /** Defers loading animation styles */
  readonly VITE_ENABLE_DEFERRED_ANIMATION_STYLES?: string
  /** Build sourcemap mode: false|true|hidden */
  readonly VITE_SOURCEMAP?: string
  /** Local development server host override */
  readonly VITE_DEV_HOST?: string
  /** Enables more aggressive Vite optimization during development */
  readonly VITE_ENABLE_AGGRESSIVE_DEV_OPTIMIZATION?: string
  /** Enables Vue package devtools */
  readonly VITE_ENABLE_VUE_PACKAGE_DEVTOOLS?: string
  /** Disables the API proxy in the preview server */
  readonly VITE_DISABLE_PREVIEW_PROXY?: string
  /** Loads the main CSS asynchronously in production builds */
  readonly VITE_ASYNC_MAIN_CSS?: string
  /** Anti-tamper mode: off|warn|balanced|strict */
  readonly VITE_ANTI_TAMPER_MODE?: string
  /** Allows anti-tamper checks in development; defaults to false */
  readonly VITE_ANTI_TAMPER_ALLOW_DEV?: string
  /** Disables the context menu in strict mode */
  readonly VITE_DISABLE_CONTEXT_MENU?: string
  /** Enables build-time obfuscation */
  readonly VITE_ENABLE_OBFUSCATION?: string
  /** Obfuscation profile: safe|aggressive */
  readonly VITE_OBFUSCATION_PROFILE?: string
  /** Enables string-array transformation */
  readonly VITE_OBFUSCATION_STRING_ARRAY?: string
  /** String-array encoding: none|base64|rc4 */
  readonly VITE_OBFUSCATION_STRING_ARRAY_ENCODING?: string
  /** Enables anti-formatting (self-defending) */
  readonly VITE_OBFUSCATION_ANTI_FORMATTING?: string
  /** Enables the infinite debugger guard (debugProtection) */
  readonly VITE_OBFUSCATION_INFINITE_DEBUGGER?: string
  /** debugProtection trigger interval in milliseconds */
  readonly VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL?: string
  /** Enables frontend code pseudo-encryption through RC4-wrapped strings */
  readonly VITE_OBFUSCATION_CODE_ENCRYPTION?: string
  /** Enables control-flow flattening */
  readonly VITE_OBFUSCATION_CONTROL_FLOW?: string
  /** Enables dead-code injection */
  readonly VITE_OBFUSCATION_DEAD_CODE?: string
  /** Log level */
  readonly VITE_LOG_LEVEL?: string
  /** Explicitly enables the live API; enabled by default and disabled only by false */
  readonly VITE_HMRCHAN_ENABLE_API?: string
  /** Forces local fallback content for offline visual debugging */
  readonly VITE_HMRCHAN_FORCE_FALLBACK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Compile-time constants */
declare const __BUILD_TIME__: string
declare const __BUILD_HASH__: string
declare const __PROD__: boolean
declare const __DEV__: boolean
declare const __CLIENT_CONTRACT_VERSION__: string
declare const __SW_CACHE_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*?raw' {
  const content: string
  export default content
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
