import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import type { ClientRequest, IncomingMessage } from 'node:http'

import { defineConfig, loadEnv } from 'vite'
import {
  DEFAULT_LOCAL_API_PROXY_TARGET,
  assertDevProxyTargetsAllowed,
  rewriteDevProxyCookies,
} from './scripts/lib/dev-proxy-safety.ts'
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
} from './build/vite/plugins/index.ts'
import { getSwCacheVersion } from './build/vite/swCacheVersion.ts'

type DevProxyServer = {
  on(event: 'proxyRes', listener: (proxyRes: IncomingMessage) => void): void
  on(event: 'proxyReq', listener: (proxyReq: ClientRequest, req: IncomingMessage) => void): void
}

const DEV_PROXY_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
const REHEARSAL_TURNSTILE_BYPASS_HEADER = 'X-Rehearsal-Turnstile-Bypass'

function normalizeProxyRequestHeaders(
  proxyReq: ClientRequest,
  req: IncomingMessage,
  rehearsalTurnstileBypassToken = ''
): void {
  const incomingUserAgent = req.headers['user-agent']
  const normalizedUserAgent =
    typeof incomingUserAgent === 'string' && !incomingUserAgent.includes('HeadlessChrome')
      ? incomingUserAgent
      : DEV_PROXY_BROWSER_UA

  proxyReq.setHeader('user-agent', normalizedUserAgent)
  if (rehearsalTurnstileBypassToken) {
    proxyReq.setHeader(REHEARSAL_TURNSTILE_BYPASS_HEADER, rehearsalTurnstileBypassToken)
  }
}

const BUILD_TIME = new Date().toISOString()

function getBuildHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

const BUILD_HASH = getBuildHash()
const SW_CACHE_VERSION = getSwCacheVersion()

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

function resolveDevHost(rawHost: string | undefined): string | true {
  const value = rawHost?.trim()
  if (!value) return '127.0.0.1'
  if (value.toLowerCase() === 'true') return true
  return value
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

function createProxyRule(
  apiTarget: string,
  rehearsalTurnstileBypassToken = '',
  allowRemoteCookieDowngrade = false
) {
  return {
    target: apiTarget,
    changeOrigin: true,
    secure: true,
    followRedirects: true,
    configure: (proxy: DevProxyServer) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        normalizeProxyRequestHeaders(proxyReq, req, rehearsalTurnstileBypassToken)
      })
      proxy.on('proxyRes', (proxyRes) => {
        const setCookie = proxyRes.headers['set-cookie']
        if (setCookie && Array.isArray(setCookie)) {
          proxyRes.headers['set-cookie'] = rewriteDevProxyCookies(
            setCookie,
            apiTarget,
            allowRemoteCookieDowngrade
          )
        }
      })
    },
    rewrite: (path: string) => {
      const url = new URL(path, 'http://localhost')
      return url.pathname + url.search
    },
  }
}

function createUploadProxyRule(apiTarget: string) {
  return {
    target: apiTarget,
    changeOrigin: true,
    secure: true,
    followRedirects: true,
  }
}

