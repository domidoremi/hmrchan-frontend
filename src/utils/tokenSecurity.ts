/**
 * Token 安全工具模块
 *
 * 提供 access_token 的加密存储和安全验证功能
 * 增强双 Token 机制的前端安全性
 */

import { sha256, encrypt, decrypt, getRandomHex } from './crypto'
import { getDeviceFingerprint } from './fingerprint'

// 存储密钥的 key（基于设备指纹派生）
const STORAGE_KEY_PREFIX = 'auth_secure_'

/**
 * 获取基于设备的加密密钥
 * 使用设备指纹作为密钥的一部分，增加跨设备攻击难度
 */
async function getDeviceBasedKey(): Promise<string> {
  const fingerprint = await getDeviceFingerprint()
  // 组合设备指纹和固定盐值
  const salt = 'momi_token_security_v1'
  return sha256(`${fingerprint}:${salt}`)
}

/**
 * 加密存储 Token
 * 使用设备指纹派生的密钥加密，增加 XSS 攻击后的利用难度
 */
export async function secureStoreToken(token: string): Promise<string> {
  try {
    const key = await getDeviceBasedKey()
    const encrypted = await encrypt(token, key)
    return encrypted
  } catch {
    // 加密失败时返回原始 token（降级处理）
    console.warn('Token encryption failed, using plain storage')
    return token
  }
}

/**
 * 解密读取 Token
 */
export async function secureRetrieveToken(encryptedToken: string): Promise<string> {
  try {
    // 检查是否是加密格式（Base64 编码的加密数据较长）
    if (encryptedToken.length < 50) {
      // 可能是未加密的旧 token
      return encryptedToken
    }
    const key = await getDeviceBasedKey()
    return await decrypt(encryptedToken, key)
  } catch {
    // 解密失败，可能是未加密的旧 token 或设备变更
    return encryptedToken
  }
}

/**
 * 生成 Token 完整性校验值
 * 用于检测 Token 是否被篡改
 */
export async function generateTokenIntegrity(token: string): Promise<string> {
  const fingerprint = await getDeviceFingerprint()
  const timestamp = Math.floor(Date.now() / 1000 / 3600) // 小时级时间戳
  return sha256(`${token}:${fingerprint}:${timestamp}`)
}

/**
 * 验证 Token 完整性
 */
export async function verifyTokenIntegrity(
  token: string,
  storedIntegrity: string
): Promise<boolean> {
  const fingerprint = await getDeviceFingerprint()
  const currentHour = Math.floor(Date.now() / 1000 / 3600)

  // 检查当前小时和上一小时（允许 1 小时的时间窗口）
  for (let i = 0; i <= 1; i++) {
    const timestamp = currentHour - i
    const expectedIntegrity = await sha256(`${token}:${fingerprint}:${timestamp}`)
    if (expectedIntegrity === storedIntegrity) {
      return true
    }
  }
  return false
}

/**
 * Token 绑定信息
 * 用于检测 Token 是否在预期的设备/环境中使用
 */
export interface TokenBinding {
  fingerprint: string
  userAgent: string
  createdAt: number
  nonce: string
}

/**
 * 创建 Token 绑定信息
 */
export async function createTokenBinding(): Promise<TokenBinding> {
  return {
    fingerprint: await getDeviceFingerprint(),
    userAgent: navigator.userAgent,
    createdAt: Date.now(),
    nonce: getRandomHex(16),
  }
}

/**
 * 验证 Token 绑定
 * 检查当前环境是否与 Token 创建时的环境匹配
 */
export async function validateTokenBinding(binding: TokenBinding): Promise<{
  valid: boolean
  reason?: string
}> {
  const currentFingerprint = await getDeviceFingerprint()

  // 检查设备指纹
  if (binding.fingerprint !== currentFingerprint) {
    return { valid: false, reason: 'device_mismatch' }
  }

  // 检查 User-Agent（允许小版本变化）
  const currentUA = navigator.userAgent
  const bindingUABase = binding.userAgent.split('/')[0]
  const currentUABase = currentUA.split('/')[0]
  if (bindingUABase !== currentUABase) {
    return { valid: false, reason: 'browser_mismatch' }
  }

  // 检查创建时间（超过 30 天视为过期）
  const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
  if (Date.now() - binding.createdAt > maxAge) {
    return { valid: false, reason: 'binding_expired' }
  }

  return { valid: true }
}

/**
 * 安全的 Token 存储管理器
 */
export const secureTokenManager = {
  /**
   * 存储 Token（带加密和绑定）
   */
  async store(token: string): Promise<void> {
    const binding = await createTokenBinding()
    const encryptedToken = await secureStoreToken(token)
    const integrity = await generateTokenIntegrity(token)

    const data = {
      token: encryptedToken,
      binding,
      integrity,
    }

    localStorage.setItem(STORAGE_KEY_PREFIX + 'data', JSON.stringify(data))
  },

  /**
   * 读取 Token（带解密和验证）
   */
  async retrieve(): Promise<string | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + 'data')
      if (!stored) return null

      const data = JSON.parse(stored)

      // 验证绑定
      const bindingResult = await validateTokenBinding(data.binding)
      if (!bindingResult.valid) {
        console.warn('Token binding validation failed:', bindingResult.reason)
        // 绑定验证失败，清除存储
        this.clear()
        return null
      }

      // 解密 Token
      const token = await secureRetrieveToken(data.token)

      // 验证完整性
      const integrityValid = await verifyTokenIntegrity(token, data.integrity)
      if (!integrityValid) {
        console.warn('Token integrity check failed')
        // 完整性验证失败，但不一定是攻击（可能是时间窗口问题）
        // 仍然返回 token，让后端做最终验证
      }

      return token
    } catch {
      return null
    }
  },

  /**
   * 清除存储的 Token
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'data')
  },

  /**
   * 检查是否有存储的 Token
   */
  hasToken(): boolean {
    return localStorage.getItem(STORAGE_KEY_PREFIX + 'data') !== null
  },
}

export default secureTokenManager
