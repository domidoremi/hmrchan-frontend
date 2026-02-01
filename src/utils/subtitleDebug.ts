/**
 * 字幕调试工具
 * 用于诊断字幕加载问题
 *
 * @module subtitleDebug
 */

import type { SubtitleTrack, SubtitleDebugInfo, SubtitleTestResult } from '@/types'

/**
 * 检查是否启用调试模式
 */
const isDebugEnabled = (): boolean => {
  return import.meta.env['VITE_ENABLE_DEBUG'] === 'true' || import.meta.env.DEV
}

/**
 * 条件性日志输出 - 仅在调试模式下输出
 */
const debugLog = {
  group: (label: string) => isDebugEnabled() && console.group(label),
  groupEnd: () => isDebugEnabled() && console.groupEnd(),
  log: (...args: unknown[]) => isDebugEnabled() && console.log(...args),
  warn: (...args: unknown[]) => isDebugEnabled() && console.warn(...args),
  error: (...args: unknown[]) => isDebugEnabled() && console.error(...args),
  table: (data: unknown) => isDebugEnabled() && console.table(data),
}

/**
 * 类型守卫：检查对象是否具有字幕轨道的基本属性
 */
function isSubtitleTrackLike(obj: unknown): obj is SubtitleTrack {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'language' in obj &&
    typeof (obj as SubtitleTrack).language === 'string'
  )
}

/**
 * 从字幕轨道对象中提取 URL
 */
function extractSubtitleUrl(track: SubtitleTrack): string | null {
  return (
    track.url || track.subtitle_url || track.file_path || track.subtitle_path || track.path || null
  )
}

/**
 * 调试字幕数据，输出详细信息并返回结构化结果
 *
 * @param subtitles - 字幕数据（可能是数组或其他类型）
 * @returns 字幕调试信息对象
 *
 * @example
 * ```ts
 * const info = debugSubtitles(post.media_files[0].subtitles)
 * if (info.hasSubtitles) {
 *   console.log(`Found ${info.subtitleCount} subtitles`)
 * }
 * ```
 */
export function debugSubtitles(subtitles: unknown): SubtitleDebugInfo {
  debugLog.group('🎬 字幕调试信息')

  if (!subtitles) {
    debugLog.warn('❌ 没有字幕数据')
    debugLog.groupEnd()
    return {
      hasSubtitles: false,
      subtitleCount: 0,
      languages: [],
      formats: [],
      urls: [],
      rawData: null,
    }
  }

  if (!Array.isArray(subtitles)) {
    debugLog.error('❌ 字幕数据格式错误，应该是数组:', subtitles)
    debugLog.groupEnd()
    return {
      hasSubtitles: false,
      subtitleCount: 0,
      languages: [],
      formats: [],
      urls: [],
      rawData: subtitles,
    }
  }

  // 使用类型守卫过滤有效的字幕轨道
  const validTracks = subtitles.filter(isSubtitleTrackLike)

  const languages = validTracks
    .map((track) => track.language)
    .filter((lang): lang is string => Boolean(lang))
  const formats = validTracks
    .map((track) => track.format)
    .filter((fmt): fmt is string => Boolean(fmt))
  const urls = validTracks.map(extractSubtitleUrl).filter((url): url is string => Boolean(url))

  debugLog.log('✅ 字幕数量:', validTracks.length)
  debugLog.log('📝 语言列表:', languages)
  debugLog.log('📄 格式列表:', formats)
  debugLog.log('🔗 URL 列表:', urls)
  debugLog.table(validTracks)
  debugLog.groupEnd()

  return {
    hasSubtitles: validTracks.length > 0,
    subtitleCount: validTracks.length,
    languages,
    formats,
    urls,
    rawData: subtitles,
  }
}

/**
 * 获取 API 基础 URL
 */
function getApiBaseUrl(): string {
  return import.meta.env['VITE_API_ENDPOINT'] || `${import.meta.env['VITE_API_URL'] || '/api'}/v1`
}

/**
 * 构建字幕 URL（用于测试）
 *
 * @param mediaId - 媒体 ID
 * @param language - 可选的语言代码
 * @returns 完整的字幕 API URL
 *
 * @example
 * ```ts
 * const url = buildSubtitleUrl('abc-123', 'zh-Hans')
 * // => 'https://api.example.com/api/v1/media/abc-123/subtitle?language=zh-Hans'
 * ```
 */
export function buildSubtitleUrl(mediaId: string, language?: string): string {
  const apiBaseUrl = getApiBaseUrl()
  const url = language
    ? `${apiBaseUrl}/media/${mediaId}/subtitle?language=${language}`
    : `${apiBaseUrl}/media/${mediaId}/subtitle`

  debugLog.log('🔗 构建字幕 URL:', url)
  return url
}

/**
 * 测试字幕 URL 并返回结构化结果
 *
 * @param mediaId - 媒体 ID
 * @param language - 可选的语言代码
 * @returns Promise 包含测试结果
 *
 * @example
 * ```ts
 * const result = await testSubtitleFetch('abc-123', 'en')
 * if (result.success) {
 *   console.log('Subtitle preview:', result.preview)
 * } else {
 *   console.error('Error:', result.error)
 * }
 * ```
 */
export async function testSubtitleFetch(
  mediaId: string,
  language?: string
): Promise<SubtitleTestResult> {
  const url = buildSubtitleUrl(mediaId, language)

  try {
    debugLog.log('⏳ 正在获取字幕...')
    const response = await fetch(url)

    if (!response.ok) {
      const text = await response.text()
      debugLog.error('❌ 字幕请求失败:', response.status, response.statusText)
      debugLog.error('错误详情:', text)

      return {
        success: false,
        url,
        contentType: response.headers.get('content-type'),
        error: text || response.statusText,
        statusCode: response.status,
      }
    }

    const contentType = response.headers.get('content-type')
    const text = await response.text()
    const preview = text.substring(0, 500)

    debugLog.log('✅ 字幕获取成功')
    debugLog.log('Content-Type:', contentType)
    debugLog.log('字幕内容预览:', preview)

    return {
      success: true,
      url,
      contentType,
      preview,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    debugLog.error('❌ 字幕请求异常:', error)

    return {
      success: false,
      url,
      contentType: null,
      error: errorMessage,
    }
  }
}

/**
 * @deprecated 使用 buildSubtitleUrl 代替
 */
export const testSubtitleUrl = buildSubtitleUrl

/**
 * @deprecated 使用 testSubtitleFetch 代替
 */
export const fetchSubtitleTest = async (mediaId: string, language?: string): Promise<void> => {
  await testSubtitleFetch(mediaId, language)
}
