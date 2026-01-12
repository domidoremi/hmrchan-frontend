/**
 * 设备信息工具
 *
 * 用于获取设备名称和类型，供登录/注册时传递给后端
 */

/**
 * 获取浏览器名称
 */
function getBrowserName(): string {
  const ua = navigator.userAgent

  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'

  return 'Browser'
}

/**
 * 获取操作系统名称
 */
function getOSName(): string {
  const ua = navigator.userAgent

  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'

  return 'Unknown'
}

/**
 * 获取设备名称
 * 格式: "Browser on OS" (如 "Chrome on Windows")
 */
export function getDeviceName(): string {
  return `${getBrowserName()} on ${getOSName()}`
}

/**
 * 获取设备类型
 */
export function getDeviceType(): 'browser' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent

  // 检测平板
  if (ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile'))) {
    return 'tablet'
  }

  // 检测手机
  if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
    return 'mobile'
  }

  return 'browser'
}

/**
 * 获取完整设备信息
 */
export function getDeviceInfo(): { device_name: string; device_type: string } {
  return {
    device_name: getDeviceName(),
    device_type: getDeviceType(),
  }
}
