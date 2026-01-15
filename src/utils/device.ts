/**
 * 设备信息工具
 *
 * 用于获取设备名称和类型，供登录/注册时传递给后端
 */

import { getDeviceFingerprint } from './fingerprint'

/**
 * 获取浏览器名称和版本
 */
function getBrowserInfo(): { name: string; version: string } {
  const ua = navigator.userAgent
  let name = 'Browser'
  let version = ''

  if (ua.includes('Firefox')) {
    name = 'Firefox'
    const match = ua.match(/Firefox\/(\d+\.\d+)/)
    version = match?.[1] ?? ''
  } else if (ua.includes('Edg')) {
    name = 'Edge'
    const match = ua.match(/Edg\/(\d+\.\d+)/)
    version = match?.[1] ?? ''
  } else if (ua.includes('Chrome')) {
    name = 'Chrome'
    const match = ua.match(/Chrome\/(\d+\.\d+)/)
    version = match?.[1] ?? ''
  } else if (ua.includes('Safari')) {
    name = 'Safari'
    const match = ua.match(/Version\/(\d+\.\d+)/)
    version = match?.[1] ?? ''
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    name = 'Opera'
    const match = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/)
    version = match?.[1] ?? ''
  }

  return { name, version }
}

/**
 * 获取操作系统名称和版本
 */
function getOSInfo(): { name: string; version: string } {
  const ua = navigator.userAgent
  let name = 'Unknown'
  let version = ''

  if (ua.includes('Windows NT')) {
    name = 'Windows'
    const match = ua.match(/Windows NT (\d+\.\d+)/)
    if (match?.[1]) {
      const ntVersion = match[1]
      // 映射 NT 版本到 Windows 版本
      const versionMap: Record<string, string> = {
        '10.0': '10',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': '7',
      }
      version = versionMap[ntVersion] ?? ntVersion
    }
  } else if (ua.includes('Mac OS X')) {
    name = 'macOS'
    const match = ua.match(/Mac OS X (\d+[._]\d+)/)
    version = match?.[1]?.replace('_', '.') ?? ''
  } else if (ua.includes('Linux')) {
    name = 'Linux'
  } else if (ua.includes('Android')) {
    name = 'Android'
    const match = ua.match(/Android (\d+\.\d+)/)
    version = match?.[1] ?? ''
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    name = 'iOS'
    const match = ua.match(/OS (\d+[._]\d+)/)
    version = match?.[1]?.replace('_', '.') ?? ''
  }

  return { name, version }
}

/**
 * 获取设备名称
 * 格式: "Browser on OS" (如 "Chrome on Windows")
 */
export function getDeviceName(): string {
  const browser = getBrowserInfo()
  const os = getOSInfo()
  return `${browser.name} on ${os.name}`
}

/**
 * 获取设备类型
 */
export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent

  // 检测平板
  if (ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile'))) {
    return 'tablet'
  }

  // 检测手机
  if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
    return 'mobile'
  }

  return 'desktop'
}

/**
 * 获取屏幕分辨率
 */
export function getScreenResolution(): string {
  return `${window.screen.width}x${window.screen.height}`
}

/**
 * 获取时区
 */
export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * 获取语言
 */
export function getLanguage(): string {
  return navigator.language
}

/**
 * 获取完整设备信息（不含指纹）
 */
export function getDeviceInfo(): { device_name: string; device_type: string } {
  return {
    device_name: getDeviceName(),
    device_type: getDeviceType(),
  }
}

/**
 * 获取完整设备信息（含指纹和额外信息）
 */
export async function getFullDeviceInfo() {
  const browser = getBrowserInfo()
  const os = getOSInfo()
  const deviceFingerprint = await getDeviceFingerprint()

  return {
    device_fingerprint: deviceFingerprint,
    device_name: getDeviceName(),
    device_type: getDeviceType(),
    device_os: os.version ? `${os.name} ${os.version}` : os.name,
    device_browser: browser.version ? `${browser.name} ${browser.version}` : browser.name,
    screen_resolution: getScreenResolution(),
    timezone: getTimezone(),
    language: getLanguage(),
  }
}
