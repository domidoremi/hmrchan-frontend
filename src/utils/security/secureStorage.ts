/**
 * 安全存储工具
 * 提供统一的加密、错误处理和竞态条件防护
 */

import logger from '@/utils/logger'

// 简单的加密/解密（生产环境应使用更强的加密）
const STORAGE_KEY_PREFIX = '__hmrc_'
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'hmrchan_secure_key_v1'

/**
 * 简单的XOR加密（仅用于混淆，不是强加密）
 * 生产环境建议使用 Web Crypto API
 */
function simpleEncrypt(text: string): string {
  try {
    const encoded = btoa(encodeURIComponent(text))
    return encoded
      .split('')
      .map((char, i) => {
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
      })
      .join('')
  } catch {
    return text // 加密失败，返回原文
  }
}

function simpleDecrypt(encrypted: string): string {
  try {
    const decrypted = encrypted
      .split('')
      .map((char, i) => {
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
      })
      .join('')
    return decodeURIComponent(atob(decrypted))
  } catch {
    return encrypted // 解密失败，返回原文
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
          data = simpleEncrypt(data)
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
        let data = this.storage.getItem(this.getFullKey(key))
        if (!data) return null

        if (options.encrypt) {
          data = simpleDecrypt(data)
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
