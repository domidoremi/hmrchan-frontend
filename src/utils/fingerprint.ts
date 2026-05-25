/**
 * Device Fingerprint Utility
 *
 * 使用 FingerprintJS 生成唯一的设备指纹
 * 提供降级方案以确保在 FingerprintJS 失败时仍能生成标识符
 */

type FpAgent = { get: () => Promise<{ visitorId: string }> }

let fpPromise: Promise<FpAgent> | null = null
const FP_STORAGE_KEY = 'momi_device_fingerprint_v1'
const FP_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FINGERPRINTJS_OSS_COMPONENTS_VERSION = 'fingerprintjs-oss@5.2.0'
const FALLBACK_COMPONENTS_VERSION = 'hmr-browser-fallback-v1'
const ENABLE_ADVANCED_FINGERPRINT = import.meta.env.VITE_ENABLE_ADVANCED_FINGERPRINT === 'true'

export type BrowserFingerprintSource = 'oss_browser'

export interface DeviceFingerprintMetadata {
  value: string
  source: BrowserFingerprintSource
  componentsVersion: string
  generatedAt: number
}

interface PersistedFingerprint {
  value: string
  cachedAt: number
  userAgent: string
  language: string
  platform: string
  source?: BrowserFingerprintSource
  componentsVersion?: string
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function isValidFingerprint(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{8,128}$/i.test(value)
}

function normalizeComponentsVersion(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : FALLBACK_COMPONENTS_VERSION
}

function readPersistedFingerprint(): DeviceFingerprintMetadata | null {
  if (!isBrowserRuntime()) return null

  try {
    const raw = localStorage.getItem(FP_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedFingerprint
    if (!isValidFingerprint(parsed.value)) return null
    if (typeof parsed.cachedAt !== 'number' || Date.now() - parsed.cachedAt > FP_CACHE_TTL_MS) {
      return null
    }

    const sameRuntimeEnv =
      parsed.userAgent === navigator.userAgent &&
      parsed.language === navigator.language &&
      parsed.platform === navigator.platform

    return sameRuntimeEnv
      ? {
          value: parsed.value,
          source: 'oss_browser',
          componentsVersion: normalizeComponentsVersion(parsed.componentsVersion),
          generatedAt: parsed.cachedAt,
        }
      : null
  } catch {
    return null
  }
}

function persistFingerprint(metadata: DeviceFingerprintMetadata): void {
  if (!isBrowserRuntime() || !isValidFingerprint(metadata.value)) return

  const payload: PersistedFingerprint = {
    value: metadata.value,
    cachedAt: metadata.generatedAt,
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    source: metadata.source,
    componentsVersion: metadata.componentsVersion,
  }

  try {
    localStorage.setItem(FP_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

let cachedFingerprint: DeviceFingerprintMetadata | null = readPersistedFingerprint()

/**
 * 懒加载 FingerprintJS（避免阻塞首屏）
 */
async function loadFingerprintJS(): Promise<FpAgent> {
  const mod = await import('@fingerprintjs/fingerprintjs')
  return mod.default.load()
}

/**
 * 初始化 FingerprintJS（应用启动时调用一次）
 */
export function initFingerprint(): Promise<FpAgent | null> {
  // 已有持久缓存时无需预热第三方库
  if (cachedFingerprint) {
    return Promise.resolve(null)
  }
  // 默认走轻量本地指纹，避免第三方库抢占首屏主线程
  if (!ENABLE_ADVANCED_FINGERPRINT) {
    return Promise.resolve(null)
  }

  if (!fpPromise) {
    fpPromise = loadFingerprintJS()
  }
  return fpPromise
}

/**
 * 清除缓存的指纹（用于测试或强制重新生成）
 */
export function clearFingerprintCache() {
  cachedFingerprint = null
  fpPromise = null

  if (!isBrowserRuntime()) return

  try {
    localStorage.removeItem(FP_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * 获取设备指纹及生成版本元数据。
 * 优先使用 FingerprintJS，失败时使用降级方案
 * 结果会被缓存以避免重复计算
 */
export async function getDeviceFingerprintMetadata(): Promise<DeviceFingerprintMetadata> {
  // 返回缓存的指纹（如果存在）
  if (cachedFingerprint) {
    return cachedFingerprint
  }

  // 默认：直接使用轻量降级指纹，避免加载第三方指纹库造成长任务。
  if (!ENABLE_ADVANCED_FINGERPRINT) {
    cachedFingerprint = {
      value: await getFallbackFingerprint(),
      source: 'oss_browser',
      componentsVersion: FALLBACK_COMPONENTS_VERSION,
      generatedAt: Date.now(),
    }
    persistFingerprint(cachedFingerprint)
    return cachedFingerprint
  }

  try {
    if (!fpPromise) {
      fpPromise = loadFingerprintJS()
    }
    const fp = await fpPromise
    const result = await fp.get()
    cachedFingerprint = {
      value: result.visitorId,
      source: 'oss_browser',
      componentsVersion: FINGERPRINTJS_OSS_COMPONENTS_VERSION,
      generatedAt: Date.now(),
    }
    persistFingerprint(cachedFingerprint)
    return cachedFingerprint
  } catch (error) {
    fpPromise = null

    if (import.meta.env.DEV) {
      console.warn('FingerprintJS failed, using fallback:', error)
    }
    // 降级方案：使用基于浏览器特征的指纹
    cachedFingerprint = {
      value: await getFallbackFingerprint(),
      source: 'oss_browser',
      componentsVersion: FALLBACK_COMPONENTS_VERSION,
      generatedAt: Date.now(),
    }
    persistFingerprint(cachedFingerprint)
    return cachedFingerprint
  }
}

/**
 * 获取设备指纹
 */
export async function getDeviceFingerprint(): Promise<string> {
  return (await getDeviceFingerprintMetadata()).value
}

/**
 * 降级方案：生成简单的浏览器指纹
 * 使用 SubtleCrypto API 生成更安全的哈希值
 */
async function getFallbackFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
    navigator.maxTouchPoints?.toString() || '',
  ]

  const fingerprint = components.join('|')

  // 使用 SubtleCrypto API 生成 SHA-256 哈希
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(fingerprint)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)
  } catch {
    // 降级到简单的字符串哈希（仅在 SubtleCrypto 不可用时）
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
}
