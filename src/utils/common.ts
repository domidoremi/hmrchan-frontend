/**
 * Common Utilities
 * 公共工具函数 - 消除重复代码
 */

import type { User } from '@/types'
import logger from '@/utils/logger'

/**
 * 认证响应处理器
 * 消除auth.ts中login和register的重复代码
 */
export interface AuthResponse {
  access_token: string
  refresh_token?: string
  csrf_token?: string
  user: User
}

export class AuthHelper {
  /**
   * 处理认证响应（登录/注册通用）
   */
  static handleAuthResponse(response: AuthResponse): void {
    const { access_token, user, csrf_token } = response

    // 保存到localStorage
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(user))

    if (csrf_token) {
      localStorage.setItem('csrf_token', csrf_token)
    }

    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token)
    }
  }

  /**
   * 清除认证信息
   */
  static clearAuthData(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('csrf_token')
    localStorage.removeItem('user')
  }

  /**
   * 获取存储的用户信息
   */
  static getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null

    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  }

  /**
   * 获取存储的Token
   */
  static getStoredToken(): string | null {
    return localStorage.getItem('access_token')
  }

  /**
   * 获取CSRF Token
   */
  static getCSRFToken(): string | null {
    return localStorage.getItem('csrf_token')
  }
}

/**
 * 验证辅助工具
 */
export class ValidationHelper {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return pattern.test(email)
  }

  /**
   * 验证密码强度
   */
  static validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' }
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one digit' }
    }

    return { valid: true }
  }

  /**
   * 验证用户名
   */
  static validateUsername(username: string): { valid: boolean; message?: string } {
    if (username.length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters' }
    }

    if (username.length > 30) {
      return { valid: false, message: 'Username must be less than 30 characters' }
    }

    if (!/^[a-zA-Z]/.test(username)) {
      return { valid: false, message: 'Username must start with a letter' }
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, message: 'Username can only contain letters, numbers, _ and -' }
    }

    return { valid: true }
  }
}

/**
 * 格式化辅助工具
 */
export class FormatHelper {
  /**
   * 格式化数字（添加千分位）
   */
  static formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num)
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * 格式化时长（秒 -> HH:MM:SS）
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 格式化相对时间（如"2小时前"）
   */
  static formatRelativeTime(date: Date | string): string {
    const now = new Date()
    const target = typeof date === 'string' ? new Date(date) : date
    const diffMs = now.getTime() - target.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    if (diffHour < 24) return `${diffHour}小时前`
    if (diffDay < 7) return `${diffDay}天前`
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`
    if (diffDay < 365) return `${Math.floor(diffDay / 30)}个月前`
    return `${Math.floor(diffDay / 365)}年前`
  }

  /**
   * 截断文本
   */
  static truncate(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - suffix.length) + suffix
  }
}

/**
 * URL辅助工具
 */
export class URLHelper {
  /**
   * 构建查询字符串
   */
  static buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  /**
   * 解析查询字符串
   */
  static parseQueryString(search: string): Record<string, string> {
    const params = new URLSearchParams(search)
    const result: Record<string, string> = {}

    params.forEach((value, key) => {
      result[key] = value
    })

    return result
  }

  /**
   * 更新URL参数
   */
  static updateURLParams(params: Record<string, unknown>): void {
    const url = new URL(window.location.href)

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, String(value))
      }
    })

    window.history.pushState({}, '', url.toString())
  }
}

/**
 * 存储辅助工具
 */
export class StorageHelper {
  /**
   * 安全地获取localStorage
   */
  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  }

  /**
   * 安全地设置localStorage
   */
  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      logger.error('Failed to save to localStorage', { key, error })
    }
  }

  /**
   * 移除项
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      logger.error('Failed to remove from localStorage', { key, error })
    }
  }

  /**
   * 清空所有
   */
  static clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      logger.error('Failed to clear localStorage', { error })
    }
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as unknown as T

  const clonedObj = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key])
    }
  }
  return clonedObj
}
