/**
 * Device Fingerprint Utility
 *
 * 使用 FingerprintJS 生成唯一的设备指纹
 * 提供降级方案以确保在 FingerprintJS 失败时仍能生成标识符
 */

import type { Agent } from '@fingerprintjs/fingerprintjs'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise: Promise<Agent> | null = null
let cachedFingerprint: string | null = null

/**
 * 初始化 FingerprintJS（应用启动时调用一次）
 */
export function initFingerprint() {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load()
  }
  return fpPromise
}

/**
 * 清除缓存的指纹（用于测试或强制重新生成）
 */
export function clearFingerprintCache() {
  cachedFingerprint = null
  fpPromise = null
}

/**
 * 获取设备指纹
 * 优先使用 FingerprintJS，失败时使用降级方案
 * 结果会被缓存以避免重复计算
 */
export async function getDeviceFingerprint(): Promise<string> {
  // 返回缓存的指纹（如果存在）
  if (cachedFingerprint) {
    return cachedFingerprint
  }

  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load()
    }
    const fp = await fpPromise
    const result = await fp.get()
    cachedFingerprint = result.visitorId
    return cachedFingerprint
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('FingerprintJS failed, using fallback:', error)
    }
    // 降级方案：使用基于浏览器特征的指纹
    cachedFingerprint = await getFallbackFingerprint()
    return cachedFingerprint
  }
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
