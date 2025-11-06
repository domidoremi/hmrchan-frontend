/**
 * UUID验证和处理工具
 * 根据UUID-MIGRATION-GUIDE.md文档
 */

import type { UUID } from '@/types'

/**
 * UUID v4 正则表达式
 * 格式: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * 验证UUID格式是否有效
 * @param uuid - 要验证的UUID字符串
 * @returns 是否为有效的UUID v4格式
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_V4_REGEX.test(uuid)
}

/**
 * 类型守卫：验证并断言UUID类型
 * @param value - 要验证的字符串
 * @returns 是否为有效的UUID
 */
export function isUUID(value: string): value is UUID {
  return isValidUUID(value)
}

/**
 * 验证UUID并抛出错误（用于严格验证场景）
 * @param value - 要验证的字符串
 * @returns 验证通过的UUID
 * @throws Error 如果UUID格式无效
 */
export function validateUUID(value: string): UUID {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid UUID format: ${value}`)
  }
  return value as UUID
}

/**
 * 安全验证UUID（不抛出错误）
 * @param value - 要验证的字符串
 * @returns 如果有效返回UUID，否则返回null
 */
export function safeValidateUUID(value: string): UUID | null {
  return isValidUUID(value) ? (value as UUID) : null
}

/**
 * 批量验证UUID数组
 * @param values - UUID字符串数组
 * @returns 所有UUID都有效时返回true
 */
export function validateUUIDs(values: string[]): boolean {
  return values.every(isValidUUID)
}

/**
 * 过滤出有效的UUID
 * @param values - UUID字符串数组
 * @returns 有效的UUID数组
 */
export function filterValidUUIDs(values: string[]): UUID[] {
  return values.filter(isValidUUID) as UUID[]
}
