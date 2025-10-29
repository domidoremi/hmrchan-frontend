/**
 * XSS防护工具
 * Cross-Site Scripting Protection
 */

export class XSSProtection {
  // 危险的HTML标签
  private static readonly DANGEROUS_TAGS = [
    'script',
    'iframe',
    'embed',
    'object',
    'applet',
    'meta',
    'link',
    'style',
    'base',
    'form',
  ]

  // 危险的属性
  private static readonly DANGEROUS_ATTRS = [
    'onclick',
    'onload',
    'onerror',
    'onmouseover',
    'onmouseout',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'onkeydown',
    'onkeyup',
    'onkeypress',
    'ondblclick',
    'oncontextmenu',
  ]

  // 危险的URL scheme
  private static readonly DANGEROUS_SCHEMES = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ]

  /**
   * 转义HTML特殊字符
   */
  static escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * 反转义HTML
   */
  static unescapeHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || ''
  }

  /**
   * 清理HTML内容
   * @param html - 输入HTML
   * @param allowBasicTags - 是否允许基本标签（b, i, a, p等）
   */
  static sanitizeHtml(html: string, allowBasicTags = false): string {
    if (!html) return ''

    if (!allowBasicTags) {
      // 完全转义
      return this.escapeHtml(html)
    }

    // 允许基本标签但移除危险内容
    let cleaned = html

    // 1. 移除危险标签
    this.DANGEROUS_TAGS.forEach((tag) => {
      // 移除开始和结束标签
      const regex1 = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi')
      cleaned = cleaned.replace(regex1, '')
      // 移除自闭合标签
      const regex2 = new RegExp(`<${tag}[^>]*/>`, 'gi')
      cleaned = cleaned.replace(regex2, '')
    })

    // 2. 移除危险属性
    this.DANGEROUS_ATTRS.forEach((attr) => {
      const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi')
      cleaned = cleaned.replace(regex, '')
    })

    // 3. 清理危险URL scheme
    this.DANGEROUS_SCHEMES.forEach((scheme) => {
      const regex = new RegExp(`(href|src)\\s*=\\s*["']?${scheme}`, 'gi')
      cleaned = cleaned.replace(regex, '$1="#"')
    })

    return cleaned
  }

  /**
   * 清理URL
   */
  static sanitizeUrl(url: string): string {
    if (!url) return ''

    const urlLower = url.toLowerCase().trim()

    // 检查危险scheme
    for (const scheme of this.DANGEROUS_SCHEMES) {
      if (urlLower.startsWith(scheme)) {
        return '#'
      }
    }

    // 允许的scheme
    const allowedSchemes = ['http://', 'https://', 'mailto:', '//', '/']
    const isValid = allowedSchemes.some((scheme) => urlLower.startsWith(scheme))

    if (!isValid && !url.startsWith('/')) {
      // 相对路径，添加 /
      return `/${url}`
    }

    return url
  }

  /**
   * 清理用户输入（用于表单提交）
   */
  static sanitizeInput(input: string, maxLength = 1000): string {
    if (!input) return ''

    // 长度限制
    let cleaned = input.substring(0, maxLength)

    // 移除控制字符
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '')

    // 转义HTML
    cleaned = this.escapeHtml(cleaned)

    return cleaned.trim()
  }

  /**
   * 验证对象是否安全（递归检查）
   */
  static isSafeObject(obj: unknown): boolean {
    if (typeof obj === 'string') {
      const objLower = obj.toLowerCase()
      return (
        !this.DANGEROUS_TAGS.some((tag) => objLower.includes(`<${tag}`)) &&
        !objLower.includes('javascript:') &&
        !this.DANGEROUS_ATTRS.some((attr) => objLower.includes(`${attr}=`))
      )
    }

    if (Array.isArray(obj)) {
      return obj.every((item) => this.isSafeObject(item))
    }

    if (obj && typeof obj === 'object') {
      return Object.values(obj).every((value) => this.isSafeObject(value))
    }

    return true
  }

  /**
   * 清理对象中的所有字符串（递归）
   */
  static sanitizeObject<T>(obj: T, allowHtml = false): T {
    if (typeof obj === 'string') {
      return (allowHtml ? this.sanitizeHtml(obj, true) : this.sanitizeInput(obj)) as T
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, allowHtml)) as T
    }

    if (obj && typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = this.sanitizeObject(value, allowHtml)
      }
      return cleaned as T
    }

    return obj
  }
}

/**
 * Vue指令：v-safe-html
 * 用法：<div v-safe-html="userContent"></div>
 */
export const vSafeHtml = {
  mounted(el: HTMLElement, binding: { value: string }) {
    el.innerHTML = XSSProtection.sanitizeHtml(binding.value, true)
  },
  updated(el: HTMLElement, binding: { value: string }) {
    el.innerHTML = XSSProtection.sanitizeHtml(binding.value, true)
  },
}

/**
 * 便捷函数
 */
export const {
  escapeHtml,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeInput,
  isSafeObject,
  sanitizeObject,
} = XSSProtection