function createProxyConfig(
  apiTarget: string,
  {
    identityTarget = apiTarget,
    communityTarget = apiTarget,
    contentTarget = apiTarget,
    rehearsalTurnstileBypassToken = '',
    allowRemoteCookieDowngrade = false,
  }: {
    identityTarget?: string
    communityTarget?: string
    contentTarget?: string
    rehearsalTurnstileBypassToken?: string
    allowRemoteCookieDowngrade?: boolean
  } = {}
) {
  const identityProxy = createProxyRule(
    identityTarget,
    rehearsalTurnstileBypassToken,
    allowRemoteCookieDowngrade
  )
  const communityProxy = createProxyRule(
    communityTarget,
    rehearsalTurnstileBypassToken,
    allowRemoteCookieDowngrade
  )
  const contentProxy = createProxyRule(
    contentTarget,
    rehearsalTurnstileBypassToken,
    allowRemoteCookieDowngrade
  )
  const defaultProxy = createProxyRule(
    apiTarget,
    rehearsalTurnstileBypassToken,
    allowRemoteCookieDowngrade
  )

  return {
    '^/api/v1/posts/[^/]+/comments$': communityProxy,
    '/api/v1/authors': contentProxy,
    '/api/v1/client': identityProxy,
    '/api/v1/auth': identityProxy,
    '/api/v1/preferences': identityProxy,
    '/api/v1/users/me': identityProxy,
    '/api/v1/devices': identityProxy,
    '/api/v1/account': identityProxy,
    '/api/v1/2fa': identityProxy,
    '/api/v1/email': identityProxy,
    '/api/v1/upload/avatar': identityProxy,
    '/api/v1/audit': identityProxy,
    '/api/v1/media': contentProxy,
    '/api/v1/home': contentProxy,
    '/api/v1/posts': contentProxy,
    '/api/v1/search': contentProxy,
    '/api/v1/schedules': contentProxy,
    '/api/v1/trends/summary': contentProxy,
    '/api/v1/community/highlights': contentProxy,
    '/api/v1/members': contentProxy,
    '/api/v1/favorites': communityProxy,
    '/api/v1/community': communityProxy,
    '/api/v1/comments': communityProxy,
    '/api/v1/comment-images': communityProxy,
    '/api/v1/discussions': communityProxy,
    '/api/v1/relations': communityProxy,
    '/api/v1/history': communityProxy,
    '/api/v1/reports': communityProxy,
    '/api/v1/inbox': communityProxy,
    '/api/v1/feedback': communityProxy,
    '/api/v1/contact/send': communityProxy,
    '/uploads/avatars': createUploadProxyRule(identityTarget),
    '/uploads/comment_images': createUploadProxyRule(communityTarget),
    '/api': defaultProxy,
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
  const clientContractVersion = (env.VITE_CLIENT_CONTRACT_VERSION ?? '').trim()
  if (isProd && !clientContractVersion) {
    throw new Error(
      'VITE_CLIENT_CONTRACT_VERSION is required for production builds. Inject the shared release contract hash for this rollout.'
    )
  }
  const obfuscationEnabled = parseBoolEnv(env, 'VITE_ENABLE_OBFUSCATION', false)
  const asyncMainCss = parseBoolEnv(env, 'VITE_ASYNC_MAIN_CSS', true)
  const disablePreviewProxy = parseBoolEnv(env, 'VITE_DISABLE_PREVIEW_PROXY', false)
  const devtoolsEnabled = isDev && parseBoolEnv(env, 'VITE_ENABLE_DEVTOOLS', false)
  const sourcemapMode = isProd ? false : parseSourcemapEnv(env.VITE_SOURCEMAP)
  const apiProxyTarget = normalizeProxyTarget(
    env.VITE_API_BASE_URL,
    isDev ? DEFAULT_LOCAL_API_PROXY_TARGET : 'https://api.momichan.com'
  )
  const identityProxyTarget = normalizeProxyTarget(env.VITE_IDENTITY_API_BASE_URL, apiProxyTarget)
  const communityProxyTarget = normalizeProxyTarget(env.VITE_COMMUNITY_API_BASE_URL, apiProxyTarget)
  const contentProxyTarget = normalizeProxyTarget(env.VITE_CONTENT_API_BASE_URL, apiProxyTarget)
  const allowProductionApiProxy = parseBoolEnv(env, 'ALLOW_PRODUCTION_API_PROXY', false)
  const allowRemoteCookieDowngrade = parseBoolEnv(env, 'ALLOW_REMOTE_COOKIE_DOWNGRADE', false)
  if (isDev) {
    assertDevProxyTargetsAllowed(
      [apiProxyTarget, identityProxyTarget, communityProxyTarget, contentProxyTarget],
      allowProductionApiProxy
    )
  }
  const rehearsalTurnstileBypassToken = (env.REHEARSAL_TURNSTILE_BYPASS_TOKEN ?? '').trim()
  const sharedProxyConfig = createProxyConfig(apiProxyTarget, {
    identityTarget: identityProxyTarget,
    communityTarget: communityProxyTarget,
    contentTarget: contentProxyTarget,
    rehearsalTurnstileBypassToken,
    allowRemoteCookieDowngrade,
  })
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
    plugins: [
      vue({
        script: {
          defineModel: true,

          propsDestructure: true,
        },
        template: {
          compilerOptions: {
            comments: !isProd,
          },
        },
      }),

      vueJsx(),

      ...devtoolsPlugins,

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

      ...(isProd
        ? [
            {
              name: 'vite-plugin-html-minify',
              enforce: 'post' as const,
              transformIndexHtml(html: string) {
                return (
                  html

                    .replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '')

                    .replace(/\n\s*\n/g, '\n')

                    .replace(/^\s{4,}/gm, (m) => '  '.repeat(Math.floor(m.length / 2)))
                    .trim() + '\n'
                )
              },
            },
          ]
        : []),
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    define: {
      __BUILD_TIME__: JSON.stringify(BUILD_TIME),
      /** Git commit hash */
      __BUILD_HASH__: JSON.stringify(BUILD_HASH),
      /** Shared release contract hash. Production must inject VITE_CLIENT_CONTRACT_VERSION explicitly. */
      __CLIENT_CONTRACT_VERSION__: JSON.stringify(clientContractVersion || 'dev-local'),
      /** Service Worker cache version */
      __SW_CACHE_VERSION__: JSON.stringify(SW_CACHE_VERSION),

      __PROD__: isProd,

      __DEV__: isDev,

      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },

    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        'pinia-plugin-persistedstate',
        'vue-i18n',

        '@lucide/vue',
      ],

      exclude: ['vite-plugin-vue-devtools', 'gsap'],

      force: false,

      entries: ['./src/main.ts', './src/views/HomePage.vue'],

      holdUntilCrawlEnd: false,
    },

    oxc: {
      target: 'esnext',

      minify: {
        compress: {
          drop_console: isProd,

          drop_debugger: isProd,

          dead_code: true,

          evaluate: true,

          join_vars: true,

          loops: true,

          unused: true,
        },

        mangle: isProd,
      },
    },

    build: {
      target: 'esnext',

      sourcemap: sourcemapMode,

      minify: isProd,

      modulePreload: false,

      chunkSizeWarningLimit: 500,

      assetsInlineLimit: 4096,

      cssCodeSplit: true,

      cssMinify: 'lightningcss' as const,

      cssTarget: 'esnext',

      cssTreeShaking: true,

      reportCompressedSize: false,

      emptyOutDir: true,

      ...(isProd && {
        assetsDir: 'assets',
        manifest: true,
      }),

      rolldownOptions: {
        external: ['@/views/ComponentsShowcase.vue'],

        treeshake: {
          moduleSideEffects: 'no-external' as const,

          propertyReadSideEffects: false as const,

          unknownGlobalSideEffects: false,
        },

        output: {
          codeSplitting: {
            groups: [
              { test: /vue\/dist|@vue\/runtime/, name: 'vue-runtime' },
              { test: /@vue\/reactivity|@vue\/shared/, name: 'vue-reactivity' },
              { test: /@vue\//, name: 'vue-core' },

              { test: /vue-router/, name: 'vue-router' },
              { test: /pinia/, name: 'pinia' },

              { test: /vue-i18n|@intlify/, name: 'i18n' },

              { test: /@lucide\/vue/, name: 'icons' },

              { test: /gsap/, name: 'gsap' },

              { test: /three/, name: 'three' },
              { test: /lottie-web/, name: 'lottie' },
              { test: /@rive-app/, name: 'rive' },
              { test: /@fingerprintjs/, name: 'fingerprint' },

              { test: /node_modules/, name: 'vendor' },
            ],
          },

          chunkFileNames: 'assets/js/[name]-[hash].js',

          entryFileNames: 'assets/js/[name]-[hash].js',

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

    server: {
      port: 5173,
      host: resolveDevHost(env.VITE_DEV_HOST),
      strictPort: false,

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

      cors: true,

      fs: {
        strict: true,
        allow: ['..'],
        deny: ['.env', '.env.*', '*.pem', '*.key'],
      },

      preTransformRequests: true,

      proxy: sharedProxyConfig,
    },

    preview: {
      port: 4173,
      strictPort: true,
      proxy: disablePreviewProxy ? {} : sharedProxyConfig,
    },

    worker: {
      format: 'es' as const,
      rollupOptions: {
        output: {
          format: 'es' as const,
        },
      },
    },

    json: {
      namedExports: true,

      stringify: true,
    },

    experimental: {
      renderBuiltUrl: (filename: string) => {
        if (filename.includes('critical') || filename.includes('main')) {
          return `./${filename}`
        }
        return `/${filename}`
      },
    },
  }
})
