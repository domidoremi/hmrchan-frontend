/**
 * 加密工具模块
 *
 * 基于 Web Crypto API 提供安全的加密功能
 * 用于敏感数据的本地加密存储和传输
 */

/**
 * 生成随机字节
 */
export function getRandomBytes(length: number): Uint8Array {
  const buffer = new ArrayBuffer(length)
  const array = new Uint8Array(buffer)
  return crypto.getRandomValues(array)
}

/**
 * 生成随机十六进制字符串
 */
export function getRandomHex(length: number): string {
  const bytes = getRandomBytes(Math.ceil(length / 2))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

/**
 * 生成 UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * SHA-256 哈希
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * SHA-512 哈希
 */
export async function sha512(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-512', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * HMAC-SHA256 签名
 */
export async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const dataBuffer = encoder.encode(data)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
  const signatureArray = Array.from(new Uint8Array(signature))
  return signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 派生加密密钥（基于密码）
 * 使用 PBKDF2 算法
 */
async function deriveKey(
  password: string,
  salt: ArrayBuffer,
  iterations: number = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const baseKey = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveKey',
  ])

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * AES-GCM 加密
 * 返回格式: base64(salt + iv + ciphertext + tag)
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  // 生成随机 salt 和 IV
  const salt = getRandomBytes(16)
  const iv = getRandomBytes(12)

  // 派生密钥
  const key = await deriveKey(password, salt.buffer as ArrayBuffer)

  // 加密
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data
  )

  // 组合: salt (16) + iv (12) + ciphertext
  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(ciphertext), salt.length + iv.length)

  // Base64 编码
  return btoa(String.fromCharCode(...result))
}

/**
 * AES-GCM 解密
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  // Base64 解码到 ArrayBuffer
  const binaryString = atob(encryptedData)
  const buffer = new ArrayBuffer(binaryString.length)
  const data = new Uint8Array(buffer)
  for (let i = 0; i < binaryString.length; i++) {
    data[i] = binaryString.charCodeAt(i)
  }

  // 提取 salt, iv, ciphertext（使用 ArrayBuffer 视图）
  const salt = buffer.slice(0, 16)
  const iv = buffer.slice(16, 28)
  const ciphertext = buffer.slice(28)

  // 派生密钥
  const key = await deriveKey(password, salt)

  // 解密
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * 安全比较两个字符串（防止时序攻击）
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * 生成安全的随机密码
 */
export function generateSecurePassword(
  length: number = 16,
  options: {
    uppercase?: boolean
    lowercase?: boolean
    numbers?: boolean
    symbols?: boolean
  } = {}
): string {
  const { uppercase = true, lowercase = true, numbers = true, symbols = true } = options

  let charset = ''
  if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz'
  if (numbers) charset += '0123456789'
  if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!charset) {
    charset = 'abcdefghijklmnopqrstuvwxyz0123456789'
  }

  const randomBytes = getRandomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i]! % charset.length]
  }
  return password
}

/**
 * 对敏感数据进行脱敏处理
 */
export function maskSensitiveData(
  data: string,
  type: 'email' | 'phone' | 'card' | 'custom' = 'custom',
  visibleChars: number = 4
): string {
  if (!data) return ''

  switch (type) {
    case 'email': {
      const [local, domain] = data.split('@')
      if (!domain || !local) return data
      const maskedLocal =
        local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : local
      return `${maskedLocal}@${domain}`
    }
    case 'phone': {
      if (data.length < 7) return data
      return data.slice(0, 3) + '*'.repeat(data.length - 7) + data.slice(-4)
    }
    case 'card': {
      if (data.length < 8) return data
      return data.slice(0, 4) + '*'.repeat(data.length - 8) + data.slice(-4)
    }
    default: {
      if (data.length <= visibleChars * 2) {
        return '*'.repeat(data.length)
      }
      return data.slice(0, visibleChars) + '*'.repeat(data.length - visibleChars * 2) + data.slice(-visibleChars)
    }
  }
}

/**
 * 检查密码强度
 */
export function checkPasswordStrength(password: string): {
  score: number
  level: 'weak' | 'fair' | 'good' | 'strong'
  suggestions: string[]
} {
  let score = 0
  const suggestions: string[] = []

  // 长度检查
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (password.length < 8) suggestions.push('使用至少 8 个字符')

  // 字符类型检查
  if (/[a-z]/.test(password)) score += 1
  else suggestions.push('添加小写字母')

  if (/[A-Z]/.test(password)) score += 1
  else suggestions.push('添加大写字母')

  if (/[0-9]/.test(password)) score += 1
  else suggestions.push('添加数字')

  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else suggestions.push('添加特殊字符')

  // 连续字符检查
  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    suggestions.push('避免连续重复字符')
  }

  // 常见模式检查
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123']
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    score -= 2
    suggestions.push('避免使用常见密码模式')
  }

  // 计算等级
  let level: 'weak' | 'fair' | 'good' | 'strong'
  if (score <= 2) level = 'weak'
  else if (score <= 4) level = 'fair'
  else if (score <= 6) level = 'good'
  else level = 'strong'

  return { score: Math.max(0, Math.min(score, 8)), level, suggestions }
}

export default {
  getRandomBytes,
  getRandomHex,
  generateUUID,
  sha256,
  sha512,
  hmacSha256,
  encrypt,
  decrypt,
  secureCompare,
  generateSecurePassword,
  maskSensitiveData,
  checkPasswordStrength,
}
