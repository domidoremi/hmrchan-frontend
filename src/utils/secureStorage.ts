/**
 * 安全存储工具
 * 提供统一的 AES-GCM 加密、错误处理和竞态条件防护
 *
 * 使用 Web Crypto API 实现强加密：
 * - 算法：AES-GCM（256位密钥）
 * - 每次加密生成随机 IV（12字节）
 * - 支持 TTL 过期机制
 */

import { logger } from '@/utils/logger'

const STORAGE_KEY_PREFIX = '__hmrc_'
const ENCRYPTION_KEY_ENV = import.meta.env.VITE_ENCRYPTION_KEY || 'hmrchan_secure_key_v1_default'

// 缓存派生的加密密钥
let cachedCryptoKey: CryptoKey | null = null

/**
 * 从密码派生 AES-256 密钥
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  // 使用固定盐值（生产环境可以使用环境变量）
  const salt = encoder.encode('hmrchan_salt_v1')

  cachedCryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  return cachedCryptoKey
}

/**
 * AES-GCM 加密
 */
async function aesEncrypt(text: string): Promise<string> {
  try {
    const key = await deriveKey(ENCRYPTION_KEY_ENV)
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    // 生成随机 IV（12字节是 AES-GCM 推荐长度）
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

    // 将 IV 和加密数据合并，然后 Base64 编码
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)

    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    logger.error('[SecureStorage] AES encryption failed', { error })
    // 降级到简单编码
    return btoa(encodeURIComponent(text))
  }
}

/**
 * AES-GCM 解密
 */
async function aesDecrypt(encrypted: string): Promise<string> {
  try {
    const key = await deriveKey(ENCRYPTION_KEY_ENV)

    // Base64 解码
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))

    // 分离 IV 和加密数据
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    // 尝试降级解密（兼容旧数据）
    try {
      return decodeURIComponent(atob(encrypted))
    } catch {
      logger.error('[SecureStorage] AES decryption failed', { error })
      return encrypted
    }
  }
}

/**
 * 安全的存储接口
 */
export interface SecureStorageOptions {
  encrypt?: boolean // 是否加密
  ttl?: number // 过期时间（毫秒）
  silent?: boolean // 是否静默失败
}

interface StorageItem<T> {
  value: T
  timestamp: number
  ttl?: number
}

/**
 * 操作锁，防止竞态条件
 */
const operationLocks = new Map<string, Promise<unknown>>()

async function withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const existingLock = operationLocks.get(key)
  if (existingLock) {
    await existingLock
  }

  const promise = operation()
  operationLocks.set(key, promise)

  try {
    return await promise
  } finally {
    operationLocks.delete(key)
  }
}

/**
 * 安全存储类
 */
class SecureStorage {
  private storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
  }

  /**
   * 检查存储是否可用
   */
  private isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      this.storage.setItem(test, test)
      this.storage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * 生成完整的存储键
   */
  private getFullKey(key: string): string {
    return `${STORAGE_KEY_PREFIX}${key}`
  }

  /**
   * 设置数据
   */
  async set<T>(key: string, value: T, options: SecureStorageOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      if (!options.silent) {
        logger.error('[SecureStorage] Storage is not available')
      }
      return false
    }

    return withLock(key, async () => {
      try {
        const item: StorageItem<T> = {
          value,
          timestamp: Date.now(),
          ttl: options.ttl,
        }

        let data = JSON.stringify(item)

        if (options.encrypt) {
          data = await aesEncrypt(data)
        }

        this.storage.setItem(this.getFullKey(key), data)
        return true
      } catch (error) {
        if (!options.silent) {
          logger.error('[SecureStorage] Failed to set item', { error })
        }
        return false
      }
    })
  }

  /**
   * 获取数据
   */
  async get<T>(key: string, options: SecureStorageOptions = {}): Promise<T | null> {
    if (!this.isAvailable()) {
      return null
    }

    return withLock(key, async () => {
      try {
        const rawData = this.storage.getItem(this.getFullKey(key))
        if (!rawData) return null

        let data: string = rawData
        if (options.encrypt) {
          data = await aesDecrypt(rawData)
        }

        const item = JSON.parse(data) as StorageItem<T>

        // 检查是否过期
        if (item.ttl && Date.now() - item.timestamp > item.ttl) {
          await this.remove(key)
          return null
        }

        return item.value
      } catch (error) {
        if (!options.silent) {
          logger.error('[SecureStorage] Failed to get item', { error })
        }
        // 数据损坏，删除它
        await this.remove(key, { silent: true })
        return null
      }
    })
  }

  /**
   * 删除数据
   */
  async remove(key: string, options: SecureStorageOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    return withLock(key, async () => {
      try {
        this.storage.removeItem(this.getFullKey(key))
        return true
      } catch (error) {
        if (!options.silent) {
          logger.error('[SecureStorage] Failed to remove item', { error })
        }
        return false
      }
    })
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      const keys = Object.keys(this.storage).filter((key) => key.startsWith(STORAGE_KEY_PREFIX))

      for (const key of keys) {
        this.storage.removeItem(key)
      }

      return true
    } catch (error) {
      logger.error('[SecureStorage] Failed to clear storage', { error })
      return false
    }
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    if (!this.isAvailable()) {
      return []
    }

    try {
      return Object.keys(this.storage)
        .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
        .map((key) => key.replace(STORAGE_KEY_PREFIX, ''))
    } catch {
      return []
    }
  }
}

// 导出实例
export const secureLocalStorage = new SecureStorage(
  typeof window !== 'undefined' ? localStorage : ({} as Storage),
)

export const secureSessionStorage = new SecureStorage(
  typeof window !== 'undefined' ? sessionStorage : ({} as Storage),
)

/**
 * 数据脱敏工具
 */
export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
  ]

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
